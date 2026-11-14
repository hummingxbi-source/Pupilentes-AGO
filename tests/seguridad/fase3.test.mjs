// Pruebas de seguridad e integración · Fase 3 (ARQUITECTURA §6.3 y §7.1, trabajo `integracion` del CI).
// Golpean las Edge Functions REALES (`supabase functions serve`) con la BD local, Mercado Pago simulado
// (scripts/mp-simulado.mjs) y Turnstile con la llave de prueba de Cloudflare que siempre aprueba.
//
// Requisitos (los arma el CI; en local, igual):
//   supabase start · supabase functions serve --env-file <env con MP_API_URL=http://host.docker.internal:8090 …>
//   MP_SIM_HOST=0.0.0.0 MP_WEBHOOK_SECRET=… MP_NOTIFICATION_URL=http://127.0.0.1:55321/functions/v1/webhook-mercadopago node scripts/mp-simulado.mjs
//   node --test tests/seguridad
// Variables: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, DB_URL, CRON_SECRET, MP_SIM_URL.
//
// Nota: cada prueba usa su propia IP en `cf-connecting-ip` para no chocar con los límites por IP.
// Que esa cabecera se pueda fijar desde fuera es justo lo que hay que verificar en el proyecto en la nube
// (ARQUITECTURA §8): en local no hay Cloudflare delante que la sobrescriba.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const API = (process.env.SUPABASE_URL || 'http://127.0.0.1:55321').replace(/\/$/, '');
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.PUBLISHABLE_KEY || process.env.ANON_KEY;
const SEC = process.env.SUPABASE_SECRET_KEY || process.env.SECRET_KEY || process.env.SERVICE_ROLE_KEY;
const DB = process.env.DB_URL || 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';
const SIM = (process.env.MP_SIM_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');
const CRON = process.env.CRON_SECRET || 'cron-local-solo-desarrollo';
const ORIGEN = 'http://localhost:5173';
const TURNSTILE = 'XXXX.DUMMY.TOKEN.XXXX';   // token de prueba de Cloudflare
if (!PUB || !SEC) throw new Error('Faltan SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY (supabase status -o env)');

const db = new pg.Client({ connectionString: DB });
await db.connect();
after(() => db.end());

let ipN = 0;
const nuevaIp = () => `198.51.100.${++ipN}`;
let telN = 0;
const nuevoTel = () => `55${String(Date.now() % 1e6).padStart(6, '0')}${String(++telN).padStart(2, '0')}`.slice(0, 10);

async function fn(nombre, cuerpo, { ip = nuevaIp(), origen = ORIGEN, token, encabezados = {}, query = '' } = {}) {
  const r = await fetch(`${API}/functions/v1/${nombre}${query}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json', apikey: PUB, 'cf-connecting-ip': ip,
      ...(origen ? { Origin: origen } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...encabezados,
    },
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  });
  let datos = null;
  try { datos = await r.json(); } catch { /* sin cuerpo */ }
  return { status: r.status, datos };
}
const uno = async (sql, args = []) => (await db.query(sql, args)).rows[0];
const stock = async (sku) => (await uno('select stock, stock_reservado from public.variantes where sku = $1', [sku]));
const pedidoDe = async (folio) => uno('select id, estado, pago_estado, no_entregar, token_rastreo from public.pedidos where folio = $1', [folio]);

/** Un SKU activo con al menos `n` pares disponibles que ninguna otra prueba de este archivo haya usado. */
const usados = new Set();
async function skuCon(n = 2) {
  const { rows } = await db.query(
    `select sku, precio from public.variantes v join public.productos p on p.id = v.producto_id
      where v.activo and p.activo and v.stock - v.stock_reservado >= $1 and v.graduacion is null
      order by v.sku`, [n]);
  const f = rows.find((x) => !usados.has(x.sku));
  assert.ok(f, 'no quedan SKUs con stock para las pruebas');
  usados.add(f.sku);
  return { sku: f.sku, precio: Number(f.precio) };
}

function cuerpoPedido({ sku, precio }, { metodo = 'mercadopago', tel = nuevoTel(), cantidad = 1, total, clave = randomUUID() } = {}) {
  return {
    clave_idempotencia: clave, metodo_pago: metodo, items: [{ sku, cantidad }],
    entrega: { tipo: 'metro', zona: 'Pantitlán', cita: 'sábado 3 pm' },    // Metro Pantitlán: envío $0
    contacto: { nombre: 'Prueba CI', telefono: tel, correo: 'ci@prueba.mx' },
    total_visto: total ?? precio * cantidad, turnstile: TURNSTILE,
  };
}

/** Paga en el simulador como lo haría la clienta en la página de MP. Devuelve el id del pago. */
async function pagarEnSim(urlPago, status = 'approved') {
  const pref = new URL(urlPago).searchParams.get('pref');
  const r = await fetch(`${SIM}/simular`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pref, status }) });
  assert.equal(r.status, 303, 'el simulador regresa a la tienda');
  return new URL(r.headers.get('location')).searchParams.get('payment_id');
}
const simularPago = (id, cambios) => fetch(`${SIM}/simular/pagos/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cambios) }).then((r) => r.json());

// --------------------------------------------------------------------------------------- básicos
test('salud responde (las funciones están arriba)', async () => {
  const r = await fetch(`${API}/functions/v1/salud`, { headers: { apikey: PUB } });
  assert.equal(r.status, 200);
});

test('CORS: llamar una función desde otro origen → bloqueado', async () => {
  const r = await fn('pedidos-crear', {}, { origen: 'https://sitio-malicioso.example' });
  assert.equal(r.status, 403);
  assert.equal(r.datos.error, 'origen_no_permitido');
});

test('límite: ráfaga a una función pública desde una IP → 429', async () => {
  const ip = nuevaIp();
  const estados = [];
  for (let i = 0; i < 16; i++) estados.push((await fn('pedidos-crear', {}, { ip })).status);
  assert.ok(estados.slice(0, 15).every((s) => s === 400), `las primeras 15 llegan (cuerpo inválido → 400): ${estados}`);
  assert.equal(estados[15], 429, 'la 16.ª se bloquea');
});

// --------------------------------------------------------------------------------- pedidos-crear
test('pedidos-crear: total alterado en el navegador → 409 con el total real y sin pedido', async () => {
  const v = await skuCon();
  const tel = nuevoTel();
  const r = await fn('pedidos-crear', cuerpoPedido(v, { tel, total: 1 }));
  assert.equal(r.status, 409);
  assert.equal(r.datos.error, 'total_cambio');
  assert.equal(r.datos.total, v.precio, 'el servidor responde con el precio de la BD');
  assert.equal(Number((await uno(`select count(*) from public.pedidos where contacto->>'telefono' = $1`, [tel])).count), 0);
});

test('pedidos-crear: precio inventado dentro del renglón se ignora (cobra el de la BD)', async () => {
  const v = await skuCon();
  const c = cuerpoPedido(v, { metodo: 'transferencia' });
  c.items[0].precio = 1;
  const r = await fn('pedidos-crear', c);
  assert.equal(r.status, 200, JSON.stringify(r.datos));
  assert.equal(r.datos.total, v.precio);
});

test('pedidos-crear: cantidad cero, negativa o enorme → 400', async () => {
  const v = await skuCon();
  for (const cantidad of [0, -1, 500]) {
    const r = await fn('pedidos-crear', cuerpoPedido(v, { cantidad, total: v.precio }));
    assert.equal(r.status, 400, `cantidad ${cantidad}`);
  }
});

test('pedidos-crear: misma clave de idempotencia (doble toque) → un solo pedido y un solo apartado', async () => {
  const v = await skuCon();
  const antes = await stock(v.sku);
  const c = cuerpoPedido(v, { metodo: 'transferencia' });
  const [a, b] = await Promise.all([fn('pedidos-crear', c), fn('pedidos-crear', c)]);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.equal(a.datos.folio, b.datos.folio);
  assert.equal(Number((await uno('select count(*) from public.pedidos where clave_idempotencia = $1', [c.clave_idempotencia])).count), 1);
  assert.equal((await stock(v.sku)).stock_reservado, antes.stock_reservado + 1);
});

test('pedidos-crear: más pedidos sin pagar del mismo teléfono que el tope → 429 y no aparta más', async () => {
  const v = await skuCon(5);
  const tel = nuevoTel();
  for (let i = 0; i < 3; i++) assert.equal((await fn('pedidos-crear', cuerpoPedido(v, { tel, metodo: 'transferencia' }))).status, 200);
  const antes = await stock(v.sku);
  const r = await fn('pedidos-crear', cuerpoPedido(v, { tel, metodo: 'transferencia' }));
  assert.equal(r.status, 429);
  assert.deepEqual(await stock(v.sku), antes);
});

// ------------------------------------------------------------------ Mercado Pago (simulado) de punta a punta
test('MP: pago aprobado → pagado, el stock baja 1; un segundo aviso del mismo pago no descuenta otra vez', async () => {
  const v = await skuCon();
  const antes = await stock(v.sku);
  const r = await fn('pedidos-crear', cuerpoPedido(v));
  assert.equal(r.status, 200, JSON.stringify(r.datos));
  assert.ok(r.datos.url_pago, 'hay URL de pago');
  const idPago = await pagarEnSim(r.datos.url_pago, 'approved');
  const p = await pedidoDe(r.datos.folio);
  assert.equal(p.estado, 'pagado');
  assert.deepEqual(await stock(v.sku), { stock: antes.stock - 1, stock_reservado: antes.stock_reservado });
  await simularPago(idPago, { status: 'approved' });   // MP vuelve a avisar del mismo pago
  assert.equal(Number((await uno(`select count(*) from public.movimientos_stock where pedido_id = $1 and motivo = 'venta'`, [p.id])).count), 1);
  assert.equal((await stock(v.sku)).stock, antes.stock - 1);
});

test('MP: aviso con firma falsa → 401 y nada cambia', async () => {
  const antes = await uno('select count(*)::int as n from public.pagos');
  const ts = String(Date.now());
  const falsa = createHmac('sha256', 'no-es-el-secreto').update(`id:123;request-id:x;ts:${ts};`).digest('hex');
  const r = await fn('webhook-mercadopago', { type: 'payment', data: { id: '123' } }, {
    origen: null, query: '?data.id=123&type=payment', encabezados: { 'x-signature': `ts=${ts},v1=${falsa}`, 'x-request-id': 'x' },
  });
  assert.equal(r.status, 401);
  assert.equal((await uno('select count(*)::int as n from public.pagos')).n, antes.n);
});

test('MP: pago firmado pero con monto distinto al del pedido → no se confirma y hay alerta', async () => {
  const v = await skuCon();
  const r = await fn('pedidos-crear', cuerpoPedido(v));
  const idPago = await pagarEnSim(r.datos.url_pago, 'pending');
  await simularPago(idPago, { status: 'approved', transaction_amount: 1 });
  const p = await pedidoDe(r.datos.folio);
  assert.equal(p.estado, 'pendiente_pago');
  assert.ok(await uno(`select 1 from privado.alertas where tipo = 'monto_distinto' and pedido_id = $1`, [p.id]));
});

test('MP: pago aprobado de OTRO pedido (external_reference ajeno) → este pedido no se confirma', async () => {
  const v = await skuCon();
  const r = await fn('pedidos-crear', cuerpoPedido(v));
  const idPago = await pagarEnSim(r.datos.url_pago, 'pending');
  const ajena = randomUUID();
  await simularPago(idPago, { status: 'approved', external_reference: ajena });
  assert.equal((await pedidoDe(r.datos.folio)).estado, 'pendiente_pago');
  assert.ok(await uno(`select 1 from privado.alertas where tipo = 'pago_sin_pedido' and detalle->>'ref' = $1`, [ajena]));
});

test('MP: el pago llega después de vencido el apartado y ya no hay stock → pagado_sin_stock con alerta', async () => {
  const v = await skuCon();
  const r = await fn('pedidos-crear', cuerpoPedido(v));
  const p0 = await pedidoDe(r.datos.folio);
  // Vence el apartado y el cron lo libera
  await db.query(`update public.reservas_stock set expira_en = now() - interval '1 minute' where pedido_id = $1`, [p0.id]);
  const cron = await fetch(`${API}/functions/v1/cron-conciliar`, { method: 'POST', headers: { 'x-cron-secret': CRON } });
  assert.equal(cron.status, 200);
  assert.equal((await pedidoDe(r.datos.folio)).estado, 'expirado');
  // Mientras, se vende todo lo que quedaba por otro canal
  const s = await stock(v.sku);
  await db.query(`select public.mover_stock((select id from public.variantes where sku = $1), $2, 'venta', $3, 'ml')`, [v.sku, -(s.stock - s.stock_reservado), `ml:ci:${randomUUID()}`]);
  await pagarEnSim(r.datos.url_pago, 'approved');
  const p = await pedidoDe(r.datos.folio);
  assert.equal(p.estado, 'pagado_sin_stock');
  assert.ok(await uno(`select 1 from privado.alertas where tipo = 'pagado_sin_stock' and pedido_id = $1`, [p.id]));
});

// -------------------------------------------------------------------------------------- rastreo
test('rastreo con el enlace (token): muestra el pedido sin teléfono, correo ni dirección', async () => {
  const v = await skuCon();
  const tel = nuevoTel();
  const r = await fn('pedidos-crear', cuerpoPedido(v, { metodo: 'transferencia', tel }));
  const t = await fn('pedidos-rastrear', { token: r.datos.token });
  assert.equal(t.status, 200);
  assert.equal(t.datos.folio, r.datos.folio);
  const texto = JSON.stringify(t.datos);
  assert.ok(!texto.includes(tel), 'no expone el teléfono');
  assert.ok(!texto.includes('ci@prueba.mx'), 'no expone el correo');
});

test('rastreo por folio: adivinar los 4 dígitos se bloquea al 6.º intento', async () => {
  const v = await skuCon();
  const r = await fn('pedidos-crear', cuerpoPedido(v, { metodo: 'transferencia', tel: '5512340000' }));
  const estados = [];
  for (let i = 1; i <= 6; i++) {
    estados.push((await fn('pedidos-rastrear', { folio: r.datos.folio, tel4: String(1000 + i), turnstile: TURNSTILE })).status);
  }
  assert.deepEqual(estados.slice(0, 5), [404, 404, 404, 404, 404], 'los primeros 5 no encuentran nada');
  assert.equal(estados[5], 429, 'el 6.º se bloquea aunque venga de otra IP');
});

// ---------------------------------------------------------------------------- comprobantes-subir
test('comprobantes: el token de un pedido de Mercado Pago no sirve para avisar una transferencia', async () => {
  const v = await skuCon();
  const r = await fn('pedidos-crear', cuerpoPedido(v));
  const a = await fn('comprobantes-subir', { modo: 'whatsapp', token: r.datos.token });
  assert.equal(a.status, 404);
});

// ------------------------------------------------------------------------------- panel (con MFA)
function base32(s) {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of s.replace(/=+$/, '').toUpperCase()) bits += abc.indexOf(c).toString(2).padStart(5, '0');
  return Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
}
function totp(secreto, t = Date.now()) {
  const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(Math.floor(t / 30000)));
  const h = createHmac('sha1', base32(secreto)).update(c).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, '0');
}
/** Crea una cuenta de panel y devuelve sus sesiones: solo contraseña (aal1) y con MFA (aal2). */
async function cuentaPanel(rol) {
  const admin = createClient(API, SEC, { auth: { persistSession: false, autoRefreshToken: false } });
  const correo = `ci-${rol}-${randomUUID().slice(0, 8)}@prueba.mx`, clave = `Ci-${randomUUID()}`;
  const { data: u, error } = await admin.auth.admin.createUser({ email: correo, password: clave, email_confirm: true });
  assert.ifError(error);
  await db.query('insert into public.perfiles_panel (user_id, rol) values ($1, $2)', [u.user.id, rol]);
  const cli = createClient(API, PUB, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: s1, error: e1 } = await cli.auth.signInWithPassword({ email: correo, password: clave });
  assert.ifError(e1);
  const aal1 = s1.session.access_token;
  const { data: f, error: e2 } = await cli.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'ci' });
  assert.ifError(e2);
  const { data: v, error: e3 } = await cli.auth.mfa.challengeAndVerify({ factorId: f.id, code: totp(f.totp.secret) });
  assert.ifError(e3);
  return { aal1, aal2: v.access_token, id: u.user.id };
}

test('panel: sin sesión → 401; con contraseña pero sin MFA → 403', async () => {
  const v = await skuCon();
  const r = await fn('pedidos-crear', cuerpoPedido(v, { metodo: 'transferencia' }));
  const p = await pedidoDe(r.datos.folio);
  const sin = await fn('panel-pedidos', { accion: 'estado', pedido: p.id, nuevo: 'preparando' });
  assert.equal(sin.status, 401);
  const { aal1 } = await cuentaPanel('duena');
  const mfa = await fn('panel-pedidos', { accion: 'validar_transferencia', pedido: p.id, aprobar: true }, { token: aal1 });
  assert.equal(mfa.status, 403);
  assert.equal((await pedidoDe(r.datos.folio)).estado, 'pendiente_pago');
});

test('panel: la ayudante (con MFA) no aprueba pagos, no reembolsa y no regresa stock', async () => {
  const v = await skuCon();
  const r = await fn('pedidos-crear', cuerpoPedido(v, { metodo: 'transferencia' }));
  const p = await pedidoDe(r.datos.folio);
  const { aal2 } = await cuentaPanel('ayudante');
  for (const cuerpo of [{ accion: 'validar_transferencia', aprobar: true }, { accion: 'reembolsar' }, { accion: 'devolver' }]) {
    assert.equal((await fn('panel-pedidos', { ...cuerpo, pedido: p.id }, { token: aal2 })).status, 403, cuerpo.accion);
  }
});

test('panel: transferencia aprobada por la dueña → pagado; reembolso antes de enviar → el stock regresa solo', async () => {
  const v = await skuCon();
  const antes = await stock(v.sku);
  const r = await fn('pedidos-crear', cuerpoPedido(v, { metodo: 'transferencia' }));
  assert.equal((await fn('comprobantes-subir', { modo: 'whatsapp', token: r.datos.token })).datos.estado, 'pendiente_validacion');
  const p = await pedidoDe(r.datos.folio);
  const { aal2 } = await cuentaPanel('duena');
  const ap = await fn('panel-pedidos', { accion: 'validar_transferencia', pedido: p.id, aprobar: true }, { token: aal2 });
  assert.equal(ap.status, 200, JSON.stringify(ap.datos));
  assert.equal((await stock(v.sku)).stock, antes.stock - 1);
  const re = await fn('panel-pedidos', { accion: 'reembolsar', pedido: p.id, nota: 'ci' }, { token: aal2 });
  assert.equal(re.status, 200, JSON.stringify(re.datos));
  assert.equal(re.datos.stock_devuelto, true);
  assert.deepEqual(await stock(v.sku), antes);
  const otra = await fn('panel-pedidos', { accion: 'devolver', pedido: p.id }, { token: aal2 });
  assert.equal(otra.status, 409, 'no se devuelve dos veces');
});

test('panel: pedido ya entregado y reembolsado → el stock solo regresa cuando la dueña lo confirma', async () => {
  const v = await skuCon();
  const antes = await stock(v.sku);
  const r = await fn('pedidos-crear', cuerpoPedido(v, { metodo: 'transferencia' }));
  const p = await pedidoDe(r.datos.folio);
  const { aal2 } = await cuentaPanel('duena');
  assert.equal((await fn('panel-pedidos', { accion: 'validar_transferencia', pedido: p.id, aprobar: true }, { token: aal2 })).status, 200);
  assert.equal((await fn('panel-pedidos', { accion: 'estado', pedido: p.id, nuevo: 'entregado' }, { token: aal2 })).status, 200);
  const re = await fn('panel-pedidos', { accion: 'reembolsar', pedido: p.id }, { token: aal2 });
  assert.equal(re.datos.stock_devuelto, false);
  assert.equal((await stock(v.sku)).stock, antes.stock - 1, 'todavía no regresa');
  const dv = await fn('panel-pedidos', { accion: 'devolver', pedido: p.id, nota: 'regresó sellado' }, { token: aal2 });
  assert.equal(dv.status, 200, JSON.stringify(dv.datos));
  assert.deepEqual(await stock(v.sku), antes);
});
