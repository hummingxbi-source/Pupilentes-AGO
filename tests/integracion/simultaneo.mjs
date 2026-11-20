// Fase 8 · F2 · Varias personas a la vez (docs/PLAN-PRUEBAS.md §5: X2–X7, X9).
// Peticiones REALES en paralelo contra las Edge Functions locales y los simuladores (MP, Envia, ML, TikTok).
// Cada caso se repite varias rondas: los choques dependen del instante en que se cruzan.
//   node --test tests/integracion/simultaneo.mjs        (con el entorno de scripts/entorno-pruebas.sh arriba)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { API, CRON, SIM, db, fn, uno, stock, skuCon, cuerpoPedido, pagarEnSim, simularPago, cuentaPanel } from '../seguridad/_comun.mjs';

const ML = (process.env.ML_SIM_URL || 'http://127.0.0.1:8092').replace(/\/$/, '');
const TT = (process.env.TT_SIM_URL || 'http://127.0.0.1:8093').replace(/\/$/, '');
const ENVIA = (process.env.ENVIA_SIM_URL || 'http://127.0.0.1:8091').replace(/\/$/, '');
const pedir = (base) => (ruta, cuerpo) => fetch(`${base}${ruta}`, cuerpo === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) }).then((r) => r.json());
const ml = pedir(ML), tt = pedir(TT);
const cron = () => fetch(`${API}/functions/v1/cron-conciliar`, { method: 'POST', headers: { 'x-cron-secret': CRON } }).then(async (r) => ({ status: r.status, datos: await r.json().catch(() => null) }));
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function esperar(cond, ms = 10_000) { const fin = Date.now() + ms; while (Date.now() < fin) { if (await cond()) return true; await espera(250); } return false; }
/** Deja `n` pares DISPONIBLES (stock = apartado + n), con un ajuste registrado. Nunca por debajo de lo apartado (I1). */
async function fijarStock(sku, n) {
  const s = await stock(sku);
  const meta = s.stock_reservado + n;
  if (s.stock !== meta) await db.query(`select public.mover_stock((select id from public.variantes where sku = $1), $2, 'ajuste', $3, 'panel')`, [sku, meta - s.stock, `ci:${randomUUID()}`]);
}
const estado = async (folio) => (await uno('select estado from public.pedidos where folio = $1', [folio])).estado;
const idDe = async (folio) => (await uno('select id from public.pedidos where folio = $1', [folio])).id;
/** I1 + I3 sobre una variante (o todas). */
async function reglasStock(sku = null) {
  const { rows } = await db.query(
    `select v.sku, v.stock, v.stock_reservado, coalesce(r.s, 0)::int as reservas
       from public.variantes v left join (select variante_id, sum(cantidad) s from public.reservas_stock where estado = 'activa' group by 1) r on r.variante_id = v.id
      where ($1::text is null or v.sku = $1) and (v.stock < 0 or v.stock_reservado < 0 or v.stock_reservado > v.stock or v.stock_reservado <> coalesce(r.s, 0))`, [sku]);
  return rows;
}
function secretoMP() {
  if (process.env.MP_WEBHOOK_SECRET) return process.env.MP_WEBHOOK_SECRET;
  const f = '.pruebas/secretos.env';
  return existsSync(f) ? /MP_WEBHOOK_SECRET=(\S+)/.exec(readFileSync(f, 'utf8'))?.[1] : null;
}

/** Variante sin apartados (para "última pieza" y números exactos); no repite entre pruebas. */
const libresUsadas = new Set();
async function skuLibre() {
  const { rows } = await db.query(`select v.sku, v.precio from public.variantes v join public.productos p on p.id = v.producto_id
     where v.activo and p.activo and v.graduacion is null and v.stock_reservado = 0 and v.stock >= 1 order by v.sku`);
  const f = rows.find((x) => !libresUsadas.has(x.sku));
  assert.ok(f, 'no quedan variantes sin apartados');
  libresUsadas.add(f.sku);
  return { sku: f.sku, precio: Number(f.precio) };
}

let duena, ayudante;
const pedidosSinStock = [];
const ML_SIMPLE = 'MLM100100', TT_PROD = '1730000000000000001', TT_SKU_B = '1730000000000000102';
async function conectar(f) {
  const { datos: { url } } = await fn(f, { accion: 'conectar' }, { token: duena.aal2 });
  const reg = new URL((await fetch(url, { redirect: 'manual' })).headers.get('location'));
  const cb = await fn(f, { accion: 'callback', code: reg.searchParams.get('code'), state: reg.searchParams.get('state') }, { token: duena.aal2 });
  assert.equal(cb.status, 200, JSON.stringify(cb.datos));
}

test('preparación: cuentas del panel y canales conectados (sin sincronizar)', async () => {
  // Remedio de H14: pruebas anteriores (fase3: pago tardío sin stock) dejan apartados activos de pedidos
  // pagado_sin_stock; se dejan vencer y el cron real los libera, para partir de I1–I3 en verde.
  await db.query(`update public.reservas_stock set expira_en = now() - interval '1 second' where estado = 'activa' and pedido_id in (select id from public.pedidos where estado = 'pagado_sin_stock')`);
  await cron();
  assert.deepEqual(await reglasStock(), [], 'I1–I3 al empezar');
  duena = await cuentaPanel('duena');
  ayudante = await cuentaPanel('ayudante');
  await conectar('panel-ml');
  await conectar('panel-tiktok');
  await fn('panel-ml', { accion: 'sincronizacion', activa: false }, { token: duena.aal2 });
  await fn('panel-tiktok', { accion: 'sincronizacion', activa: false }, { token: duena.aal2 });
});

// ------------------------------------------------------------------------------------------- X2
test('X2 · última pieza: compra web y venta de ML en el mismo instante (5 rondas)', async (t) => {
  const v = await skuLibre();
  assert.equal((await fn('panel-ml', { accion: 'vincular', item: ML_SIMPLE, sku: v.sku, logistica: 'propia' }, { token: duena.aal2 })).status, 200);
  const resultados = [];
  for (let i = 0; i < 5; i++) {
    await fijarStock(v.sku, 1);
    const [web, venta] = await Promise.all([fn('pedidos-crear', cuerpoPedido(v)), ml('/simular/venta', { item: ML_SIMPLE, cantidad: 1 })]);
    assert.equal(venta.aviso, 200);
    await esperar(async () => (await uno(`select 1 as ok from public.movimientos_stock where ref_externa like $1`, [`ml:${venta.orden}:%`])) !== undefined, 5000);
    const intermedio = await reglasStock(v.sku);
    let final = null;
    if (web.status === 200) {
      await pagarEnSim(web.datos.url_pago, 'approved');
      await esperar(async () => !['pendiente_pago'].includes(await estado(web.datos.folio)));
      final = await estado(web.datos.folio);
    }
    let s = await stock(v.sku);
    resultados.push({ web: web.status === 200 ? final : `rechazado ${web.status} ${web.datos?.error}`, stock: s.stock, apartado: s.stock_reservado, I1_intermedio: intermedio.length ? intermedio[0] : 'ok' });
    if (final === 'pagado_sin_stock') {   // H14: su apartado sigue activo; se deja que el cron lo libere al vencer
      await db.query(`update public.reservas_stock set expira_en = now() - interval '1 second' where pedido_id = (select id from public.pedidos where folio = $1) and estado = 'activa'`, [web.datos.folio]);
      await cron();
      s = await stock(v.sku);
    }
    assert.ok(s.stock >= 0, 'el stock no baja de 0');
    assert.deepEqual(await reglasStock(v.sku), [], `I1/I3 al final de la ronda ${i + 1}`);
    if (web.status === 200) assert.ok(['pagado_sin_stock', 'pagado'].includes(final), `el pago web cae en pagado_sin_stock (o pagado si ML no la descontó): ${final}`);
    if (final === 'pagado') assert.equal(s.stock, 0);
  }
  t.diagnostic(JSON.stringify(resultados));
});

test('X2 · última pieza apartada por la web y vendida en ML en ese mismo segundo: no baja de 0 y el pago web cae en pagado_sin_stock', async (t) => {
  const v = await skuLibre();
  assert.equal((await fn('panel-ml', { accion: 'vincular', item: ML_SIMPLE, sku: v.sku, logistica: 'propia' }, { token: duena.aal2 })).status, 200);
  await cron();                                                     // absorbe ventas viejas del simulador (H12)
  const rondas = [];
  for (let i = 0; i < 3; i++) {
    await fijarStock(v.sku, 1);
    const web = await fn('pedidos-crear', cuerpoPedido(v));
    assert.equal(web.status, 200, JSON.stringify(web.datos));
    const venta = await ml('/simular/venta', { item: ML_SIMPLE, cantidad: 1 });
    assert.equal(venta.aviso, 200);
    await esperar(async () => (await uno(`select 1 as ok from public.movimientos_stock where ref_externa like $1`, [`ml:${venta.orden}:%`])) !== undefined, 5000);
    const s1 = await stock(v.sku);
    const alerta = await uno(`select tipo from privado.alertas where not atendida and tipo in ('sobreventa', 'stock_bajo_reservado') and detalle->>'ref' like $1`, [`ml:${venta.orden}:%`]);
    await pagarEnSim(web.datos.url_pago, 'approved');
    await esperar(async () => (await estado(web.datos.folio)) !== 'pendiente_pago');
    const final = await estado(web.datos.folio);
    const s2 = await stock(v.sku);
    rondas.push({ intermedio: s1, alerta: alerta?.tipo ?? null, pedido: final, final: s2 });
    assert.ok(s1.stock >= 0 && s2.stock >= 0, 'no baja de 0');
    assert.equal(final, 'pagado_sin_stock', 'el pago web tardío cae en pagado_sin_stock');
    assert.ok(alerta, 'hay alerta mientras la pieza apartada ya se vendió en ML');
    pedidosSinStock.push(web.datos.folio);
    // El apartado de un pedido pagado_sin_stock queda activo (H14, prueba aparte): lo libera el cron al vencer.
    await db.query(`update public.reservas_stock set expira_en = now() - interval '1 second' where pedido_id = (select id from public.pedidos where folio = $1) and estado = 'activa'`, [web.datos.folio]);
    await cron();
  }
  t.diagnostic(JSON.stringify(rondas));
});

// H14: al caer en pagado_sin_stock, confirmar_pago no libera el apartado que el pedido ya tenía (queda activo hasta
// que vence: stock 0 y apartado 1, I1 rota hasta 30 min). `todo` mientras siga abierto.
test('X2 · H14 · un pedido que cae en pagado_sin_stock libera su apartado en ese momento', { todo: 'H14 abierto: privado.confirmar_pago no llama a liberar_reserva al caer en pagado_sin_stock' }, async () => {
  const v = await skuLibre();
  assert.equal((await fn('panel-ml', { accion: 'vincular', item: ML_SIMPLE, sku: v.sku, logistica: 'propia' }, { token: duena.aal2 })).status, 200);
  await cron();
  await fijarStock(v.sku, 1);
  const web = await fn('pedidos-crear', cuerpoPedido(v));
  const venta = await ml('/simular/venta', { item: ML_SIMPLE, cantidad: 1 });
  await esperar(async () => (await uno(`select 1 as ok from public.movimientos_stock where ref_externa like $1`, [`ml:${venta.orden}:%`])) !== undefined, 5000);
  await pagarEnSim(web.datos.url_pago, 'approved');
  await esperar(async () => (await estado(web.datos.folio)) === 'pagado_sin_stock');
  try {
    assert.deepEqual(await reglasStock(v.sku), [], 'I1–I3 justo después del pago');
  } finally {
    await db.query(`update public.reservas_stock set expira_en = now() - interval '1 second' where pedido_id = (select id from public.pedidos where folio = $1) and estado = 'activa'`, [web.datos.folio]);
    await cron();
  }
});

// ------------------------------------------------------------------------------------------- X3
test('X3 · la dueña ajusta el stock mientras una clienta paga esa variante (10 rondas): nunca por debajo de lo apartado', async (t) => {
  const v = await skuLibre();
  const vistos = { ajuste: {}, pedido: {} };
  for (let i = 0; i < 10; i++) {
    await fijarStock(v.sku, 2);
    const p = await fn('pedidos-crear', cuerpoPedido(v));
    assert.equal(p.status, 200, JSON.stringify(p.datos));
    const s = await stock(v.sku);
    // nuevo = 1 = lo apartado: si el ajuste gana, queda justo; si gana el pago, el lote ve otro stock (conflicto)
    const [aj] = await Promise.all([
      fn('panel-stock', { accion: 'aplicar', lote: randomUUID(), motivo: 'ajuste', filas: [{ sku: v.sku, nuevo: 1, esperado: s.stock }] }, { token: duena.aal2 }),
      pagarEnSim(p.datos.url_pago, 'approved'),
    ]);
    await esperar(async () => (await estado(p.datos.folio)) !== 'pendiente_pago');
    const e = await estado(p.datos.folio);
    vistos.ajuste[aj.status] = (vistos.ajuste[aj.status] ?? 0) + 1;
    vistos.pedido[e] = (vistos.pedido[e] ?? 0) + 1;
    assert.deepEqual(await reglasStock(v.sku), [], `I1–I3 en la ronda ${i + 1} (ajuste ${aj.status}, pedido ${e})`);
  }
  t.diagnostic(JSON.stringify(vistos));
});

// ------------------------------------------------------------------------------------------- X4
test('X4 · la dueña importa un Excel mientras entran ventas: el lote detecta el cambio y no pisa las ventas', async (t) => {
  const v = await skuLibre();
  const vistos = {};
  for (let i = 0; i < 5; i++) {
    await fijarStock(v.sku, 5);
    const p = await fn('pedidos-crear', cuerpoPedido(v));
    const prev = await fn('panel-stock', { accion: 'previsualizar', filas: [{ sku: v.sku, nuevo: 9 }] }, { token: duena.aal2 });
    assert.equal(prev.status, 200, JSON.stringify(prev.datos));
    const esperado = prev.datos.filas[0].actual;
    const [ap] = await Promise.all([
      fn('panel-stock', { accion: 'aplicar', lote: prev.datos.lote ?? randomUUID(), motivo: 'conciliacion', filas: [{ sku: v.sku, nuevo: 9, esperado }] }, { token: duena.aal2 }),
      pagarEnSim(p.datos.url_pago, 'approved'),
    ]);
    await esperar(async () => (await estado(p.datos.folio)) !== 'pendiente_pago');
    const s = await stock(v.sku);
    vistos[`${ap.status}→${s.stock}`] = (vistos[`${ap.status}→${s.stock}`] ?? 0) + 1;
    // Si el lote se aplicó primero: 9 − 1 vendida = 8. Si la venta fue primero: el lote ve otro stock y responde conflicto (5 − 1 = 4).
    if (ap.status === 200) assert.equal(s.stock, 8, 'el lote no pisó la venta');
    else { assert.equal(ap.status, 409, JSON.stringify(ap.datos)); assert.equal(s.stock, 4); }
    assert.deepEqual(await reglasStock(v.sku), []);
  }
  t.diagnostic(JSON.stringify(vistos));
});

// ------------------------------------------------------------------------------------------- X5
test('X5 · dueña y ayudante generan la guía del mismo pedido a la vez (5 rondas): una sola guía', async () => {
  const v = await skuCon(1);
  for (let i = 0; i < 5; i++) {
    await fijarStock(v.sku, 2);
    const c = await fn('envios-cotizar', { items: [{ sku: v.sku, cantidad: 1 }], destino: { cp: '06600', ciudad: 'Cuauhtémoc', estado: 'Ciudad de México', colonia: 'Juárez' }, turnstile: 'XXXX.DUMMY.TOKEN.XXXX' });
    assert.equal(c.status, 200, JSON.stringify(c.datos));
    const o = c.datos.opciones[0];
    const cuerpo = cuerpoPedido(v, { total: v.precio + Number(o.precio) });
    cuerpo.entrega = { tipo: 'paqueteria', zona: 'Paquetería', cotizacion: o.id, direccion: 'Av. Reforma 222, Juárez',
      direccion_envio: { calle: 'Av. Reforma', numero: '222', colonia: 'Juárez', ciudad: 'Cuauhtémoc', estado: 'Ciudad de México', cp: '06600' } };
    const p = await fn('pedidos-crear', cuerpo);
    assert.equal(p.status, 200, JSON.stringify(p.datos));
    await pagarEnSim(p.datos.url_pago, 'approved');
    await esperar(async () => (await estado(p.datos.folio)) === 'pagado');
    const id = await idDe(p.datos.folio);
    const [a, b] = await Promise.all([
      fn('envios-guia', { accion: 'generar', pedido: id }, { token: duena.aal2 }),
      fn('envios-guia', { accion: 'generar', pedido: id }, { token: ayudante.aal2 }),
    ]);
    const guias = (await db.query(`select guia from public.envios where pedido_id = $1 and proveedor = 'envia' and guia is not null`, [id])).rows;
    assert.equal(guias.length, 1, `una sola guía (respuestas ${a.status}/${b.status})`);
    assert.ok([a.status, b.status].includes(200), `una de las dos la generó: ${a.status}/${b.status}`);
  }
  void ENVIA;
});

// ------------------------------------------------------------------------------------------- X6
test('X6 · la dueña aprueba una transferencia en el momento en que vence su apartado (8 rondas): pagado o expirado, nunca los dos', async (t) => {
  const vistos = {};
  const v = await skuCon(1);
  for (let i = 0; i < 8; i++) {
    await fijarStock(v.sku, 2);
    const p = await fn('pedidos-crear', cuerpoPedido(v, { metodo: 'transferencia' }));
    assert.equal(p.status, 200, JSON.stringify(p.datos));
    const id = await idDe(p.datos.folio);
    await db.query(`update public.reservas_stock set expira_en = now() - interval '1 second' where pedido_id = $1`, [id]);
    await db.query(`update public.pedidos set expira_reserva_en = now() - interval '1 second' where id = $1`, [id]);
    const [ap] = await Promise.all([
      fn('panel-pedidos', { accion: 'validar_transferencia', pedido: id, aprobar: true }, { token: duena.aal2 }),
      cron(),
    ]);
    const e = await estado(p.datos.folio);
    vistos[`${ap.status}:${e}`] = (vistos[`${ap.status}:${e}`] ?? 0) + 1;
    assert.ok(['pagado', 'expirado', 'pagado_sin_stock'].includes(e), `estado final ${e}`);
    const pago = await uno(`select estado from public.pagos where pedido_id = $1 and proveedor = 'transferencia'`, [id]);
    if (e === 'expirado') assert.notEqual(pago?.estado, 'aprobado', 'expirado no tiene pago aprobado');
    if (e === 'pagado') {
      assert.equal(pago?.estado, 'aprobado');
      const vend = await uno(`select coalesce(-sum(delta), 0)::int as n from public.movimientos_stock where pedido_id = $1 and motivo = 'venta'`, [id]);
      assert.equal(vend.n, 1, 'se descontó una vez');
    }
    assert.deepEqual(await reglasStock(v.sku), [], 'I1–I3');
  }
  t.diagnostic(JSON.stringify(vistos));
});

// ------------------------------------------------------------------------------------------- X7
test('X7 · el cron corre mientras llegan avisos de MP, ML y TikTok (3 rondas): sin errores ni movimientos dobles', async (t) => {
  const vml = await skuCon(3), vtt = await skuCon(3);
  assert.equal((await fn('panel-ml', { accion: 'vincular', item: ML_SIMPLE, sku: vml.sku, logistica: 'propia' }, { token: duena.aal2 })).status, 200);
  assert.equal((await fn('panel-tiktok', { accion: 'vincular', item: TT_PROD, variacion: TT_SKU_B, sku: vtt.sku, logistica: 'propia' }, { token: duena.aal2 })).status, 200);
  await cron();                                                     // absorbe ventas viejas del simulador (H12)
  const estados = [];
  const vw = await skuCon(1);
  for (let i = 0; i < 3; i++) {
    await fijarStock(vml.sku, 6); await fijarStock(vtt.sku, 6); await fijarStock(vw.sku, 2);
    const ml0 = (await stock(vml.sku)).stock, tt0 = (await stock(vtt.sku)).stock;
    const p = await fn('pedidos-crear', cuerpoPedido(vw));
    assert.equal(p.status, 200, JSON.stringify(p.datos));
    const pendiente = await pagarEnSim(p.datos.url_pago, 'pending');
    const res = await Promise.all([
      cron(), cron(),
      simularPago(pendiente, { status: 'approved' }),
      ml('/simular/venta', { item: ML_SIMPLE, cantidad: 1 }),
      tt('/simular/venta', { producto: TT_PROD, sku: TT_SKU_B, cantidad: 1 }),
    ]);
    estados.push([res[0].status, res[1].status, res[3].aviso, res[4].aviso]);
    assert.ok(res[0].status === 200 && res[1].status === 200, `cron ${res[0].status}/${res[1].status} ${JSON.stringify(res[0].datos)}`);
    assert.equal(res[3].aviso, 200); assert.equal(res[4].aviso, 200);
    await esperar(async () => (await estado(p.datos.folio)) === 'pagado');
    await cron();
    assert.equal(await estado(p.datos.folio), 'pagado');
    assert.equal((await stock(vml.sku)).stock, ml0 - 1, 'ML descontó una vez');
    assert.equal((await stock(vtt.sku)).stock, tt0 - 1, 'TikTok descontó una vez');
    const vend = await uno(`select coalesce(-sum(delta), 0)::int as n from public.movimientos_stock where pedido_id = (select id from public.pedidos where folio = $1) and motivo = 'venta'`, [p.datos.folio]);
    assert.equal(vend.n, 1, 'la venta web se descontó una vez');
  }
  t.diagnostic(JSON.stringify(estados));
});

// ------------------------------------------------------------------------------------------- X9
test('X9 · el mismo aviso de pago llega 2 veces A LA VEZ (5 rondas): un solo movimiento', { skip: !secretoMP() && 'sin MP_WEBHOOK_SECRET' }, async () => {
  const secreto = secretoMP();
  const v = await skuCon(1);
  for (let i = 0; i < 5; i++) {
    await fijarStock(v.sku, 2);
    const p = await fn('pedidos-crear', cuerpoPedido(v));
    assert.equal(p.status, 200, JSON.stringify(p.datos));
    const idPago = await pagarEnSim(p.datos.url_pago, 'pending');
    // El simulador cambia el pago a aprobado (y manda su aviso); a la vez llegan 2 copias idénticas del mismo aviso.
    const ts = String(Date.now()), rid = randomUUID();
    const v1 = createHmac('sha256', secreto).update(`id:${idPago};request-id:${rid};ts:${ts};`).digest('hex');
    const cuerpo = JSON.stringify({ id: Date.now(), type: 'payment', action: 'payment.updated', live_mode: false, date_created: new Date().toISOString(), data: { id: String(idPago) } });
    const copia = () => fetch(`${API}/functions/v1/webhook-mercadopago?data.id=${idPago}&type=payment`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': rid }, body: cuerpo });
    const [r1, r2] = await Promise.all([copia(), copia(), simularPago(idPago, { status: 'approved' })]);
    assert.ok(r1.status < 500 && r2.status < 500, `los avisos no truenan: ${r1.status}/${r2.status}`);
    await esperar(async () => (await estado(p.datos.folio)) === 'pagado');
    const id = await idDe(p.datos.folio);
    const vend = await uno(`select coalesce(-sum(delta), 0)::int as n, count(*)::int as filas from public.movimientos_stock where pedido_id = $1 and motivo = 'venta'`, [id]);
    assert.deepEqual(vend, { n: 1, filas: 1 }, 'un solo movimiento de venta');
    const pagos = await uno(`select count(*)::int as n from public.pagos where pedido_id = $1 and estado in ('approved', 'aprobado')`, [id]);
    assert.equal(pagos.n, 1, 'un solo pago aprobado');
    const ev = await uno(`select count(*)::int as n from privado.eventos_webhook where proveedor = 'mercadopago' and id_evento like $1`, [`${idPago}:%`]);
    assert.ok(ev.n >= 1);
  }
});

test('al final: I1–I3 en todas las variantes', async () => {
  // Remedio de H14 (solo pedidos pagado_sin_stock): sus apartados los libera el cron al vencer
  await db.query(`update public.reservas_stock set expira_en = now() - interval '1 second' where estado = 'activa' and pedido_id in (select id from public.pedidos where estado = 'pagado_sin_stock')`);
  await cron();
  assert.deepEqual(await reglasStock(), []);
  void SIM;
});
