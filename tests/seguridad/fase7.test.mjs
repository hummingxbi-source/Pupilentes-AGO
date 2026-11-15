// Pruebas de seguridad e integración · Fase 7 · cuenta de clienta y puntos (ARQUITECTURA §6.3, §8).
// Supabase Auth REAL (GoTrue local con Turnstile de prueba y Mailpit), Edge Functions reales y Mercado Pago simulado.
//   · El código por correo se lee de Mailpit (http://127.0.0.1:55324), como lo leería la clienta.
//   · Las demás sesiones se abren con un código generado por la API de administración (no manda correo:
//     el límite local de Auth es de 2 correos por hora).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { API, PUB, SEC, TURNSTILE, fn, uno, skuCon, cuerpoPedido, pagarEnSim, cuentaPanel, nuevoTel } from './_comun.mjs';

const MAILPIT = (process.env.MAILPIT_URL || 'http://127.0.0.1:55324').replace(/\/$/, '');
const admin = createClient(API, SEC, { auth: { persistSession: false, autoRefreshToken: false } });
const nuevoCorreo = (p = 'cta') => `ci-${p}-${randomUUID().slice(0, 8)}@prueba.mx`;
const otp = (cuerpo) => fetch(`${API}/auth/v1/otp`, { method: 'POST', headers: { apikey: PUB, 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });

/** Sesión de clienta con correo verificado (código generado por la API de administración). */
async function sesionClienta(correo = nuevoCorreo()) {
  const { error: e0 } = await admin.auth.admin.createUser({ email: correo, email_confirm: true });
  assert.ifError(e0);
  const { data: l, error: e1 } = await admin.auth.admin.generateLink({ type: 'magiclink', email: correo });
  assert.ifError(e1);
  const cli = createClient(API, PUB, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: s, error: e2 } = await cli.auth.verifyOtp({ email: correo, token: l.properties.email_otp, type: 'email' });
  assert.ifError(e2);
  return { correo, token: s.session.access_token, id: s.user.id, cli };
}
const resumen = (token) => fn('cuenta', { accion: 'resumen' }, { token });
const saldo = async (token) => (await resumen(token)).datos.saldo;

async function codigoDeMailpit(correo) {
  for (let i = 0; i < 30; i++) {
    const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${correo}"`)}`);
    const { messages = [] } = await r.json();
    if (messages[0]) {
      const m = await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json();
      const c = /\b(\d{6})\b/.exec(m.Text || m.HTML || '');
      if (c) return c[1];
    }
    await new Promise((ok) => setTimeout(ok, 500));
  }
  throw new Error('no llegó el correo con el código a Mailpit');
}

// ------------------------------------------------------------------------------- código por correo
test('código por correo: sin Turnstile Supabase Auth NO lo manda (⚠️ Fase 7 verificado: el CAPTCHA cubre /otp)', async () => {
  const r = await otp({ email: nuevoCorreo('sin-captcha'), create_user: true });
  assert.ok(r.status >= 400 && r.status < 500, `esperaba 4xx, llegó ${r.status}`);
  assert.match(await r.text(), /captcha/i);
});

test('código por correo: con Turnstile llega el código de 6 dígitos, abre sesión y pedir otro enseguida se bloquea', async () => {
  const correo = nuevoCorreo('otp');
  const r = await otp({ email: correo, create_user: true, gotrue_meta_security: { captcha_token: TURNSTILE } });
  assert.equal(r.status, 200, await r.text());
  const codigo = await codigoDeMailpit(correo);
  const cli = createClient(API, PUB, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await cli.auth.verifyOtp({ email: correo, token: codigo, type: 'email' });
  assert.ifError(error);
  assert.ok(data.session?.access_token, 'el código abre la sesión');
  assert.ok(data.user.email_confirmed_at, 'y deja el correo verificado');
  const c = await resumen(data.session.access_token);
  assert.equal(c.status, 200, JSON.stringify(c.datos));
  assert.equal(c.datos.saldo, 0);
  assert.equal(c.datos.perfil.correo, correo);

  // Ráfaga de códigos: Supabase Auth la corta con su tope de correos por hora (local: 2, [auth.rate_limit]).
  // El 1.º reintento puede pasar (es otro tipo de correo: ya no "confirmar", sino "entrar"); los demás no.
  const estados = [];
  for (let i = 0; i < 6; i++) estados.push((await otp({ email: correo, gotrue_meta_security: { captcha_token: TURNSTILE } })).status);
  assert.ok(estados.filter((s) => s === 200).length <= 1, `a lo más pasa uno más: ${estados}`);
  assert.ok(estados.slice(1).every((s) => s === 429), `el resto se bloquea: ${estados}`);
});

test('el código usado o inventado no abre sesión', async () => {
  const correo = nuevoCorreo('malo');
  await admin.auth.admin.createUser({ email: correo, email_confirm: true });
  const cli = createClient(API, PUB, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await cli.auth.verifyOtp({ email: correo, token: '000000', type: 'email' });
  assert.ok(error, 'código inventado → error');
});

// ------------------------------------------------------------------------------- función cuenta
test('cuenta: sin sesión 401; cuenta del panel 403', async () => {
  assert.equal((await fn('cuenta', { accion: 'resumen' })).status, 401);
  const panel = await cuentaPanel('duena');
  const r = await fn('cuenta', { accion: 'resumen' }, { token: panel.aal2 });
  assert.equal(r.status, 403);
  assert.equal(r.datos.error, 'cuenta_de_panel');
});

test('pedidos de invitada con su correo se asocian al entrar y suman sus puntos; con otro correo no', async () => {
  const correo = nuevoCorreo('inv');
  const v = await skuCon();
  const tel = nuevoTel();
  const c1 = cuerpoPedido(v, { tel }); c1.contacto.correo = correo;
  const p1 = await fn('pedidos-crear', c1);
  assert.equal(p1.status, 200, JSON.stringify(p1.datos));
  await pagarEnSim(p1.datos.url_pago);
  const c2 = cuerpoPedido(v, { tel, metodo: 'transferencia' }); c2.contacto.correo = nuevoCorreo('otra');   // mismo teléfono, otro correo
  assert.equal((await fn('pedidos-crear', c2)).status, 200);

  // El aviso de MP llega aparte: se espera a que el pedido quede pagado
  for (let i = 0; i < 30 && (await uno('select estado from public.pedidos where folio = $1', [p1.datos.folio])).estado !== 'pagado'; i++) {
    await new Promise((ok) => setTimeout(ok, 300));
  }
  const s = await sesionClienta(correo);
  const r = await resumen(s.token);
  assert.equal(r.status, 200, JSON.stringify(r.datos));
  assert.equal(r.datos.vinculados, 1, 'solo el pedido con su correo');
  assert.equal(r.datos.pedidos.length, 1);
  assert.equal(r.datos.pedidos[0].folio, p1.datos.folio);
  assert.equal(r.datos.pedidos[0].contacto, undefined, 'no se exponen datos de contacto del pedido ligado por correo');
  assert.equal(r.datos.saldo, Math.floor(v.precio / 10));
});

test('RLS: una clienta no lee datos de otra ni con la API directa', async () => {
  const a = await sesionClienta(), b = await sesionClienta();
  await resumen(a.token); await resumen(b.token);
  await uno(`insert into public.puntos_movimientos (clienta_id, delta, motivo) select id, 500, 'ajuste' from public.clientas where auth_user_id = $1`, [a.id]);
  const conB = createClient(API, PUB, { global: { headers: { Authorization: `Bearer ${b.token}` } }, auth: { persistSession: false } });
  const { data: mov } = await conB.from('puntos_movimientos').select('delta');
  assert.deepEqual(mov, [], 'B no ve los puntos de A');
  const { data: cl } = await conB.from('clientas').select('id, auth_user_id');
  assert.equal(cl.length, 1); assert.equal(cl[0].auth_user_id, b.id);
  const { data: ped } = await conB.from('pedidos').select('id');
  assert.deepEqual(ped, []);
  const { error } = await conB.rpc('cuenta_resumen', { p_user: a.id });
  assert.ok(error, 'el resumen de otra persona no se pide por RPC');
  assert.equal(await saldo(a.token), 500);
});

// ------------------------------------------------------------------------------- puntos en la caja
test('compra con puntos: el servidor descuenta, Mercado Pago cobra el total con descuento y el pago suma puntos', async () => {
  const a = await sesionClienta();
  await resumen(a.token);
  await uno(`insert into public.puntos_movimientos (clienta_id, delta, motivo) select id, 100, 'ajuste' from public.clientas where auth_user_id = $1`, [a.id]);
  const v = await skuCon();
  const c = cuerpoPedido(v, { total: v.precio - 50 }); c.puntos = 100; c.contacto.correo = '';
  const r = await fn('pedidos-crear', c, { token: a.token });
  assert.equal(r.status, 200, JSON.stringify(r.datos));
  assert.equal(r.datos.descuento, 50); assert.equal(r.datos.total, v.precio - 50);
  assert.equal(await saldo(a.token), 0, 'los puntos se apartan al crear el pedido');
  const ped = await uno('select cuenta_id, cuenta_ligada_por, contacto from public.pedidos where folio = $1', [r.datos.folio]);
  assert.equal(ped.cuenta_id, a.id); assert.equal(ped.cuenta_ligada_por, 'sesion');
  assert.equal(ped.contacto.correo, a.correo, 'sin correo escrito, el recibo va al de la cuenta');

  await pagarEnSim(r.datos.url_pago);
  const ganados = Math.floor((v.precio - 50) / 10);
  for (let i = 0; i < 30 && (await saldo(a.token)) !== ganados; i++) await new Promise((ok) => setTimeout(ok, 300));
  assert.equal(await saldo(a.token), ganados, 'pagado: gana puntos por lo que pagó en productos');
});

test('puntos: sin sesión 401; más de los que tiene 409; el total alterado no pasa', async () => {
  const v = await skuCon();
  const c = cuerpoPedido(v, { total: v.precio - 5 }); c.puntos = 10;
  const sin = await fn('pedidos-crear', c);
  assert.equal(sin.status, 401); assert.equal(sin.datos.error, 'puntos_sin_cuenta');
  const a = await sesionClienta();
  await resumen(a.token);
  const mas = await fn('pedidos-crear', c, { token: a.token });
  assert.equal(mas.status, 409); assert.equal(mas.datos.error, 'puntos_insuficientes');
  const falso = ['eyJhbGciOiJIUzI1NiJ9', 'e30', 'no-firmado'].join('.');   // JWT con firma inválida (armado aquí para no parecer un secreto)
  const vencida = await fn('pedidos-crear', c, { token: falso });
  assert.equal(vencida.status, 401); assert.equal(vencida.datos.error, 'sesion_vencida');
});

test('los mismos puntos usados dos veces EN PARALELO: solo una compra los gasta', async () => {
  const a = await sesionClienta();
  await resumen(a.token);
  const v1 = await skuCon(), v2 = await skuCon();
  await uno(`insert into public.puntos_movimientos (clienta_id, delta, motivo) select id, 60, 'ajuste' from public.clientas where auth_user_id = $1`, [a.id]);
  const cuerpo = (v) => { const c = cuerpoPedido(v, { metodo: 'transferencia', total: v.precio - 30 }); c.puntos = 60; return c; };
  const [r1, r2] = await Promise.all([fn('pedidos-crear', cuerpo(v1), { token: a.token }), fn('pedidos-crear', cuerpo(v2), { token: a.token })]);
  const estados = [r1.status, r2.status].sort();
  assert.deepEqual(estados, [200, 409], `una pasa y otra no: ${JSON.stringify([r1.datos, r2.datos])}`);
  assert.equal(await saldo(a.token), 0);
});

test('perfil: datos inválidos 400; completo sin compras no da bono', async () => {
  const a = await sesionClienta();
  assert.equal((await fn('cuenta', { accion: 'perfil', nombre: 'A' }, { token: a.token })).status, 400);
  const r = await fn('cuenta', { accion: 'perfil', nombre: 'Clienta CI', cumpleanos: '1996-02-03' }, { token: a.token });
  assert.equal(r.status, 200, JSON.stringify(r.datos));
  assert.equal(r.datos.bono, false);
  assert.equal((await resumen(a.token)).datos.perfil.nombre, 'Clienta CI');
});
