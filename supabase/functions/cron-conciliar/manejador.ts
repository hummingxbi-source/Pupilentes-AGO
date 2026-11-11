// POST /functions/v1/cron-conciliar — la invoca Supabase Cron cada 10 min (ARQUITECTURA §3.3 D).
// Fase 0: solo autentica, limpia ventanas viejas de límites y deja un latido.
// Fases 3, 5 y 6 agregan: liberar reservas vencidas, procesar cola_sync, missed_feeds de ML,
// órdenes de TikTok sin webhook, comparar stock publicado y borrar payloads viejos.

import { clienteServicio, exigirSecretoCron } from '../_shared/auth.ts';
import { json, respuestaDeError } from '../_shared/http.ts';

export async function manejar(req: Request, admin = clienteServicio()): Promise<Response> {
  try {
    if (req.method !== 'POST') return json({ error: 'metodo_no_permitido' }, 405, { Allow: 'POST' });
    exigirSecretoCron(req);

    const inicio = Date.now();
    const { data: limpiadas, error: e1 } = await admin.rpc('limpiar_limites_tasa');
    if (e1) throw new Error('limpiar_limites_tasa: ' + e1.message);

    const detalle = { limites_borrados: limpiadas ?? 0, ms: Date.now() - inicio };
    const { error: e2 } = await admin.rpc('registrar_latido', { p_nombre: 'cron-conciliar', p_detalle: detalle });
    if (e2) throw new Error('registrar_latido: ' + e2.message);

    return json({ ok: true, ...detalle });
  } catch (e) {
    return respuestaDeError(e);
  }
}

