// Fase 8 · F3 · Huecos de seguridad (docs/PLAN-PRUEBAS.md §6.2). Contra Supabase local, Edge Functions y simuladores.
// Bloqueados en local (ver reporte F3): S1 (la IP real la pone la puerta de entrada de producción: necesita staging),
// S2, S3 y D14 (necesitan los buckets de R2), S20 (repo público: decisión del equipo).
// S5 está en fase8-canales.test.mjs. S9 (HTML en datos de la clienta, visto en el panel) está en tests/e2e/flujos/s9-xss.spec.mjs.
//   RLS_SALIDA=/ruta/matriz.json node --test tests/seguridad/fase8-huecos.test.mjs   escribe la matriz real de S18 (para revisarla)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { API, PUB, SEC, CRON, TURNSTILE, db, fn, uno, skuCon, cuerpoPedido, pagarEnSim, cuentaPanel, nuevaIp, nuevoTel } from './_comun.mjs';
import { matrizRls, funcionesExpuestas } from './_rls.mjs';

const admin = createClient(API, SEC, { auth: { persistSession: false, autoRefreshToken: false } });
const nuevoCorreo = (p) => `ci-${p}-${randomUUID().slice(0, 8)}@prueba.mx`;
async function sesionClienta(correo = nuevoCorreo('cta')) {
  await admin.auth.admin.createUser({ email: correo, email_confirm: true });
  const { data: l } = await admin.auth.admin.generateLink({ type: 'magiclink', email: correo });
  const cli = createClient(API, PUB, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: s, error } = await cli.auth.verifyOtp({ email: correo, token: l.properties.email_otp, type: 'email' });
  assert.ifError(error);
  const r = await fn('cuenta', { accion: 'resumen' }, { token: s.session.access_token });   // crea su fila en clientas
  assert.equal(r.status, 200, JSON.stringify(r.datos));
  return { correo, token: s.session.access_token, id: s.user.id, cli };
}
const llamar = async (nombre, cuerpo, { token, encabezados = {}, crudo } = {}) => {
  const r = await fetch(`${API}/functions/v1/${nombre}`, {
    method: 'POST', body: crudo ?? JSON.stringify(cuerpo),
    headers: { 'content-type': 'application/json', apikey: PUB, Origin: 'http://localhost:5173', 'cf-connecting-ip': nuevaIp(), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...encabezados },
  });
  return { status: r.status, texto: await r.text() };
};

let duena, ayudante, clientaA, clientaB;
test('preparación: dueña y ayudante con MFA; dos clientas con un pedido cada una', async () => {
  duena = await cuentaPanel('duena');
  ayudante = await cuentaPanel('ayudante');
  clientaA = await sesionClienta(nuevoCorreo('a'));
  clientaB = await sesionClienta(nuevoCorreo('b'));
  for (const c of [clientaA, clientaB]) {
    const v = await skuCon(1);
    const p = await fn('pedidos-crear', cuerpoPedido(v, { metodo: 'transferencia' }), { token: c.token });
    assert.equal(p.status, 200, JSON.stringify(p.datos));
    c.folio = p.datos.folio;
    // La dueña aprueba su transferencia: pedido pagado y puntos ganados (filas en puntos_movimientos)
    const id = (await uno('select id from public.pedidos where folio = $1', [c.folio])).id;
    const ap = await fn('panel-pedidos', { accion: 'validar_transferencia', pedido: id, aprobar: true }, { token: duena.aal2 });
    assert.equal(ap.status, 200, JSON.stringify(ap.datos));
  }
  // Para que la matriz de S18 sea la misma en cualquier BD: al menos una fila en tablas que pueden estar vacías
  const idB = (await uno('select id from public.pedidos where folio = $1', [clientaB.folio])).id;
  await db.query(`insert into public.envios (pedido_id, proveedor) select $1, 'envia' where not exists (select 1 from public.envios)`, [idB]);
  await db.query(`insert into public.publicaciones_canal (variante_id, canal, id_externo_item, activo)
    select (select id from public.variantes order by sku limit 1), 'ml', 'MLM999999999', false where not exists (select 1 from public.publicaciones_canal)`);
});

// ------------------------------------------------------------------------------------------- S4
test('S4 · cron-conciliar sin secreto o con secreto equivocado → rechazado; con el bueno → 200', async () => {
  const cron = (h) => fetch(`${API}/functions/v1/cron-conciliar`, { method: 'POST', headers: h }).then((r) => r.status);
  assert.ok([401, 403].includes(await cron({})), 'sin secreto');
  assert.ok([401, 403].includes(await cron({ 'x-cron-secret': 'adivinado' })), 'secreto equivocado');
  assert.ok([401, 403].includes(await cron({ 'x-cron-secret': CRON + 'x' })), 'casi igual');
  assert.ok([401, 403].includes(await cron({ Authorization: `Bearer ${PUB}` })), 'la llave pública no sirve');
  assert.equal(await cron({ 'x-cron-secret': CRON }), 200);
});

// ------------------------------------------------------------------------------------------- S6
test('S6 · la ayudante llama directo a panel-stock y panel-catalogo (acciones de dueña) → 403; r2-firmar no es de dueña', async () => {
  const s = await skuCon(1);
  for (const [f, c] of [
    ['panel-stock', { accion: 'previsualizar', filas: [{ sku: s.sku, nuevo: 99 }] }],
    ['panel-stock', { accion: 'aplicar', lote: randomUUID(), motivo: 'ajuste', filas: [{ sku: s.sku, nuevo: 99 }] }],
    ['panel-catalogo', { accion: 'revisar', filas: [['marca'], ['x']] }],
    ['panel-catalogo', { accion: 'aplicar', filas: [['marca'], ['x']] }],
  ]) assert.equal((await llamar(f, c, { token: ayudante.aal2 })).status, 403, `${f} ${c.accion}`);
  // r2-firmar es de dueña y ayudante (subir fotos/comprobantes); sin R2 configurado responde 503, nunca 200
  const r2 = await llamar('r2-firmar', { accion: 'firmar' }, { token: ayudante.aal2 });
  assert.notEqual(r2.status, 200, r2.texto);
});

// ------------------------------------------------------------------------------------------- S7
test('S7 · una sesión de clienta llamando a cualquier función panel-* y a envios-guia → 401/403', async () => {
  const pedido = (await uno('select id from public.pedidos where folio = $1', [clientaA.folio])).id;
  for (const [f, c] of [
    ['panel-pedidos', { accion: 'estado', pedido, nuevo: 'entregado' }], ['panel-pedidos', { accion: 'validar_transferencia', pedido, aprobar: true }],
    ['panel-pedidos', { accion: 'reembolsar', pedido }], ['panel-stock', { accion: 'previsualizar', filas: [{ sku: 'X-1', nuevo: 1 }] }],
    ['panel-catalogo', { accion: 'revisar', filas: [['marca']] }], ['panel-ml', { accion: 'estado' }], ['panel-tiktok', { accion: 'estado' }],
    ['envios-guia', { accion: 'generar', pedido }], ['r2-firmar', { accion: 'firmar' }],
  ]) {
    const r = await llamar(f, c, { token: clientaA.token });
    assert.ok([401, 403].includes(r.status), `${f} ${c.accion}: ${r.status} ${r.texto}`);
  }
  // Con aal2 falso en un token inventado tampoco (firma inválida)
  const falso = clientaA.token.split('.').slice(0, 2).join('.') + '.firma';
  assert.equal((await llamar('panel-ml', { accion: 'estado' }, { token: falso })).status, 401);
});

// ------------------------------------------------------------------------------------------- S8
test('S8 · pedidos-crear con cuenta_id, clienta_id o puntos de otra persona: se rechaza o se ignora; manda el token', async () => {
  const v = await skuCon(1);
  const ajena = (await uno('select id from public.clientas where auth_user_id = $1', [clientaB.id])).id;
  // Campos que el navegador no debe mandar: el esquema los descarta y el servidor pone los suyos
  for (const extra of [{ cuenta_id: clientaB.id }, { clienta_id: ajena }]) {
    const r = await fn('pedidos-crear', { ...cuerpoPedido(v), ...extra }, { token: clientaA.token });
    assert.ok([200, 400].includes(r.status), `${Object.keys(extra)[0]}: ${JSON.stringify(r.datos)}`);
    if (r.status === 200) {
      const p = await uno('select cuenta_id, clienta_id from public.pedidos where folio = $1', [r.datos.folio]);
      assert.equal(p.cuenta_id, clientaA.id, `${Object.keys(extra)[0]}: la cuenta la pone el token`);
      assert.notEqual(p.clienta_id, ajena, `${Object.keys(extra)[0]}: la clienta no es la que mandó el navegador`);
    }
  }
  // Puntos sin sesión → 401
  const sin = await fn('pedidos-crear', { ...cuerpoPedido(v), puntos: 10 });
  assert.equal(sin.status, 401, JSON.stringify(sin.datos));
  // Con la sesión de A, el pedido queda en la cuenta de A (aunque el correo de contacto sea el de B)
  const c = cuerpoPedido(v); c.contacto.correo = clientaB.correo;
  const r = await fn('pedidos-crear', c, { token: clientaA.token });
  assert.equal(r.status, 200, JSON.stringify(r.datos));
  const p = await uno('select cuenta_id, cuenta_ligada_por from public.pedidos where folio = $1', [r.datos.folio]);
  assert.equal(p.cuenta_id, clientaA.id);
  assert.equal(p.cuenta_ligada_por, 'sesion');
  // Puntos de más que el saldo de A → rechazado
  const mas = await fn('pedidos-crear', { ...cuerpoPedido(v), puntos: 99_999 }, { token: clientaA.token });
  assert.ok([400, 409].includes(mas.status), JSON.stringify(mas.datos));
});

// ------------------------------------------------------------------------------------------ S10
test('S10 · enumerar correos: pedir código para un correo existente o nuevo responde igual', async () => {
  const otp = (email) => fetch(`${API}/auth/v1/otp`, { method: 'POST', headers: { apikey: PUB, 'content-type': 'application/json' },
    body: JSON.stringify({ email, create_user: true, gotrue_meta_security: { captcha_token: TURNSTILE } }) }).then(async (r) => [r.status, await r.text()]);
  const correo = nuevoCorreo('existe');
  await admin.auth.admin.createUser({ email: correo, email_confirm: true });   // cuenta que ya existe y no ha pedido código
  const existente = await otp(correo);
  const nuevo = await otp(nuevoCorreo('nunca'));
  assert.deepEqual(existente, nuevo, 'misma respuesta (código y cuerpo)');
});

// ------------------------------------------------------------------------------------------ S11
test('S11 · acaparar inventario rotando teléfonos desde una IP: el límite por IP corta en 15 pedidos cada 10 min', async (t) => {
  const ip = nuevaIp();
  const v = await skuCon(1);
  await db.query(`select public.mover_stock((select id from public.variantes where sku = $1), 30, 'ajuste', $2, 'panel')`, [v.sku, `ci:${randomUUID()}`]);
  const folios = [];
  let primero429 = null;
  for (let i = 0; i < 18 && primero429 === null; i++) {
    const r = await fn('pedidos-crear', cuerpoPedido(v, { metodo: 'transferencia', tel: nuevoTel() }), { ip });
    if (r.status === 200) folios.push(r.datos.folio);
    else if (r.status === 429) primero429 = i + 1;
    else assert.fail(`${r.status} ${JSON.stringify(r.datos)}`);
  }
  t.diagnostic(`pedidos aceptados desde una IP: ${folios.length}; primer 429 en el intento ${primero429}; con 10 pares por pedido serían ${folios.length * 10} pares apartados 24 h (transferencia) o 30 min (tarjeta)`);
  assert.equal(folios.length, 15, 'el límite por IP es 15');
  assert.equal(primero429, 16);
  // Se liberan los apartados de la prueba (vencen y los libera el cron real)
  await db.query(`update public.reservas_stock set expira_en = now() - interval '1 second' where estado = 'activa' and pedido_id in (select id from public.pedidos where folio = any($1))`, [folios]);
  await fetch(`${API}/functions/v1/cron-conciliar`, { method: 'POST', headers: { 'x-cron-secret': CRON } });
});

// ------------------------------------------------------------------------------------------ S12
// H16: el token sigue sirviendo hasta que vence (1 h): las funciones solo validan la firma (getClaims) y RLS no mira
// si la sesión existe. `todo` mientras siga abierto (arreglo propuesto en fix/H16-sesion-cerrada).
test('S12 · H16 · token de sesión del panel usado después de cerrar sesión: ya no sirve', { todo: 'H16 abierto: el token del panel sirve hasta que vence aunque se cierre la sesión' }, async (t) => {
  const c = await cuentaPanel('duena');
  assert.equal((await llamar('panel-ml', { accion: 'estado' }, { token: c.aal2 })).status, 200, 'antes de salir sirve');
  const cli = createClient(API, PUB, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${c.aal2}` } } });
  const r = await fetch(`${API}/auth/v1/logout?scope=global`, { method: 'POST', headers: { apikey: PUB, Authorization: `Bearer ${c.aal2}` } });
  assert.ok([200, 204].includes(r.status), `logout ${r.status}`);
  const fx = await llamar('panel-ml', { accion: 'estado' }, { token: c.aal2 });
  const rest = await fetch(`${API}/rest/v1/pedidos?select=id&limit=1`, { headers: { apikey: PUB, Authorization: `Bearer ${c.aal2}` } });
  const filas = rest.ok ? (await rest.json()).length : 0;
  t.diagnostic(`después de cerrar sesión: Edge Function ${fx.status}, REST ${rest.status} con ${filas} filas`);
  void cli;
  assert.equal(fx.status, 401, 'la Edge Function ya no acepta el token');
  assert.ok(rest.status === 401 || filas === 0, 'la API REST ya no devuelve datos con ese token');
});

// ------------------------------------------------------------------------------------------ S13
test('S13 · cabeceras del build: CSP sin unsafe-inline en scripts, HSTS, anti-iframe y Permissions-Policy en todas las rutas', () => {
  const f = existsSync('dist/_headers') ? 'dist/_headers' : 'public/_headers';
  const h = readFileSync(f, 'utf8');
  const bloque = h.split(/\n(?=\/)/).find((b) => b.startsWith('/*'));
  assert.ok(bloque, `${f}: falta el bloque /* (todas las rutas)`);
  const csp = /Content-Security-Policy:\s*(.+)/.exec(bloque)?.[1] ?? '';
  const scriptSrc = /script-src([^;]*)/.exec(csp)?.[1] ?? '';
  assert.ok(csp, 'hay CSP');
  assert.ok(!/'unsafe-inline'|'unsafe-eval'/.test(scriptSrc), `script-src sin unsafe-inline/unsafe-eval: ${scriptSrc}`);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(bloque, /Strict-Transport-Security: max-age=\d{8,}/);
  assert.match(bloque, /X-Frame-Options: DENY/);
  assert.match(bloque, /Permissions-Policy: .*camera=\(self\).*geolocation=\(\)/);
  assert.match(bloque, /X-Content-Type-Options: nosniff/);
});

// ------------------------------------------------------------------------------------------ S14
test('S14 · ni en dist/ ni en el historial de git hay llaves secretas, tokens ni la CLABE real', () => {
  const PATRONES = [/sb_secret_[A-Za-z0-9_-]{10,}/, /APP_USR-[0-9a-f-]{20,}/, /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
    /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJ[A-Za-z0-9_-]*cm9sZSI6InNlcnZpY2Vfcm9sZ/];
  const clabe = process.env.CLABE_REAL;   // la real no se escribe en el repo; si se conoce, se pasa por variable
  if (existsSync('dist')) {
    const archivos = [];
    const recorrer = (d) => { for (const x of readdirSync(d)) { const p = join(d, x); if (statSync(p).isDirectory()) recorrer(p); else if (/\.(js|html|css|json|txt|map)$/.test(x)) archivos.push(p); } };
    recorrer('dist');
    for (const a of archivos) {
      const t = readFileSync(a, 'utf8');
      for (const re of PATRONES) assert.ok(!re.test(t), `${a} contiene ${re}`);
      if (clabe) assert.ok(!t.includes(clabe), `${a} contiene la CLABE`);
    }
  }
  const historia = execFileSync('git', ['log', '--all', '-p', '--no-color', '--', '.', ':(exclude)package-lock.json'], { encoding: 'utf8', maxBuffer: 1 << 30 });
  for (const re of PATRONES) {
    const m = re.exec(historia);
    assert.ok(!m || /sb_secret_…|sb_secret_\.\.\.|sb_secret_x|sb_secret_xxx/i.test(m[0]), `historial de git: ${m?.[0]?.slice(0, 40)}`);
  }
  if (clabe) assert.ok(!historia.includes(clabe), 'historial de git: CLABE real');
});

// ------------------------------------------------------------------------------------------ S15
test('S15 · registros de las funciones tras compras completas: sin correos, teléfonos, direcciones ni tokens', { skip: !existsSync('.pruebas/logs/funciones.log') && 'sin .pruebas/logs/funciones.log' }, async () => {
  // Compra completa con datos reconocibles
  const v = await skuCon(1);
  const c = cuerpoPedido(v, { tel: '5577665544' });
  c.contacto = { nombre: 'Rastro Prueba', telefono: '5577665544', correo: 'rastro.s15@prueba.mx' };
  const p = await fn('pedidos-crear', c);
  assert.equal(p.status, 200, JSON.stringify(p.datos));
  await pagarEnSim(p.datos.url_pago, 'approved');
  await new Promise((r) => setTimeout(r, 2500));
  const log = readFileSync('.pruebas/logs/funciones.log', 'utf8');
  for (const [que, re] of [['correo', /rastro\.s15@prueba\.mx/], ['teléfono', /5577665544/], ['nombre', /Rastro Prueba/],
    ['token de rastreo', new RegExp(p.datos.token)], ['Bearer', /Bearer\s+ey[A-Za-z0-9_-]{20,}/], ['token de MP', /APP_USR-[0-9a-f-]{20,}|TEST-local/],
    ['llave secreta', /sb_secret_[A-Za-z0-9_-]{10,}/], ['Av. Reforma (domicilio)', /Av\. Reforma 222/]]) {
    assert.ok(!re.test(log), `el registro de funciones contiene ${que}`);
  }
});

// ------------------------------------------------------------------------------------------ S16
test('S16 · avisos y pedidos con cuerpo gigante o JSON roto: 4xx rápido y la función sigue viva', async () => {
  const gigante = 'x'.repeat(3 * 1024 * 1024);
  for (const f of ['webhook-mercadopago?data.id=1&type=payment', 'webhook-mercadolibre', 'webhook-tiktok', 'webhook-envia', 'pedidos-crear']) {
    for (const [que, cuerpo] of [['gigante', JSON.stringify({ relleno: gigante })], ['JSON roto', '{"a": [1, 2,']]) {
      const t0 = Date.now();
      const r = await fetch(`${API}/functions/v1/${f}`, { method: 'POST', headers: { 'content-type': 'application/json', apikey: PUB, Origin: 'http://localhost:5173', 'cf-connecting-ip': nuevaIp() }, body: cuerpo });
      const ms = Date.now() - t0;
      assert.ok(r.status >= 400 && r.status < 500 || (f.startsWith('webhook-mercadolibre') && r.status === 200) || (f.startsWith('webhook-tiktok') && r.status === 401),
        `${f} ${que}: ${r.status}`);
      assert.ok(ms < 5000, `${f} ${que}: ${ms} ms`);
    }
  }
  const salud = await fetch(`${API}/functions/v1/salud`);
  assert.equal(salud.status, 200, 'las funciones siguen vivas');
});

// ------------------------------------------------------------------------------------------ S17
test('S17 · rastreo por folio: el 6.º intento se bloquea y el bloqueo es por folio (no por IP)', async () => {
  const v = await skuCon(1);
  const p = await fn('pedidos-crear', cuerpoPedido(v, { metodo: 'transferencia' }));
  const folio = p.datos.folio;
  const intento = (f, ip) => fn('pedidos-rastrear', { folio: f, tel4: '0000', turnstile: TURNSTILE }, { ip });
  const estados = [];
  for (let i = 0; i < 6; i++) estados.push((await intento(folio, nuevaIp())).status);   // cada intento desde otra IP
  assert.deepEqual(estados.slice(0, 5).every((s) => s === 404 || s === 400 || s === 403), true, `los 5 primeros fallan normal: ${estados}`);
  assert.equal(estados[5], 429, `el 6.º se bloquea aunque cambie la IP: ${estados}`);
  // Otro folio desde la misma IP del último intento no está bloqueado
  const otro = await fn('pedidos-crear', cuerpoPedido(v, { metodo: 'transferencia' }));
  const r = await intento(otro.datos.folio, nuevaIp());
  assert.notEqual(r.status, 429, 'otro folio no hereda el bloqueo');
});

// ------------------------------------------------------------------------------------------ S18
// Matriz esperada (revisada a mano el 20 nov 2026, ver reporte F3). Si aparece una tabla o vista nueva en `public`,
// o cambia lo que alguna identidad puede hacer, esta prueba falla y hay que revisarla a propósito.
const ESPERADO = JSON.parse(readFileSync(new URL('./_rls-esperado.json', import.meta.url), 'utf8'));
test('S18 · RLS tabla por tabla con anónimo, clienta, ayudante y dueña (aal2): coincide con la matriz revisada', async (t) => {
  // Los claims salen del token real de cada una (incluye session_id: el panel exige sesión viva, H16)
  const claimsDe = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  const real = await matrizRls({
    anonimo: { rol: 'anon', claims: { role: 'anon' } },
    clienta: { rol: 'authenticated', claims: claimsDe(clientaA.token) },
    ayudante: { rol: 'authenticated', claims: claimsDe(ayudante.aal2) },
    duena: { rol: 'authenticated', claims: claimsDe(duena.aal2) },
    duena_sin_mfa: { rol: 'authenticated', claims: claimsDe(duena.aal1) },
  });
  if (process.env.RLS_SALIDA) writeFileSync(process.env.RLS_SALIDA, JSON.stringify(real, null, 2) + '\n');
  void t;
  assert.deepEqual(Object.keys(real).sort(), Object.keys(ESPERADO).sort(), 'tablas y vistas de public (¿una nueva sin revisar?)');
  for (const tabla of Object.keys(ESPERADO)) assert.deepEqual(real[tabla], ESPERADO[tabla], `RLS de ${tabla}`);
});

test('S18 · funciones que anon/authenticated pueden ejecutar por RPC: solo las de la lista revisada', async (t) => {
  const reales = await funcionesExpuestas();
  if (process.env.RLS_SALIDA) writeFileSync(process.env.RLS_SALIDA.replace(/\.json$/, '-rpc.json'), JSON.stringify(reales, null, 2) + '\n');
  void t;
  const lista = JSON.parse(readFileSync(new URL('./_rpc-esperado.json', import.meta.url), 'utf8'));
  assert.deepEqual(reales, lista);
});
