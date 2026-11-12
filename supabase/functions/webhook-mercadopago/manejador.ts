// POST /functions/v1/webhook-mercadopago — avisos de pago de Mercado Pago (ARQUITECTURA §3.3 A, §6.1 regla 6).
// verify_jwt = false (lo llama MP, no una sesión). Seguridad:
//   1. Firma x-signature (HMAC con la clave secreta del webhook) → 401 si no coincide.
//   2. Idempotencia por id de aviso en privado.eventos_webhook.
//   3. El aviso NO se cree: se consulta el pago a la API de MP y eso es lo que se registra.
// Se procesa dentro de la petición (MP espera hasta 22 s [23]); si algo falla se responde 500
// y MP reintenta; el evento queda sin procesar y el reintento lo vuelve a tomar.

import { clienteServicio } from '../_shared/auth.ts';
import { ErrorHttp, json, respuestaDeError } from '../_shared/http.ts';
import { clienteMP, configMP, resumenPago, verificarFirma, type ConfigMP } from '../_shared/mercadopago.ts';
import { leerJson, z } from '../_shared/validar.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

const Aviso = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  type: z.string().max(40).optional(),
  action: z.string().max(60).optional(),
  data: z.object({ id: z.union([z.string(), z.number()]) }).partial().optional(),
}).passthrough();

export async function manejar(
  req: Request,
  admin: SupabaseClient = clienteServicio(),
  config: ConfigMP | null = configMP(),
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  try {
    if (req.method !== 'POST') throw new ErrorHttp(405, 'metodo_no_permitido');
    if (!config) throw new ErrorHttp(503, 'mp_sin_configurar');
    const url = new URL(req.url);
    const aviso = await leerJson(req, Aviso, 32_768);
    const tipo = aviso.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic');
    // MP firma con el data.id de la URL; si no viene ahí, el del cuerpo [23].
    const dataId = url.searchParams.get('data.id') ?? (aviso.data?.id != null ? String(aviso.data.id) : null);

    if (!(await verificarFirma(req, config.secretoWebhook, dataId))) throw new ErrorHttp(401, 'firma_invalida');
    if (tipo !== 'payment' || !dataId) return json({ ok: true, ignorado: tipo ?? 'sin_tipo' });   // merchant_order, etc.
    if (!/^\d{1,30}$/.test(dataId)) throw new ErrorHttp(400, 'id_invalido');

    const idEvento = `${aviso.id ?? 'sin-id'}:${dataId}:${req.headers.get('x-request-id') ?? ''}`.slice(0, 200);
    const { data: nuevo, error: e1 } = await admin.rpc('registrar_evento', { p_proveedor: 'mercadopago', p_id_evento: idEvento, p_payload: aviso });
    if (e1) throw new Error('registrar_evento: ' + e1.message);
    if (nuevo === false) return json({ ok: true, repetido: true });

    try {
      const pago = await clienteMP(config, fetchFn).consultarPago(dataId);
      const { data, error } = await admin.rpc('registrar_pago_mp', { p_pago: resumenPago(pago) });
      if (error) throw new Error('registrar_pago_mp: ' + error.message);
      await admin.rpc('marcar_evento', { p_proveedor: 'mercadopago', p_id_evento: idEvento, p_error: null });
      return json({ ok: true, ...(data as Record<string, unknown>) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin.rpc('marcar_evento', { p_proveedor: 'mercadopago', p_id_evento: idEvento, p_error: msg });
      throw e;   // 500 → MP reintenta
    }
  } catch (e) {
    return respuestaDeError(e);
  }
}
