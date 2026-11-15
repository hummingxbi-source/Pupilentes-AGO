// POST /functions/v1/webhook-envia?s=<ENVIA_WEBHOOK_SECRET> — avisos de rastreo de Envia.com
// (ARQUITECTURA §5, Fase 4; §6.1 regla 6). verify_jwt = false.
// Envia no documenta firma en sus webhooks [16]; por eso:
//   1. Secreto largo en la URL (comparado en tiempo constante) → 401 si no coincide.
//   2. Idempotencia por X-Webhook-Id (lo recomienda Envia) o, si falta, por guía + estado.
//   3. El aviso NO se cree: se consulta el estado de la guía a la API de Envia y eso se registra.
// Envia pide responder 2xx en menos de 5 s [16]: la consulta tiene 4 s de tope.

import { clienteServicio } from '../_shared/auth.ts';
import { categoriaEstado, clienteEnvia, configEnvia } from '../_shared/envia.ts';
import { ErrorHttp, igualesSeguro, json, respuestaDeError } from '../_shared/http.ts';
import { leerJson, z } from '../_shared/validar.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

const Aviso = z.object({
  trackingNumber: z.union([z.string(), z.number()]).optional(),
  tracking_number: z.union([z.string(), z.number()]).optional(),
  status: z.string().max(120).optional(),
  shipment_status: z.string().max(120).optional(),
}).passthrough();

export interface Dependencias {
  admin: SupabaseClient;
  envia: ReturnType<typeof clienteEnvia> | null;
  secreto: string | undefined;
}
function dependencias(): Dependencias {
  const c = configEnvia();
  return { admin: clienteServicio(), envia: c ? clienteEnvia(c) : null, secreto: Deno.env.get('ENVIA_WEBHOOK_SECRET') };
}

export async function manejar(req: Request, d: Dependencias = dependencias()): Promise<Response> {
  try {
    if (req.method !== 'POST') throw new ErrorHttp(405, 'metodo_no_permitido');
    if (!d.secreto || d.secreto.length < 24 || !d.envia) throw new ErrorHttp(503, 'envia_sin_configurar');
    const recibido = new URL(req.url).searchParams.get('s') ?? '';
    if (!igualesSeguro(recibido, d.secreto)) throw new ErrorHttp(401, 'secreto_invalido');

    const aviso = await leerJson(req, Aviso, 32_768);
    const guia = String(aviso.trackingNumber ?? aviso.tracking_number ?? '').trim();
    if (!/^[A-Za-z0-9-]{4,80}$/.test(guia)) throw new ErrorHttp(400, 'guia_invalida');
    const idAviso = req.headers.get('x-webhook-id');
    const idEvento = (idAviso ? `envia:${idAviso}` : `guia:${guia}:${aviso.status ?? aviso.shipment_status ?? ''}`).slice(0, 200);

    const { data: nuevo, error: e1 } = await d.admin.rpc('registrar_evento', { p_proveedor: 'envia', p_id_evento: idEvento, p_payload: aviso });
    if (e1) throw new Error('registrar_evento: ' + e1.message);
    if (nuevo === false) return json({ ok: true, repetido: true });

    try {
      const real = await d.envia.rastrear(guia);
      if (!real) throw new Error('Envia no devolvió el estado de la guía');
      const { data, error } = await d.admin.rpc('registrar_rastreo_envio', { p_guia: guia, p_categoria: categoriaEstado(real.estado), p_estado_original: real.estado });
      if (error) throw new Error('registrar_rastreo_envio: ' + error.message);
      await d.admin.rpc('marcar_evento', { p_proveedor: 'envia', p_id_evento: idEvento, p_error: null });
      return json({ ok: true, ...(data as Record<string, unknown>) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await d.admin.rpc('marcar_evento', { p_proveedor: 'envia', p_id_evento: idEvento, p_error: msg });
      throw e;
    }
  } catch (e) {
    return respuestaDeError(e);
  }
}
