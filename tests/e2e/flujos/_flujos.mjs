// Apoyo de los flujos de personas reales (docs/PLAN-PRUEBAS.md §4 y §7, prioridad 1). No es un spec.
// Corren contra el entorno de `bash scripts/entorno-pruebas.sh`: Supabase local, Edge Functions con los
// simuladores de Mercado Pago (:8090) y Envia (:8091), Mailpit y la tienda en :5173.
// Las llaves salen de las variables que exporta ese script o, si se corre a mano, de `supabase status -o env`.
import { execSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { expect } from '../_apoyo.mjs';

function llaves() {
  let pub = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.PUBLISHABLE_KEY;
  let sec = process.env.SUPABASE_SECRET_KEY || process.env.SECRET_KEY;
  if (!pub || !sec) {
    const env = Object.fromEntries(execSync('supabase status -o env', { encoding: 'utf8' })
      .split('\n').map((l) => /^(\w+)="?(.*?)"?$/.exec(l)).filter(Boolean).map((m) => [m[1], m[2]]));
    pub ||= env.PUBLISHABLE_KEY || env.ANON_KEY;
    sec ||= env.SECRET_KEY || env.SERVICE_ROLE_KEY;
  }
  return { pub, sec };
}
export const API = (process.env.SUPABASE_URL || 'http://127.0.0.1:55321').replace(/\/$/, '');
export const { pub: PUB, sec: SEC } = llaves();
export const SIM_MP = 'http://127.0.0.1:8090';
export const SIM_ENVIA = 'http://127.0.0.1:8091';
/** Página de pago del simulador (su init_point usa el host con que lo llamó la Edge Function). */
export const PAGINA_MP = /^http:\/\/(127\.0\.0\.1|host\.docker\.internal):8090\/checkout\?pref=/;
export const MAILPIT = (process.env.MAILPIT_URL || 'http://127.0.0.1:55324').replace(/\/$/, '');
export const TURNSTILE = 'XXXX.DUMMY.TOKEN.XXXX';
const DB = process.env.DB_URL || 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';

// ------------------------------------------------------------------------------------------- BD
let cliente = null;
async function bd() {
  if (!cliente) { cliente = new pg.Client({ connectionString: DB }); await cliente.connect(); }
  return cliente;
}
export const sql = async (q, args = []) => (await (await bd()).query(q, args)).rows;
export const uno = async (q, args = []) => (await sql(q, args))[0];
export async function cerrarBd() { if (cliente) { await cliente.end(); cliente = null; } }

/**
 * El navegador de las pruebas llega a las Edge Functions siempre con la misma IP (la puerta de Docker,
 * 192.168.65.x / 172.x). Los flujos crean muchos pedidos seguidos y toparían el límite por IP
 * (pedidos-crear: 15 cada 10 min), que no es lo que prueban (lo cubre tests/seguridad/fase3).
 * Se borra solo el contador de esas IPs locales; las pruebas de seguridad usan IPs 10.x propias.
 */
export const reiniciarLimitesLocales = () =>
  sql(`delete from privado.limites_tasa where clave ~ '^ip:(192\\.168\\.|172\\.|desconocida)'`);

export const stockDe = (sku) => uno('select stock, stock_reservado from public.variantes where sku = $1', [sku]);
export const pedidoPorFolio = (folio) => uno(
  `select id, folio, estado, pago_estado, total, subtotal, envio, metodo_pago, token_rastreo, clienta_id, cuenta_id, puntos_usados, descuento
     from public.pedidos where folio = $1`, [folio]);
export const pedidoPorToken = (token) => uno('select id, folio, estado, pago_estado, total, token_rastreo from public.pedidos where token_rastreo = $1', [token]);

/** Teléfono único por prueba (el límite de 3 pedidos sin pagar es por teléfono). */
let telN = 0;
export const nuevoTel = () => `56${String(Date.now()).slice(-6)}${String(++telN % 100).padStart(2, '0')}`;
export const nuevoCorreo = (p) => `e2e-${p}-${randomUUID().slice(0, 8)}@prueba.mx`;

/**
 * Repone (con mover_stock 'ajuste', como un conteo de la dueña: la bitácora sigue cuadrando, I2) los lentes
 * sin graduación de la duración por defecto que tengan menos de `minimo` pares disponibles. Las compras de
 * las pruebas consumen stock; así cada archivo empieza con piezas. No toca las variantes preparadas por
 * scripts/entorno-pruebas.sh (stock 0 / 1 / 25, ref 'pruebas:fase0:…').
 */
export async function surtirLentes(minimo = 6) {
  const filas = await sql(
    `select v.id, v.sku, v.stock - v.stock_reservado as disp
       from public.variantes v join public.productos p on p.id = v.producto_id join public.tonos t on t.id = v.tono_id
      where v.activo and p.activo and t.activo and p.tipo = 'lente' and v.graduacion is null
        and v.stock - v.stock_reservado < $1
        and not exists (select 1 from public.movimientos_stock m where m.variante_id = v.id and m.ref_externa like 'pruebas:fase0:%')`, [minimo]);
  for (const f of filas) await sql('select public.mover_stock($1, $2, $3, $4)', [f.id, minimo - f.disp, 'ajuste', `e2e:surtir:${f.sku}:${Date.now()}`]);
  return filas.length;
}

/** Lente sin graduación con al menos `n` pares disponibles cuyo tono no tenga ninguna variante preparada (0/1/25). */
export async function lenteCon(n = 1, excluir = []) {
  const filas = await sql(
    `select v.sku, v.precio, v.duracion, t.nombre as tono, t.slug
       from public.variantes v join public.productos p on p.id = v.producto_id join public.tonos t on t.id = v.tono_id
      where v.activo and p.activo and t.activo and p.tipo = 'lente' and v.graduacion is null
        and v.stock - v.stock_reservado >= $1 and v.stock - v.stock_reservado < 25
        and coalesce(v.duracion, '') = coalesce((select v2.duracion from public.variantes v2 where v2.tono_id = v.tono_id and v2.activo
          order by array_position(array['trimestral','semestral','anual'], v2.duracion) desc nulls last limit 1), '')
      order by v.stock - v.stock_reservado desc, t.nombre`, [n]);
  const f = filas.find((x) => !excluir.includes(x.sku));
  if (!f) throw new Error('no hay lentes con stock para la prueba');
  return { ...f, precio: Number(f.precio) };
}

// --------------------------------------------------------------------------------- regla I4 / I7
/** I4: pedido pagado ⇒ pago aprobado por el total en MXN. */
export async function pagoCuadra(pedidoId) {
  const p = await uno('select total, pago_estado from public.pedidos where id = $1', [pedidoId]);
  const g = await sql(`select monto, moneda, estado from public.pagos where pedido_id = $1 and estado in ('approved','aprobado')`, [pedidoId]);
  expect(p.pago_estado, 'I4: pago aprobado').toBe('aprobado');
  expect(g.some((x) => Number(x.monto) === Number(p.total) && x.moneda === 'MXN'), 'I4: un pago aprobado por el total en MXN').toBe(true);
}

// --------------------------------------------------------------------------------- navegador
/**
 * Las Edge Functions (en Docker) llaman a los simuladores por host.docker.internal y el simulador de
 * Mercado Pago arma su init_point con ese mismo host, que el navegador de la Mac no resuelve.
 * Se reenvía a 127.0.0.1 sin tocar la respuesta (los 303 de regreso a la tienda pasan tal cual).
 */
export async function simuladoresAlcanzables(context) {
  await reiniciarLimitesLocales();
  await surtirLentes();   // antes de cada prueba (con un solo worker, varios archivos comparten proceso)
  await context.route(/^http:\/\/host\.docker\.internal:(8090|8091)\//, async (route) => {
    const url = route.request().url().replace('host.docker.internal', '127.0.0.1');
    const r = await route.fetch({ url, maxRedirects: 0 });
    const destino = r.status() >= 300 && r.status() < 400 ? r.headers().location : null;
    // WebKit no deja responder un 3xx desde route.fulfill: en ese navegador se hace la misma redirección con HTML.
    if (destino && route.request().frame().page().context().browser()?.browserType().name() === 'webkit') {
      await route.fulfill({ status: 200, contentType: 'text/html', body: `<meta http-equiv="refresh" content="0;url=${destino.replace(/"/g, '&quot;')}">` });
    } else {
      await route.fulfill({ response: r });
    }
  });
  // La etiqueta de la guía del simulador de Envia es una URL que no existe (example.invalid): se sirve un PDF vacío.
  await context.route(/^https:\/\/example\.invalid\/envia-simulado\//, (route) =>
    route.fulfill({ status: 200, contentType: 'text/plain', body: 'etiqueta simulada' }));
}

/** Agrega a la bolsa el tono `nombre` (ficha → sin graduación → duración más larga, la de por defecto). */
export async function agregarDesdeFicha(page, nombre) {
  await page.goto('/tienda');
  await expect(page.getByText('Cargando catálogo…')).toBeHidden();
  await page.locator('button.card', { hasText: nombre }).first().click();
  const ficha = page.getByRole('dialog');
  await expect(ficha.getByRole('heading', { name: nombre })).toBeVisible();
  const sin = ficha.getByRole('button', { name: 'Sin graduación' });
  if (await sin.isEnabled()) await sin.click();
  await ficha.getByRole('button', { name: /Agregar a la bolsa/ }).click();
  await expect(page.getByRole('dialog', { name: /Tu bolsa/ })).toBeVisible();
}

/** Lo que guarda la bolsa en el navegador (zustand persist 'ago-v4'). */
export const bolsaGuardada = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ago-v4') || '{}').state?.bolsa || []);

/** Paso 1 de la caja: datos de contacto. */
export async function llenarContacto(page, { nombre = 'Prueba E2E', telefono, correo = '' }) {
  await expect(page.getByRole('heading', { name: /entregamos/ })).toBeVisible();
  await page.getByLabel('Nombre completo').fill(nombre);
  await page.getByLabel('WhatsApp (10 dígitos)').fill(telefono);
  if (correo) await page.getByLabel(/Correo/).fill(correo);
  await page.getByRole('button', { name: 'Continuar' }).click();
}

/** Espera a que Turnstile (llave de prueba de Cloudflare, siempre aprueba) habilite el botón. */
export async function esperarBoton(page, nombre, timeout = 20_000) {
  const b = page.getByRole('button', { name: nombre });
  await expect(b).toBeEnabled({ timeout });
  return b;
}

/** Folio y token del pedido a partir de la URL /pedido/<token>. */
export async function pedidoDeLaUrl(page) {
  await page.waitForURL(/\/pedido\/[0-9a-f]{64}/, { timeout: 20_000 });
  const token = new URL(page.url()).pathname.split('/').pop();
  expect(token, 'la URL trae el token de rastreo').toMatch(/^[0-9a-f]{64}$/);
  return pedidoPorToken(token);
}

// ------------------------------------------------------------------------------- panel con MFA
function base32(s) {
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
/** Un código que NO es el vigente (para probar el rechazo). */
export const totpEquivocado = (secreto) => String((Number(totp(secreto)) + 500000) % 1e6).padStart(6, '0');

export const admin = createClient(API, SEC, { auth: { persistSession: false, autoRefreshToken: false } });

/** Cuenta de panel nueva como la crea `scripts/cuentas-panel.mjs`: contraseña temporal, sin MFA todavía. */
export async function cuentaPanelNueva(rol) {
  const correo = nuevoCorreo(rol), clave = `E2e-${randomUUID()}`;
  const { data: u, error } = await admin.auth.admin.createUser({ email: correo, password: clave, email_confirm: true });
  if (error) throw error;
  await sql('insert into public.perfiles_panel (user_id, rol) values ($1, $2)', [u.user.id, rol]);
  return { correo, clave, id: u.user.id };
}

/**
 * Entra al panel por la pantalla: contraseña → alta del MFA (la primera vez) o código.
 * Devuelve el secreto TOTP para volver a entrar.
 */
export async function entrarPanel(page, { correo, clave, secreto = null }) {
  await page.goto('/panel');
  await expect(page.getByRole('heading', { name: 'Hola de nuevo' })).toBeVisible();
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(clave);
  await (await esperarBoton(page, 'Entrar al panel')).click();
  if (!secreto) {
    await expect(page.getByRole('heading', { name: 'Protege tu cuenta' })).toBeVisible();
    await page.getByText('¿No puedes escanear? Escribe esta clave').click();
    secreto = (await page.locator('.acceso-clave code').innerText()).trim();
    await page.getByLabel('Código de 6 dígitos').fill(totp(secreto));
    await page.getByRole('button', { name: 'Activar y entrar' }).click();
  } else {
    await expect(page.getByRole('heading', { name: 'Tu código' })).toBeVisible();
    await page.getByLabel('Código de 6 dígitos').fill(totp(secreto));
    await page.getByRole('button', { name: 'Verificar' }).click();
  }
  await expect(page.getByRole('heading', { name: /equipo AGO/ })).toBeVisible();
  return secreto;
}

/** Abre un pedido en Panel → Pedidos (filtro "Todos") por su folio. */
export async function abrirPedidoEnPanel(page, folio) {
  await page.goto('/panel/pedidos?e=todos');
  await page.getByPlaceholder('Nombre, folio o teléfono').fill(folio);
  await page.locator('button.order', { hasText: folio }).click();
  const m = page.getByRole('dialog');
  await expect(m.getByText(folio)).toBeVisible();
  return m;
}

// ------------------------------------------------------------------------------- clienta
const buscarCorreos = async (correo) => (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${correo}"`)}`)).json()).messages ?? [];
/** Ids de los correos que ya tiene Mailpit para esa dirección (para reconocer el siguiente). */
export const correosPrevios = async (correo) => new Set((await buscarCorreos(correo)).map((m) => m.ID));
/** Código de 6 dígitos del primer correo nuevo (que no esté en `previos`). No usa la hora: el reloj de Docker puede ir desfasado. */
export async function codigoDeMailpit(correo, previos = new Set()) {
  for (let i = 0; i < 40; i++) {
    const m0 = (await buscarCorreos(correo)).find((m) => !previos.has(m.ID));
    if (m0) {
      const m = await (await fetch(`${MAILPIT}/api/v1/message/${m0.ID}`)).json();
      const c = /\b(\d{6})\b/.exec(m.Text || m.HTML || '');
      if (c) return c[1];
    }
    await new Promise((ok) => setTimeout(ok, 500));
  }
  throw new Error(`no llegó a Mailpit el código para ${correo}`);
}

// ------------------------------------------------------------------------- pedidos por la API
// Para los casos del panel se prepara el pedido como lo haría la tienda (mismas Edge Functions),
// sin repetir la caja en el navegador (eso lo cubre a1).
const FUNC = `${API}/functions/v1`;
let ipN = 0;
const ipPrueba = () => `10.250.${Math.floor(++ipN / 250) % 250}.${ipN % 250}`;   // IP propia: no topa el límite del navegador
export async function fn(nombre, cuerpo, { token } = {}) {
  const r = await fetch(`${FUNC}/${nombre}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: PUB, Origin: 'http://localhost:5173', 'cf-connecting-ip': ipPrueba(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(cuerpo),
  });
  let datos = null;
  try { datos = await r.json(); } catch { /* sin cuerpo */ }
  return { status: r.status, datos };
}
export const DIR_PAQ = { calle: 'Av. Reforma', numero: '222', colonia: 'Juárez', ciudad: 'Cuauhtémoc', estado: 'Ciudad de México', cp: '06600' };

/** Pedido nuevo (por defecto Metro Pantitlán, $0 de envío). `paqueteria: true` cotiza con Envia simulado. */
export async function crearPedidoApi({ sku, precio }, { metodo = 'mercadopago', tel = nuevoTel(), correo = 'e2e@prueba.mx', paqueteria = false, cantidad = 1, token, puntos } = {}) {
  let entrega = { tipo: 'metro', zona: 'Pantitlán', cita: 'Metro Pantitlán · sáb 15:30' }, envio = 0;
  if (paqueteria) {
    const c = await fn('envios-cotizar', { items: [{ sku, cantidad }], destino: { cp: DIR_PAQ.cp, ciudad: DIR_PAQ.ciudad, estado: DIR_PAQ.estado, colonia: DIR_PAQ.colonia }, turnstile: TURNSTILE });
    expect(c.status, JSON.stringify(c.datos)).toBe(200);
    const o = c.datos.opciones[0];
    envio = Number(o.precio);
    entrega = { tipo: 'paqueteria', zona: 'Paquetería', cotizacion: o.id, direccion_envio: DIR_PAQ, direccion: 'Av. Reforma 222, Juárez, Cuauhtémoc, CDMX, CP 06600' };
  }
  const cuerpo = {
    clave_idempotencia: randomUUID(), metodo_pago: metodo, items: [{ sku, cantidad }], entrega,
    contacto: { nombre: 'Clienta E2E', telefono: tel, correo }, total_visto: Math.round((precio * cantidad + envio) * 100) / 100, turnstile: TURNSTILE,
    ...(puntos ? { puntos } : {}),
  };
  let r = await fn('pedidos-crear', cuerpo, { token });
  if (r.status === 409 && r.datos?.error === 'total_cambio') r = await fn('pedidos-crear', { ...cuerpo, total_visto: r.datos.total }, { token });
  expect(r.status, JSON.stringify(r.datos)).toBe(200);
  return r.datos;   // { folio, token, url_pago?, total, … }
}

/** Paga en el simulador de Mercado Pago (como la clienta en su página) y espera a que el webhook lo deje pagado. */
export async function pagarConTarjeta(urlPago) {
  const pref = new URL(urlPago).searchParams.get('pref');
  const r = await fetch(`${SIM_MP}/simular`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pref, status: 'approved' }) });
  expect(r.status).toBe(303);
  const ped = await uno('select id from public.pedidos where mp_preferencia_id = $1', [pref]);
  await expect.poll(async () => (await uno('select estado from public.pedidos where id = $1', [ped.id])).estado, { timeout: 20_000 }).toBe('pagado');
  return ped.id;
}

/** Cambia el estado de una guía en el simulador de Envia (manda el webhook). */
export const rastreoEnvia = (trackingNumber, status) => fetch(`${SIM_ENVIA}/simular/rastreo`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ trackingNumber, status }),
}).then((r) => r.json());

/** Corre el cron de conciliación como lo hace pg_cron cada 10 min (libera apartados vencidos, etc.). */
export async function correrCron() {
  const r = await fetch(`${FUNC}/cron-conciliar`, { method: 'POST', headers: { 'x-cron-secret': process.env.CRON_SECRET_PRUEBAS || 'cron-local-solo-desarrollo', 'content-type': 'application/json' }, body: '{}' });
  expect(r.status, await r.text()).toBe(200);
}
/**
 * Hace que el apartado de un pedido "ya haya vencido" (simula que pasó el tiempo: 30 min, 24 h o 72 h).
 * Solo mueve la fecha límite (pedido y reservas); la liberación la hace el cron real.
 */
export async function vencerApartado(pedidoId) {
  await sql(`update public.pedidos set expira_reserva_en = now() - interval '1 minute' where id = $1`, [pedidoId]);
  await sql(`update public.reservas_stock set expira_en = now() - interval '1 minute' where pedido_id = $1 and estado = 'activa'`, [pedidoId]);
}

/** Lleva la caja hasta la página de pago de Mercado Pago con entrega en Metro (devuelve la preferencia). */
export async function cajaHastaMercadoPago(page, lente, tel) {
  await agregarDesdeFicha(page, lente.tono);
  await page.getByRole('button', { name: 'Elegir entrega' }).click();
  await llenarContacto(page, { telefono: tel });
  await page.getByRole('button', { name: /Entrega en Metro/ }).click();
  await page.getByRole('button', { name: 'Ir al pago' }).click();
  await (await esperarBoton(page, /Pagar .* con Mercado Pago/)).click();
  await expect(page).toHaveURL(PAGINA_MP);
  return new URL(page.url()).searchParams.get('pref');
}

/** Entra a /cuenta con el código que llega a Mailpit (primer envío para ese correo: no espera los 60 s). */
export async function entrarCuenta(page, correo) {
  await page.goto('/cuenta');
  await page.getByLabel('Tu correo').fill(correo);
  const previos = await correosPrevios(correo);
  await (await esperarBoton(page, /Enviarme el código/)).click();
  await expect(page.getByText(/^Te mandamos un código de 6 dígitos a /)).toBeVisible();
  await page.getByLabel('Código').fill(await codigoDeMailpit(correo, previos));
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: /Hola,/ })).toBeVisible();
}
/** Pedido de invitada YA PAGADO con ese correo (se liga a la cuenta al entrar). */
export async function compraPagadaDeInvitada(correo, opciones = {}) {
  const lente = opciones.lente ?? await lenteCon();
  const r = await crearPedidoApi(lente, { correo, ...opciones });
  await pagarConTarjeta(r.url_pago);
  return { ...r, lente };
}
export const saldoDe = async (correo) => Number((await uno(
  `select coalesce(sum(m.delta), 0) as s from public.puntos_movimientos m join public.clientas c on c.id = m.clienta_id where lower(c.correo) = lower($1)`, [correo]))?.s ?? 0);
