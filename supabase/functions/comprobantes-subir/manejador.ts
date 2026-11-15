// POST /functions/v1/comprobantes-subir — la clienta avisa que ya transfirió (ARQUITECTURA §3.3 A2).
// Autoriza el token de rastreo del pedido (solo lo tiene quien hizo la compra).
//   { token, modo: "whatsapp" }                         → "te lo mando por WhatsApp"
//   { token, modo: "firmar", tipo: "image/jpeg"|… }      → URL de subida directa a R2 (privado, 60 s)
//   { token, modo: "confirmar", id }                     → revisa tamaño (≤ 5 MB) y tipo real; si no
//                                                          cumple, se borra. OK → pedido "pendiente_validacion"
// Sin el bucket de comprobantes (R2 pospuesto) los modos de archivo responden 503 y la tienda ofrece WhatsApp.

import { clienteServicio } from '../_shared/auth.ts';
import { encabezadosCors, manejarCors } from '../_shared/cors.ts';
import { ErrorHttp, errorDeBd, json, respuestaDeError } from '../_shared/http.ts';
import { exigirLimite, ipCliente } from '../_shared/limite.ts';
import { clienteR2, configR2, tipoComprobante } from '../_shared/r2.ts';
import { leerJson, z } from '../_shared/validar.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' } as const;
const Token = z.string().regex(/^[0-9a-f]{64}$/);
const Cuerpo = z.discriminatedUnion('modo', [
  z.object({ modo: z.literal('whatsapp'), token: Token }),
  z.object({ modo: z.literal('firmar'), token: Token, tipo: z.enum(Object.keys(TIPOS) as [keyof typeof TIPOS]) }),
  z.object({ modo: z.literal('confirmar'), token: Token, clave: z.string().regex(/^comprobantes\/[0-9a-f]{12}\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/) }),
]);
const ERRORES: Record<string, [number, string]> = {
  pedido_no_existe: [404, 'No encontramos ese pedido.'],
  pedido_no_pendiente: [409, 'Este pedido ya no espera pago.'],
};

export async function manejar(
  req: Request,
  admin: SupabaseClient = clienteServicio(),
  r2 = (() => { const c = configR2(undefined, 'COMPROBANTES'); return c ? clienteR2(c) : null; })(),
): Promise<Response> {
  const cors = manejarCors(req); if (cors) return cors;
  const enc = encabezadosCors(req);
  try {
    if (req.method !== 'POST') throw new ErrorHttp(405, 'metodo_no_permitido');
    await exigirLimite(admin, `ip:${ipCliente(req)}:comprobantes`, 3600, 30);
    const cuerpo = await leerJson(req, Cuerpo, 4096);
    await exigirLimite(admin, `token:${cuerpo.token.slice(0, 16)}:comprobantes`, 3600, 10);
    // El prefijo de la clave ata el archivo al pedido: no se puede confirmar el archivo de otro.
    const prefijo = `comprobantes/${cuerpo.token.slice(0, 12)}/`;

    if (cuerpo.modo === 'whatsapp') {
      const { data, error } = await admin.rpc('avisar_transferencia', { p_token: cuerpo.token, p_comprobante: null });
      if (error) errorDeBd(error, ERRORES, 'avisar_transferencia');
      return json(data, 200, enc);
    }
    if (!r2) throw new ErrorHttp(503, 'r2_sin_configurar', 'Por ahora manda tu comprobante por WhatsApp.');

    if (cuerpo.modo === 'firmar') {
      const { data: ped } = await admin.rpc('rastrear_por_token', { p_token: cuerpo.token });
      const p = ped as { metodo_pago?: string; estado?: string } | null;
      if (!p || p.metodo_pago !== 'transferencia') throw new ErrorHttp(404, 'pedido_no_existe', ERRORES.pedido_no_existe[1]);
      if (!['pendiente_pago', 'pendiente_validacion'].includes(p.estado ?? '')) throw new ErrorHttp(409, 'pedido_no_pendiente', ERRORES.pedido_no_pendiente[1]);
      const clave = `${prefijo}${crypto.randomUUID()}.${TIPOS[cuerpo.tipo]}`;
      return json({ clave, url: await r2.firmarPut(clave, cuerpo.tipo, 60), max_bytes: MAX_BYTES }, 200, enc);
    }

    if (!cuerpo.clave.startsWith(prefijo)) throw new ErrorHttp(403, 'archivo_ajeno');
    const o = await r2.inspeccionar(cuerpo.clave);
    if (!o) throw new ErrorHttp(400, 'archivo_no_subido', 'No recibimos el archivo. Vuelve a intentarlo.');
    const real = tipoComprobante(o.inicio);
    if (o.bytes > MAX_BYTES || !real || !cuerpo.clave.endsWith('.' + real)) {
      await r2.borrar(cuerpo.clave);
      throw new ErrorHttp(400, 'archivo_rechazado', 'Sube una foto (JPG, PNG o WebP) o un PDF de hasta 5 MB.');
    }
    const { data, error } = await admin.rpc('avisar_transferencia', { p_token: cuerpo.token, p_comprobante: cuerpo.clave });
    if (error) errorDeBd(error, ERRORES, 'avisar_transferencia');
    return json(data, 200, enc);
  } catch (e) {
    return respuestaDeError(e, enc);
  }
}
