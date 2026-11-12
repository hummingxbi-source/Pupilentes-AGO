// Pruebas de las Edge Functions de pedidos y pagos (Fase 3). BD, Mercado Pago, Turnstile y R2 se simulan;
// la firma del webhook se calcula de verdad (HMAC-SHA256) como lo hace Mercado Pago.
import assert from 'node:assert/strict';
import { manejar as crear, type Dependencias as DepCrear } from '../../../supabase/functions/pedidos-crear/manejador.ts';
import { manejar as webhook } from '../../../supabase/functions/webhook-mercadopago/manejador.ts';
import { manejar as rastrear } from '../../../supabase/functions/pedidos-rastrear/manejador.ts';
import { manejar as comprobantes } from '../../../supabase/functions/comprobantes-subir/manejador.ts';
import { manejar as panelPedidos } from '../../../supabase/functions/panel-pedidos/manejador.ts';
import { clienteMP, firmarAviso, manifiesto, verificarFirma } from '../../../supabase/functions/_shared/mercadopago.ts';
import { tipoComprobante } from '../../../supabase/functions/_shared/r2.ts';
import type { SupabaseClient } from '../../../supabase/functions/_shared/deps.ts';

type Rpc = Record<string, (a: Record<string, unknown>) => unknown>;
function bd({ rpc = {} as Rpc, filas = {} as Record<string, unknown>, rol = 'duena' as string | null, limite = true } = {}) {
  const llamadas: { rpc: string; args: Record<string, unknown> }[] = [];
  const admin = {
    auth: { getClaims: async (t: string) => t === 'jwt-valido' ? { data: { claims: { sub: 'u-1', role: 'authenticated', aal: 'aal2' } }, error: null } : { data: null, error: { message: 'x' } } },
    from: (tabla: string) => {
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'not', 'order', 'limit', 'in']) q[m] = () => q;
      q.maybeSingle = async () => ({ data: tabla === 'perfiles_panel' ? (rol ? { rol } : null) : (filas[tabla] ?? null), error: null });
      return q;
    },
    rpc: async (nombre: string, args: Record<string, unknown>) => {
      llamadas.push({ rpc: nombre, args });
      if (nombre === 'consumir_limite') return { data: limite, error: null };
      const r = rpc[nombre]?.(args);
      return r && typeof r === 'object' && 'error' in (r as object) ? r : { data: r ?? null, error: null };
    },
  } as unknown as SupabaseClient;
  return { admin, llamadas, hizo: (n: string) => llamadas.filter((l) => l.rpc === n) };
}
const post = (cuerpo: unknown, enc: Record<string, string> = {}, url = 'http://x') => new Request(url, {
  method: 'POST', body: JSON.stringify(cuerpo), headers: { 'content-type': 'application/json', ...enc },
});

// ---------------------------------------------------------------------------- pedidos-crear
const PEDIDO = {
  clave_idempotencia: 'c0ffee00-1111-2222-3333-444455556666', metodo_pago: 'mercadopago',
  items: [{ sku: 'UL-CLOUD-GRAY-ANU-N', cantidad: 1 }], entrega: { tipo: 'metro', zona: 'Pantitlán' },
  contacto: { nombre: 'Ana Prueba', telefono: '5512345678', correo: 'ana@prueba.mx' }, total_visto: 799, turnstile: 'tok',
};
const CREADO = { id: '00000000-0000-4000-8000-000000000001', folio: 'AGO-1001', token: 'a'.repeat(64), total: 799, envio: 0, expira: '2026-11-11T20:00:00Z', metodo_pago: 'mercadopago', repetido: false, estado: 'pendiente_pago' };
function mpFalso(falla = false) {
  const prefs: unknown[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    if (falla) return new Response('{"message":"caído"}', { status: 500 });
    prefs.push({ url, body: JSON.parse(String(init.body)), idem: (init.headers as Record<string, string>)['X-Idempotency-Key'] });
    return Response.json({ id: 'pref-1', init_point: 'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=pref-1' });
  }) as typeof fetch;
  return { mp: clienteMP({ token: 'TEST-tok', secretoWebhook: 's', api: 'https://mp.simulado' }, fetchFn), prefs };
}
const deps = (b: ReturnType<typeof bd>, mp = mpFalso().mp, turnstileOk = true): DepCrear => ({
  admin: b.admin, mp, turnstile: async () => ({ ok: turnstileOk }), sitio: 'https://pupilentesago.mx', urlAviso: 'https://x.supabase.co/functions/v1/webhook-mercadopago',
});

Deno.test('pedidos-crear: Mercado Pago → preferencia con el total de la BD, sin OXXO y con caducidad', async () => {
  const b = bd({ rpc: { crear_pedido: () => CREADO } });
  const m = mpFalso();
  const r = await crear(post(PEDIDO), deps(b, m.mp));
  const d = await r.json();
  assert.equal(r.status, 200);
  assert.match(d.url_pago, /^https:\/\/www\.mercadopago/);
  assert.equal(d.folio, 'AGO-1001');
  assert.equal(b.hizo('crear_pedido')[0].args.p_datos && (b.hizo('crear_pedido')[0].args.p_datos as Record<string, unknown>).turnstile, undefined, 'el token de Turnstile no llega a la BD');
  const p = (m.prefs[0] as { body: Record<string, any>; idem: string });
  assert.equal(p.body.items[0].unit_price, 799);
  assert.equal(p.body.external_reference, CREADO.id);
  assert.equal(p.body.expiration_date_to, CREADO.expira);
  assert.deepEqual(p.body.payment_methods.excluded_payment_types.map((x: { id: string }) => x.id), ['ticket', 'atm']);
  assert.equal(p.body.back_urls.success, `https://pupilentesago.mx/pedido/${CREADO.token}`);
  assert.equal(p.body.auto_return, 'approved');
  assert.equal(p.idem, `pref-${CREADO.id}`);
  assert.equal(b.hizo('guardar_preferencia_mp')[0].args.p_preferencia, 'pref-1');
});

Deno.test('pedidos-crear: total cambiado → 409 con el total nuevo; sin stock → 409', async () => {
  const b = bd({ rpc: { crear_pedido: () => ({ data: null, error: { message: 'total_cambio', details: '874.00' } }) } });
  const r = await crear(post(PEDIDO), deps(b));
  assert.equal(r.status, 409);
  assert.equal((await r.json()).total, 874);
  const s = await crear(post(PEDIDO), deps(bd({ rpc: { crear_pedido: () => ({ data: null, error: { message: 'sin_stock', details: 'X' } }) } })));
  assert.equal(s.status, 409); assert.equal((await s.json()).error, 'sin_stock');
});

Deno.test('pedidos-crear: Mercado Pago caído → cancela el pedido (libera stock) y 502', async () => {
  const b = bd({ rpc: { crear_pedido: () => CREADO } });
  const r = await crear(post(PEDIDO), deps(b, mpFalso(true).mp));
  assert.equal(r.status, 502);
  assert.equal(b.hizo('cancelar_pedido').length, 1);
});

Deno.test('pedidos-crear: transferencia no toca Mercado Pago; doble toque sobre pedido pagado no crea otro cobro', async () => {
  const m = mpFalso();
  const t = await crear(post({ ...PEDIDO, metodo_pago: 'transferencia' }), deps(bd({ rpc: { crear_pedido: () => ({ ...CREADO, metodo_pago: 'transferencia' }) } }), m.mp));
  assert.equal(t.status, 200); assert.equal((await t.json()).url_pago, undefined);
  const rep = await crear(post(PEDIDO), deps(bd({ rpc: { crear_pedido: () => ({ ...CREADO, repetido: true, estado: 'pagado' }) } }), m.mp));
  assert.equal(rep.status, 200); assert.equal((await rep.json()).estado, 'pagado');
  assert.equal(m.prefs.length, 0);
});

Deno.test('pedidos-crear: sin Turnstile 403, límite 429, datos malos 400, sin MP configurado 503', async () => {
  const ok = () => bd({ rpc: { crear_pedido: () => CREADO } });
  assert.equal((await crear(post(PEDIDO), deps(ok(), undefined, false))).status, 403);
  assert.equal((await crear(post(PEDIDO), deps(bd({ limite: false })))).status, 429);
  for (const malo of [
    { ...PEDIDO, items: [] }, { ...PEDIDO, items: [{ sku: 'x; drop', cantidad: 1 }] }, { ...PEDIDO, items: [{ sku: 'A-1', cantidad: 0 }] },
    { ...PEDIDO, metodo_pago: 'oxxo' }, { ...PEDIDO, entrega: { tipo: 'dron', zona: 'x' } }, { ...PEDIDO, entrega: { ...PEDIDO.entrega, precio: 0 } },
    { ...PEDIDO, contacto: { nombre: 'A', telefono: '1' } }, { ...PEDIDO, clave_idempotencia: 'corta' },
  ]) assert.equal((await crear(post(malo), deps(ok()))).status, 400, JSON.stringify(malo));
  assert.equal((await crear(post(PEDIDO), { ...deps(ok()), mp: null })).status, 503);
});

// ---------------------------------------------------------------------------- firma del webhook
const SECRETO = 'secreto-webhook-de-prueba';
Deno.test('firma MP: manifiesto según la documentación y verificación', async () => {
  assert.equal(manifiesto('ABC123', 'req-1', '1700000000'), 'id:abc123;request-id:req-1;ts:1700000000;');
  assert.equal(manifiesto(null, null, '1700000000'), 'ts:1700000000;');
  const enc = await firmarAviso(SECRETO, '123', 'req-9');
  const req = (h: Record<string, string>) => new Request('http://x?data.id=123&type=payment', { method: 'POST', headers: h });
  assert.equal(await verificarFirma(req(enc), SECRETO, '123'), true);
  assert.equal(await verificarFirma(req(enc), 'otro-secreto', '123'), false);
  assert.equal(await verificarFirma(req(enc), SECRETO, '124'), false, 'firma de otro pago');
  assert.equal(await verificarFirma(req({ ...enc, 'x-request-id': 'req-10' }), SECRETO, '123'), false);
  assert.equal(await verificarFirma(req({}), SECRETO, '123'), false);
  const vieja = await firmarAviso(SECRETO, '123', 'req-9', String(Date.now() - 3 * 86400_000));
  assert.equal(await verificarFirma(req(vieja), SECRETO, '123'), false, 'aviso de hace 3 días (repetición)');
});

// ---------------------------------------------------------------------------- webhook-mercadopago
const CFG = { token: 'TEST-tok', secretoWebhook: SECRETO, api: 'https://mp.simulado' };
const PAGO = { id: 123, status: 'approved', status_detail: 'accredited', transaction_amount: 799, currency_id: 'MXN', external_reference: CREADO.id, payment_type_id: 'credit_card', card: { last_four_digits: '4242' } };
async function aviso(id = '123', secreto = SECRETO) {
  const enc = await firmarAviso(secreto, id, crypto.randomUUID());
  return post({ id: 999, type: 'payment', action: 'payment.updated', data: { id } }, enc, `http://x?data.id=${id}&type=payment`);
}
const apiPago = (pago: unknown = PAGO, estado = 200) => (async () => new Response(JSON.stringify(pago), { status: estado })) as unknown as typeof fetch;

Deno.test('webhook MP: firma válida → consulta el pago a la API y lo registra (sin datos de tarjeta)', async () => {
  const b = bd({ rpc: { registrar_evento: () => true, registrar_pago_mp: () => ({ resultado: 'pagado', folio: 'AGO-1001' }) } });
  const r = await webhook(await aviso(), b.admin, CFG, apiPago());
  assert.equal(r.status, 200);
  assert.equal((await r.json()).resultado, 'pagado');
  const pago = b.hizo('registrar_pago_mp')[0].args.p_pago as Record<string, unknown>;
  assert.equal(pago.status, 'approved'); assert.equal(pago.id, '123');
  assert.equal('card' in pago, false, 'no se guarda nada de la tarjeta');
  assert.equal(b.hizo('marcar_evento')[0].args.p_error, null);
});

Deno.test('webhook MP: firma inválida 401 sin tocar la BD; aviso repetido no se reprocesa', async () => {
  const b = bd({ rpc: { registrar_evento: () => true } });
  assert.equal((await webhook(await aviso('123', 'secreto-falso'), b.admin, CFG, apiPago())).status, 401);
  assert.equal(b.hizo('registrar_evento').length, 0);
  const rep = bd({ rpc: { registrar_evento: () => false } });
  const r = await webhook(await aviso(), rep.admin, CFG, apiPago());
  assert.equal(r.status, 200); assert.equal((await r.json()).repetido, true);
  assert.equal(rep.hizo('registrar_pago_mp').length, 0);
});

Deno.test('webhook MP: si la API de MP falla → 500 (MP reintenta) y el evento queda con error', async () => {
  const b = bd({ rpc: { registrar_evento: () => true } });
  const r = await webhook(await aviso(), b.admin, CFG, apiPago({}, 503));
  assert.equal(r.status, 500);
  assert.match(String(b.hizo('marcar_evento')[0].args.p_error), /503/);
  assert.equal(b.hizo('registrar_pago_mp').length, 0);
});

Deno.test('webhook MP: otros tipos se ignoran con 200; sin configurar 503', async () => {
  const enc = await firmarAviso(SECRETO, '55', 'r');
  const r = await webhook(post({ type: 'merchant_order', data: { id: '55' } }, enc, 'http://x?data.id=55&type=merchant_order'), bd().admin, CFG, apiPago());
  assert.equal(r.status, 200); assert.equal((await r.json()).ignorado, 'merchant_order');
  assert.equal((await webhook(await aviso(), bd().admin, null, apiPago())).status, 503);
});

// ---------------------------------------------------------------------------- rastreo
Deno.test('pedidos-rastrear: por token; por folio exige Turnstile y límite por folio', async () => {
  const b = bd({ rpc: { rastrear_por_token: () => ({ folio: 'AGO-1001', estado: 'pagado' }), rastrear_por_folio: (a) => a.p_tel4 === '5678' ? { folio: 'AGO-1001' } : null } });
  assert.equal((await rastrear(post({ token: 'a'.repeat(64) }), b.admin)).status, 200);
  assert.equal((await rastrear(post({ token: 'corto' }), b.admin)).status, 400);
  assert.equal((await rastrear(post({ folio: 'ago-1001', tel4: '5678', turnstile: 't' }), b.admin, async () => ({ ok: true }))).status, 200);
  assert.ok(b.llamadas.some((l) => l.rpc === 'consumir_limite' && String(l.args.p_clave) === 'folio:AGO-1001:rastrear'));
  assert.equal((await rastrear(post({ folio: 'AGO-1001', tel4: '0000', turnstile: 't' }), b.admin, async () => ({ ok: true }))).status, 404);
  assert.equal((await rastrear(post({ folio: 'AGO-1001', tel4: '5678', turnstile: 't' }), b.admin, async () => ({ ok: false }))).status, 403);
});

// ---------------------------------------------------------------------------- comprobantes
Deno.test('comprobantes: WhatsApp sin R2; archivo exige R2 y el tipo real', async () => {
  const tok = 'b'.repeat(64);
  const b = bd({ rpc: { avisar_transferencia: () => ({ folio: 'AGO-1', estado: 'pendiente_validacion' }) } });
  const w = await comprobantes(post({ token: tok, modo: 'whatsapp' }), b.admin, null);
  assert.equal(w.status, 200);
  assert.equal((await comprobantes(post({ token: tok, modo: 'firmar', tipo: 'image/jpeg' }), b.admin, null)).status, 503);
  assert.equal((await comprobantes(post({ token: tok, modo: 'firmar', tipo: 'text/html' }), b.admin, null)).status, 400);

  const borrados: string[] = [];
  const r2 = { firmarPut: async () => 'https://r2/put', inspeccionar: async () => ({ bytes: 1000, inicio: new TextEncoder().encode('<html>') }), borrar: async (k: string) => { borrados.push(k); } } as never;
  const clave = `comprobantes/${tok.slice(0, 12)}/${crypto.randomUUID()}.jpg`;
  const malo = await comprobantes(post({ token: tok, modo: 'confirmar', clave }), b.admin, r2);
  assert.equal(malo.status, 400); assert.deepEqual(borrados, [clave], 'un HTML disfrazado de JPG se borra');
  const ajeno = await comprobantes(post({ token: tok, modo: 'confirmar', clave: `comprobantes/cccccccccccc/${crypto.randomUUID()}.jpg` }), b.admin, r2);
  assert.equal(ajeno.status, 403, 'no se puede confirmar el archivo de otro pedido');
});

Deno.test('tipoComprobante: reconoce JPG, PNG, WebP y PDF por sus bytes', () => {
  assert.equal(tipoComprobante(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'jpg');
  assert.equal(tipoComprobante(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'png');
  assert.equal(tipoComprobante(new TextEncoder().encode('%PDF-1.7')), 'pdf');
  assert.equal(tipoComprobante(new TextEncoder().encode('RIFF1234WEBPVP8 ')), 'webp');
  assert.equal(tipoComprobante(new TextEncoder().encode('<svg onload=')), null);
});

// ---------------------------------------------------------------------------- panel-pedidos
const auth = { Authorization: 'Bearer jwt-valido' };
const PID = '00000000-0000-4000-8000-000000000002';
Deno.test('panel-pedidos: la ayudante avanza la entrega pero no aprueba pagos ni reembolsa', async () => {
  const filas = { pedidos: { id: PID, folio: 'AGO-1', estado: 'pagado', metodo_pago: 'transferencia', no_entregar: false, total: 799 } };
  const ay = bd({ rol: 'ayudante', filas });
  assert.equal((await panelPedidos(post({ accion: 'estado', pedido: PID, nuevo: 'preparando' }, auth), { admin: ay.admin, mp: null, r2: null })).status, 200);
  assert.equal((await panelPedidos(post({ accion: 'validar_transferencia', pedido: PID, aprobar: true }, auth), { admin: ay.admin, mp: null, r2: null })).status, 403);
  assert.equal((await panelPedidos(post({ accion: 'reembolsar', pedido: PID }, auth), { admin: ay.admin, mp: null, r2: null })).status, 403);
  assert.equal((await panelPedidos(post({ accion: 'estado', pedido: PID, nuevo: 'preparando' }), { admin: ay.admin, mp: null, r2: null })).status, 401);
});

Deno.test('panel-pedidos: "no entregar" bloquea enviar; reembolso MP usa la API con clave idempotente', async () => {
  const ne = bd({ filas: { pedidos: { id: PID, estado: 'pagado', metodo_pago: 'mercadopago', no_entregar: true } } });
  assert.equal((await panelPedidos(post({ accion: 'estado', pedido: PID, nuevo: 'enviado' }, auth), { admin: ne.admin, mp: null, r2: null })).status, 409);

  const llamadas: { url: string; idem: string }[] = [];
  const mp = clienteMP(CFG, (async (url: string, init: RequestInit) => {
    llamadas.push({ url, idem: (init.headers as Record<string, string>)['X-Idempotency-Key'] });
    return Response.json({ id: 777 });
  }) as typeof fetch);
  const b = bd({ filas: { pedidos: { id: PID, estado: 'pagado', metodo_pago: 'mercadopago', no_entregar: false }, pagos: { id_externo: '123' } }, rpc: { panel_registrar_reembolso: () => 'reembolsado' } });
  const r = await panelPedidos(post({ accion: 'reembolsar', pedido: PID, nota: 'sin stock' }, auth), { admin: b.admin, mp, r2: null });
  assert.equal(r.status, 200);
  assert.equal(llamadas[0].url, 'https://mp.simulado/v1/payments/123/refunds');
  assert.equal(llamadas[0].idem, `reembolso-${PID}`);
  assert.equal(b.hizo('panel_registrar_reembolso')[0].args.p_id_reembolso, '777');
  // Pedido sin pagar: no se reembolsa
  const np = bd({ filas: { pedidos: { id: PID, estado: 'pendiente_pago', metodo_pago: 'mercadopago' } } });
  assert.equal((await panelPedidos(post({ accion: 'reembolsar', pedido: PID }, auth), { admin: np.admin, mp, r2: null })).status, 409);
});
