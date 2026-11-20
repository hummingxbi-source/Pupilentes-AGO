// Fase 8 · F2 · X8 — maratón: 30 compras seguidas mezclando métodos, entregas, puntos, panel y canales
// (docs/PLAN-PRUEBAS.md §5). Al final, scripts/revisar-reglas.mjs (I1–I8 + I2 contra una foto propia) y el estado
// esperado de cada pedido (I7). Es el "10 compras sin descuadre" de la Fase 3, ampliado.
//   node --test tests/integracion/maraton.mjs        (con el entorno de scripts/entorno-pruebas.sh arriba)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { API, PUB, SEC, CRON, TURNSTILE, db, fn, uno, stock, cuerpoPedido, pagarEnSim, simularPago, cuentaPanel } from '../seguridad/_comun.mjs';

const ML = (process.env.ML_SIM_URL || 'http://127.0.0.1:8092').replace(/\/$/, '');
const TT = (process.env.TT_SIM_URL || 'http://127.0.0.1:8093').replace(/\/$/, '');
const ENVIA = (process.env.ENVIA_SIM_URL || 'http://127.0.0.1:8091').replace(/\/$/, '');
const post = (url, cuerpo) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }).then((r) => r.json());
const cron = () => fetch(`${API}/functions/v1/cron-conciliar`, { method: 'POST', headers: { 'x-cron-secret': CRON } }).then((r) => r.status);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function esperar(cond, ms = 15_000) { const fin = Date.now() + ms; while (Date.now() < fin) { if (await cond()) return true; await espera(250); } return false; }
const FOTO = '.pruebas/maraton-foto.json';
const reglas = (...args) => spawnSync('node', ['scripts/revisar-reglas.mjs', ...args], { encoding: 'utf8', env: { ...process.env, REGLAS_FOTO: FOTO } });
const admin = createClient(API, SEC, { auth: { persistSession: false, autoRefreshToken: false } });

const DIR = { calle: 'Av. Reforma', numero: '222', colonia: 'Juárez', ciudad: 'Cuauhtémoc', estado: 'Ciudad de México', cp: '06600' };
const ML_SIMPLE = 'MLM100100', TT_PROD = '1730000000000000001', TT_SKU_A = '1730000000000000101';

let duena, cuenta, skus = [], skuMl, skuTt, n = 0;
const esperados = [];   // [folio, estado final esperado (uno o varios), escenario]
const estado = async (folio) => (await uno('select estado from public.pedidos where folio = $1', [folio])).estado;
const idDe = async (folio) => (await uno('select id from public.pedidos where folio = $1', [folio])).id;
const sigSku = () => skus[n++ % skus.length];
async function nuevo(v, opciones = {}, extra = {}) {
  const c = { ...cuerpoPedido(v, opciones), ...extra };
  const r = await fn('pedidos-crear', c, opciones.token ? { token: opciones.token } : {});
  assert.equal(r.status, 200, JSON.stringify(r.datos));
  return r.datos;
}
async function vencer(folio) {
  const id = await idDe(folio);
  await db.query(`update public.reservas_stock set expira_en = now() - interval '1 minute' where pedido_id = $1 and estado = 'activa'`, [id]);
  await db.query(`update public.pedidos set expira_reserva_en = now() - interval '1 minute' where id = $1`, [id]);
  assert.equal(await cron(), 200);
}
const panel = (cuerpo) => fn('panel-pedidos', cuerpo, { token: duena.aal2 });

// Escenarios: cada uno hace UNA compra (o una venta de canal) y anota el estado final que debe quedar.
const ESCENARIOS = {
  async tarjeta() { const v = sigSku(); const p = await nuevo(v); await pagarEnSim(p.url_pago, 'approved'); esperados.push([p.folio, ['pagado'], 'tarjeta']); },
  async rechazoYReintento() { const v = sigSku(); const p = await nuevo(v); await pagarEnSim(p.url_pago, 'rejected'); await pagarEnSim(p.url_pago, 'approved'); esperados.push([p.folio, ['pagado'], 'rechazo+reintento']); },
  async spei() { const v = sigSku(); const p = await nuevo(v); const id = await pagarEnSim(p.url_pago, 'pending'); await simularPago(id, { status: 'approved' }); esperados.push([p.folio, ['pagado'], 'spei']); },
  async abandono() { const v = sigSku(); const p = await nuevo(v); await vencer(p.folio); esperados.push([p.folio, ['expirado'], 'abandono']); },
  async transferenciaAprobada() {
    const v = sigSku(); const p = await nuevo(v, { metodo: 'transferencia' });
    await fn('comprobantes-subir', { modo: 'whatsapp', token: p.token });
    assert.equal((await panel({ accion: 'validar_transferencia', pedido: await idDe(p.folio), aprobar: true, nota: 'maratón' })).status, 200);
    esperados.push([p.folio, ['pagado'], 'transferencia aprobada']);
  },
  async transferenciaRechazada() {
    const v = sigSku(); const p = await nuevo(v, { metodo: 'transferencia' });
    assert.equal((await panel({ accion: 'validar_transferencia', pedido: await idDe(p.folio), aprobar: false, nota: 'no llegó' })).status, 200);
    esperados.push([p.folio, ['cancelado', 'expirado'], 'transferencia rechazada']);
  },
  async transferenciaVencida() { const v = sigSku(); const p = await nuevo(v, { metodo: 'transferencia' }); await vencer(p.folio); esperados.push([p.folio, ['expirado'], 'transferencia vencida']); },
  async paqueteriaCompleta() {
    const v = sigSku();
    const c = await fn('envios-cotizar', { items: [{ sku: v.sku, cantidad: 1 }], destino: { cp: DIR.cp, ciudad: DIR.ciudad, estado: DIR.estado, colonia: DIR.colonia }, turnstile: TURNSTILE });
    assert.equal(c.status, 200, JSON.stringify(c.datos));
    const o = c.datos.opciones[0];
    const p = await nuevo(v, { total: Math.round((v.precio + Number(o.precio)) * 100) / 100 },
      { entrega: { tipo: 'paqueteria', zona: 'Paquetería', cotizacion: o.id, direccion_envio: DIR, direccion: 'Av. Reforma 222, Juárez' } });
    await pagarEnSim(p.url_pago, 'approved');
    await esperar(async () => (await estado(p.folio)) === 'pagado');
    const id = await idDe(p.folio);
    assert.equal((await panel({ accion: 'estado', pedido: id, nuevo: 'preparando' })).status, 200);
    const g = await fn('envios-guia', { accion: 'generar', pedido: id }, { token: duena.aal2 });
    assert.equal(g.status, 200, JSON.stringify(g.datos));
    await post(`${ENVIA}/simular/rastreo`, { trackingNumber: g.datos.guia, status: 'In transit' });
    await esperar(async () => (await estado(p.folio)) === 'enviado');
    await post(`${ENVIA}/simular/rastreo`, { trackingNumber: g.datos.guia, status: 'Delivered' });
    await esperar(async () => (await estado(p.folio)) === 'entregado');
    esperados.push([p.folio, ['entregado'], 'paquetería completa']);
  },
  async didiTransferencia() {
    const v = sigSku();
    const t = await uno(`select zona, costo from public.entregas_publicas where tipo = 'didi' order by zona limit 1`);
    const p = await nuevo(v, { metodo: 'transferencia', total: v.precio + Number(t.costo) }, { entrega: { tipo: 'didi', zona: t.zona, direccion: 'Calle 5 de Mayo 22, Centro' } });
    assert.equal((await panel({ accion: 'validar_transferencia', pedido: await idDe(p.folio), aprobar: true })).status, 200);
    esperados.push([p.folio, ['pagado'], 'DiDi + transferencia']);
  },
  async conPuntos() {
    const r = await fn('cuenta', { accion: 'resumen' }, { token: cuenta.token });
    const saldo = r.datos.saldo;
    const v = sigSku();
    if (!(saldo > 0)) {   // primero junta puntos
      const p = await nuevo(v, { token: cuenta.token });
      await pagarEnSim(p.url_pago, 'approved');
      esperados.push([p.folio, ['pagado'], 'cuenta (junta puntos)']);
      return;
    }
    const puntos = Math.min(saldo, Math.floor(Math.floor(v.precio * 50) / 100 / 0.5));
    const total = Math.round((v.precio - puntos * 0.5) * 100) / 100;
    const p = await nuevo(v, { token: cuenta.token, total }, { puntos });
    await pagarEnSim(p.url_pago, 'approved');
    esperados.push([p.folio, ['pagado'], `cuenta con ${puntos} puntos`]);
  },
  async ventaML() { const s0 = (await stock(skuMl)).stock; const r = await post(`${ML}/simular/venta`, { item: ML_SIMPLE, cantidad: 1 }); assert.equal(r.aviso, 200); await esperar(async () => (await stock(skuMl)).stock === s0 - 1); },
  async ventaTikTok() { const s0 = (await stock(skuTt)).stock; const r = await post(`${TT}/simular/venta`, { producto: TT_PROD, sku: TT_SKU_A, cantidad: 1 }); assert.equal(r.aviso, 200); await esperar(async () => (await stock(skuTt)).stock === s0 - 1); },
  async reembolso() {
    const v = sigSku(); const p = await nuevo(v); await pagarEnSim(p.url_pago, 'approved');
    await esperar(async () => (await estado(p.folio)) === 'pagado');
    assert.equal((await panel({ accion: 'reembolsar', pedido: await idDe(p.folio), nota: 'maratón' })).status, 200);
    esperados.push([p.folio, ['reembolsado'], 'reembolso antes de enviar']);
  },
};
const ORDEN = Object.keys(ESCENARIOS);

test('preparación: foto del stock, cuentas, canales y existencias', async () => {
  // Remedio de H14: apartados colgados de pedidos pagado_sin_stock de pruebas anteriores → el cron los libera al vencer
  await db.query(`update public.reservas_stock set expira_en = now() - interval '1 second' where estado = 'activa' and pedido_id in (select id from public.pedidos where estado = 'pagado_sin_stock')`);
  assert.equal(await cron(), 200);
  const f = reglas('--foto');
  assert.equal(f.status, 0, f.stderr);
  duena = await cuentaPanel('duena');
  const correo = `maraton-${randomUUID().slice(0, 8)}@prueba.mx`;
  await admin.auth.admin.createUser({ email: correo, email_confirm: true });
  const { data: l } = await admin.auth.admin.generateLink({ type: 'magiclink', email: correo });
  const cli = createClient(API, PUB, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: s, error } = await cli.auth.verifyOtp({ email: correo, token: l.properties.email_otp, type: 'email' });
  assert.ifError(error);
  cuenta = { correo, token: s.session.access_token };
  // Canales (las ventas de canal mueven el stock de estas variantes)
  for (const f2 of ['panel-ml', 'panel-tiktok']) {
    const { datos: { url } } = await fn(f2, { accion: 'conectar' }, { token: duena.aal2 });
    const reg = new URL((await fetch(url, { redirect: 'manual' })).headers.get('location'));
    assert.equal((await fn(f2, { accion: 'callback', code: reg.searchParams.get('code'), state: reg.searchParams.get('state') }, { token: duena.aal2 })).status, 200);
  }
  const { rows } = await db.query(`select v.id, v.sku, v.precio from public.variantes v join public.productos p on p.id = v.producto_id
     where v.activo and p.activo and p.tipo = 'lente' and v.graduacion is null order by v.sku`);
  assert.ok(rows.length >= 8, 'hacen falta al menos 8 variantes');
  // Existencias suficientes (ajuste registrado, como la dueña): 15 por variante
  for (const r of rows) {
    const s = await stock(r.sku);
    if (s.stock - s.stock_reservado < 15) await db.query(`select public.mover_stock($1, $2, 'ajuste', $3, 'panel')`, [r.id, 15 - (s.stock - s.stock_reservado), `maraton:surtir:${r.sku}:${Date.now()}`]);
  }
  skuMl = rows.at(-1).sku; skuTt = rows.at(-2).sku;
  skus = rows.slice(0, -2).map((r) => ({ sku: r.sku, precio: Number(r.precio) }));
  assert.equal((await fn('panel-ml', { accion: 'vincular', item: ML_SIMPLE, sku: skuMl, logistica: 'propia' }, { token: duena.aal2 })).status, 200);
  assert.equal((await fn('panel-tiktok', { accion: 'vincular', item: TT_PROD, variacion: TT_SKU_A, sku: skuTt, logistica: 'propia' }, { token: duena.aal2 })).status, 200);
});

test('X8 · 30 compras seguidas mezclando métodos, entregas, puntos, panel y canales', { timeout: 600_000 }, async (t) => {
  const hechos = [];
  for (let i = 0; i < 30; i++) {
    const nombre = ORDEN[i % ORDEN.length];
    await ESCENARIOS[nombre]();
    hechos.push(nombre);
  }
  t.diagnostic(`escenarios: ${hechos.join(', ')}`);
  assert.equal(hechos.length, 30);
});

test('X8 · cada pedido terminó en el estado esperado (I7) y con su dinero cuadrado (I4)', async () => {
  await cron();
  for (const [folio, esperado, esc] of esperados) {
    await esperar(async () => esperado.includes(await estado(folio)), 10_000);
    assert.ok(esperado.includes(await estado(folio)), `${folio} (${esc}): ${await estado(folio)} ∉ ${esperado}`);
  }
  const pagados = esperados.filter(([, e]) => e.includes('pagado') || e.includes('entregado'));
  for (const [folio] of pagados) {
    const p = await uno(`select p.total, (select count(*)::int from public.pagos g where g.pedido_id = p.id and g.estado in ('approved','aprobado') and g.monto = p.total and g.moneda = 'MXN') as ok from public.pedidos p where folio = $1`, [folio]);
    assert.equal(p.ok, 1, `${folio}: un pago aprobado por el total`);
  }
});

test('X8 · reglas I1–I8 en toda la BD (scripts/revisar-reglas.mjs con la foto del maratón)', async (t) => {
  const r = reglas();
  t.diagnostic(r.stdout.trim());
  assert.equal(r.status, 0, r.stdout + r.stderr);
  // I6: ningún aviso, clic o lote repetido generó un segundo movimiento (la ref es única) ni hay ventas dobles por pedido
  const dobles = await db.query(`select pedido_id, count(*) from public.movimientos_stock where motivo = 'venta' and pedido_id is not null group by 1, variante_id having count(*) > 1`);
  assert.deepEqual(dobles.rows, [], 'I6: ventas dobles');
});
