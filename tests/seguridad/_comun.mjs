// Utilidades compartidas por tests/seguridad/*.test.mjs (no es un archivo de pruebas).
import { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

export const API = (process.env.SUPABASE_URL || 'http://127.0.0.1:55321').replace(/\/$/, '');
export const PUB = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.PUBLISHABLE_KEY || process.env.ANON_KEY;
export const SEC = process.env.SUPABASE_SECRET_KEY || process.env.SECRET_KEY || process.env.SERVICE_ROLE_KEY;
const DB = process.env.DB_URL || 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';
export const SIM = (process.env.MP_SIM_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');
export const CRON = process.env.CRON_SECRET || 'cron-local-solo-desarrollo';
export const ORIGEN = 'http://localhost:5173';
export const TURNSTILE = 'XXXX.DUMMY.TOKEN.XXXX';   // token de prueba de Cloudflare
if (!PUB || !SEC) throw new Error('Faltan SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY (supabase status -o env)');

export const db = new pg.Client({ connectionString: DB });
await db.connect();
after(() => db.end());

// Cada archivo de pruebas corre en su propio proceso: el segundo octeto evita repetir IPs entre archivos
let ipN = 0;
const OCTETO = 10 + (process.pid % 240);
export const nuevaIp = () => `10.${OCTETO}.${Math.floor(++ipN / 250)}.${ipN % 250}`;
let telN = 0;
export const nuevoTel = () => `55${String(Date.now() % 1e6).padStart(6, '0')}${String(++telN).padStart(2, '0')}`.slice(0, 10);

export async function fn(nombre, cuerpo, { ip = nuevaIp(), origen = ORIGEN, token, encabezados = {}, query = '' } = {}) {
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
export const uno = async (sql, args = []) => (await db.query(sql, args)).rows[0];
export const stock = async (sku) => (await uno('select stock, stock_reservado from public.variantes where sku = $1', [sku]));
export const pedidoDe = async (folio) => uno('select id, estado, pago_estado, no_entregar, token_rastreo from public.pedidos where folio = $1', [folio]);

/** Un SKU activo con al menos `n` pares disponibles que ninguna otra prueba de este archivo haya usado. */
const usados = new Set();
export async function skuCon(n = 2) {
  const { rows } = await db.query(
    `select sku, precio from public.variantes v join public.productos p on p.id = v.producto_id
      where v.activo and p.activo and v.stock - v.stock_reservado >= $1 and v.graduacion is null
      order by v.sku`, [n]);
  const f = rows.find((x) => !usados.has(x.sku));
  assert.ok(f, 'no quedan SKUs con stock para las pruebas');
  usados.add(f.sku);
  return { sku: f.sku, precio: Number(f.precio) };
}

export function cuerpoPedido({ sku, precio }, { metodo = 'mercadopago', tel = nuevoTel(), cantidad = 1, total, clave = randomUUID() } = {}) {
  return {
    clave_idempotencia: clave, metodo_pago: metodo, items: [{ sku, cantidad }],
    entrega: { tipo: 'metro', zona: 'Pantitlán', cita: 'sábado 3 pm' },    // Metro Pantitlán: envío $0
    contacto: { nombre: 'Prueba CI', telefono: tel, correo: 'ci@prueba.mx' },
    total_visto: total ?? precio * cantidad, turnstile: TURNSTILE,
  };
}

/** Paga en el simulador como lo haría la clienta en la página de MP. Devuelve el id del pago. */
export async function pagarEnSim(urlPago, status = 'approved') {
  const pref = new URL(urlPago).searchParams.get('pref');
  const r = await fetch(`${SIM}/simular`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pref, status }) });
  assert.equal(r.status, 303, 'el simulador regresa a la tienda');
  return new URL(r.headers.get('location')).searchParams.get('payment_id');
}
export const simularPago = (id, cambios) => fetch(`${SIM}/simular/pagos/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cambios) }).then((r) => r.json());

// ------------------------------------------------------------------------------- panel (con MFA)
export function base32(s) {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of s.replace(/=+$/, '').toUpperCase()) bits += abc.indexOf(c).toString(2).padStart(5, '0');
  return Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
}
export function totp(secreto, t = Date.now()) {
  const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(Math.floor(t / 30000)));
  const h = createHmac('sha1', base32(secreto)).update(c).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, '0');
}
/** Crea una cuenta de panel y devuelve sus sesiones: solo contraseña (aal1) y con MFA (aal2). */
export async function cuentaPanel(rol) {
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

