// POST /functions/v1/r2-firmar — fotos del catálogo a R2 (ARQUITECTURA §2.4, §6.2).
// Dueña o ayudante con MFA. El nombre del archivo lo genera el servidor.
//
//   { accion: "firmar", anchos: [480, 960, 1600] }
//      → { id, subidas: [{ ancho, clave, url (PUT firmado 60 s, Content-Type image/webp) }] }
//   { accion: "verificar", id }
//      → revisa tamaño (≤ 2 MB) y que sean WebP reales; lo que no cumpla se BORRA.
//        OK → { url } (la del ancho 960, la que se guarda en imagenes)
//
// Sin R2 configurado (pospuesto) responde 503 r2_sin_configurar.

import { clienteServicio, exigirPanel } from '../_shared/auth.ts';
import { encabezadosCors, manejarCors } from '../_shared/cors.ts';
import { ErrorHttp, json, respuestaDeError } from '../_shared/http.ts';
import { exigirLimite } from '../_shared/limite.ts';
import { leerJson, z } from '../_shared/validar.ts';
import { clienteR2, configR2, esWebp } from '../_shared/r2.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

const ANCHOS = [480, 960, 1600] as const;
const MAX_BYTES = 2 * 1024 * 1024;
const Cuerpo = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('firmar') }),
  z.object({ accion: z.literal('verificar'), id: z.string().uuid() }),
]);
const clave = (id: string, ancho: number) => `catalogo/${id}-${ancho}.webp`;

export async function manejar(
  req: Request,
  admin: SupabaseClient = clienteServicio(),
  r2 = (() => { const c = configR2(); return c ? clienteR2(c) : null; })(),
): Promise<Response> {
  const cors = manejarCors(req); if (cors) return cors;
  const enc = encabezadosCors(req);
  try {
    if (req.method !== 'POST') throw new ErrorHttp(405, 'metodo_no_permitido');
    const usuario = await exigirPanel(req, ['duena', 'ayudante'], admin);
    if (!r2) throw new ErrorHttp(503, 'r2_sin_configurar', 'La subida de fotos se activa cuando exista el bucket de R2. Mientras, usa el importador.');
    await exigirLimite(admin, `usuario:${usuario.id}:r2-firmar`, 60, 40);
    const cuerpo = await leerJson(req, Cuerpo);

    if (cuerpo.accion === 'firmar') {
      const id = crypto.randomUUID();
      const subidas = await Promise.all(ANCHOS.map(async (ancho) => ({ ancho, clave: clave(id, ancho), url: await r2.firmarPut(clave(id, ancho), 'image/webp', 60) })));
      return json({ id, subidas }, 200, enc);
    }

    const problemas: string[] = [];
    for (const ancho of ANCHOS) {
      const k = clave(cuerpo.id, ancho);
      const o = await r2.inspeccionar(k);
      if (!o) { problemas.push(`${ancho}: no se subió`); continue; }
      if (o.bytes > MAX_BYTES) problemas.push(`${ancho}: pesa más de 2 MB`);
      else if (!esWebp(o.inicio)) problemas.push(`${ancho}: no es una imagen WebP`);
    }
    if (problemas.length) {
      await Promise.all(ANCHOS.map((a) => r2.borrar(clave(cuerpo.id, a))));
      return json({ error: 'archivo_rechazado', mensaje: 'La foto no pasó la revisión y se borró.', problemas }, 400, enc);
    }
    return json({ url: r2.urlPublica(clave(cuerpo.id, 960)) }, 200, enc);
  } catch (e) {
    return respuestaDeError(e, enc);
  }
}
