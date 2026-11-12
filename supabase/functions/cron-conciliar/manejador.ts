// POST /functions/v1/cron-conciliar — la invoca Supabase Cron cada 10 min (ARQUITECTURA §3.3 D).
// Fase 0: autentica, limpia ventanas viejas de límites y deja un latido.
// Fase 1: libera reservas vencidas.
// Fase 3: borra payloads de webhooks de más de 90 días y manda por correo las alertas nuevas
//         (Resend, solo si RESEND_API_KEY y ALERTAS_CORREO están configurados).
// Fases 5 y 6 agregan: procesar cola_sync, missed_feeds de ML, órdenes de TikTok sin webhook
// y comparar el stock publicado.

import { clienteServicio, exigirSecretoCron } from '../_shared/auth.ts';
import { json, respuestaDeError } from '../_shared/http.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

const TITULOS: Record<string, string> = {
  pagado_sin_stock: 'Pago recibido sin stock: hay que reembolsar',
  monto_distinto: 'Pago con monto distinto al del pedido',
  contracargo: 'Contracargo: no entregar',
  reembolso: 'Reembolso registrado en Mercado Pago',
  pago_sin_pedido: 'Pago de Mercado Pago sin pedido',
  webhook_fallido: 'Un aviso de pago no se pudo procesar',
};
const escapar = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Manda un solo correo con las alertas nuevas. Si falla, quedan marcadas y se ven en el panel ("Hoy"). */
async function avisarPorCorreo(admin: SupabaseClient, fetchFn: typeof fetch): Promise<number> {
  const llave = Deno.env.get('RESEND_API_KEY'), para = Deno.env.get('ALERTAS_CORREO');
  if (!llave || !para) return 0;
  const { data, error } = await admin.rpc('alertas_por_notificar');
  if (error) throw new Error('alertas_por_notificar: ' + error.message);
  const alertas = (data ?? []) as { tipo: string; detalle: Record<string, unknown>; creado_en: string }[];
  if (!alertas.length) return 0;
  const filas = alertas.map((a) => `<li><b>${escapar(TITULOS[a.tipo] ?? a.tipo)}</b> · ${escapar(String(a.detalle?.folio ?? ''))}</li>`).join('');
  const r = await fetchFn('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('ALERTAS_REMITENTE') ?? 'Pupilentes AGO <alertas@pupilentesago.mx>',
      to: para.split(',').map((x) => x.trim()).filter(Boolean),
      subject: `Panel AGO: ${alertas.length} alerta${alertas.length === 1 ? '' : 's'} nueva${alertas.length === 1 ? '' : 's'}`,
      html: `<p>Revisa la pestaña “Hoy” del panel:</p><ul>${filas}</ul>`,
    }),
  });
  if (!r.ok) console.error('resend', r.status);
  return r.ok ? alertas.length : 0;
}

export async function manejar(req: Request, admin = clienteServicio(), fetchFn: typeof fetch = fetch): Promise<Response> {
  try {
    if (req.method !== 'POST') return json({ error: 'metodo_no_permitido' }, 405, { Allow: 'POST' });
    exigirSecretoCron(req);

    const inicio = Date.now();
    // Fase 1: devuelve al inventario lo apartado por pedidos que no se pagaron a tiempo.
    const { data: liberados, error: e0 } = await admin.rpc('liberar_reservas_vencidas');
    if (e0) throw new Error('liberar_reservas_vencidas: ' + e0.message);

    const { data: limpiadas, error: e1 } = await admin.rpc('limpiar_limites_tasa');
    if (e1) throw new Error('limpiar_limites_tasa: ' + e1.message);

    const { data: payloads, error: e3 } = await admin.rpc('limpiar_payloads_viejos');
    if (e3) throw new Error('limpiar_payloads_viejos: ' + e3.message);

    let alertas = 0;
    try { alertas = await avisarPorCorreo(admin, fetchFn); } catch (e) { console.error('alertas', e instanceof Error ? e.message : e); }

    const detalle = { reservas_liberadas: liberados ?? 0, limites_borrados: limpiadas ?? 0, payloads_borrados: payloads ?? 0, alertas_enviadas: alertas, ms: Date.now() - inicio };
    const { error: e2 } = await admin.rpc('registrar_latido', { p_nombre: 'cron-conciliar', p_detalle: detalle });
    if (e2) throw new Error('registrar_latido: ' + e2.message);

    return json({ ok: true, ...detalle });
  } catch (e) {
    return respuestaDeError(e);
  }
}

