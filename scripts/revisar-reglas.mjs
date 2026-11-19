#!/usr/bin/env node
// Revisa en la BD LOCAL las reglas que nunca se rompen (docs/PLAN-PRUEBAS.md §2).
//   node scripts/revisar-reglas.mjs --foto   guarda una foto del stock (al inicio de una fase)
//   node scripts/revisar-reglas.mjs          revisa todo; la regla I2 se compara contra la última foto
// Sale con código 1 si alguna regla se rompe. Solo lee la BD (salvo la foto, que va a .pruebas/foto.json).
import pg from 'pg';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const DB = process.env.DB_URL || 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';
const FOTO = '.pruebas/foto.json';
const c = new pg.Client({ connectionString: DB });
await c.connect();
const q = async (sql, args = []) => (await c.query(sql, args)).rows;

if (process.argv.includes('--foto')) {
  const [{ ahora }] = await q('select now() as ahora');
  const stock = Object.fromEntries((await q('select id, stock from public.variantes')).map((r) => [r.id, r.stock]));
  mkdirSync('.pruebas', { recursive: true });
  writeFileSync(FOTO, JSON.stringify({ ahora, stock }, null, 2));
  console.log(`Foto del stock guardada (${Object.keys(stock).length} variantes) en ${FOTO}`);
  await c.end();
  process.exit(0);
}

const reglas = [
  ['I1', 'stock ≥ 0 y 0 ≤ apartado ≤ stock', `
    select sku, stock, stock_reservado from public.variantes
     where stock < 0 or stock_reservado < 0 or stock_reservado > stock`],
  ['I3', 'lo apartado = suma de reservas activas', `
    select v.sku, v.stock_reservado, coalesce(r.suma, 0) as reservas_activas
      from public.variantes v
      left join (select variante_id, sum(cantidad) as suma from public.reservas_stock where estado = 'activa' group by 1) r
        on r.variante_id = v.id
     where v.stock_reservado <> coalesce(r.suma, 0)`],
  ['I4', 'pedido web pagado (o después) = pago aprobado por el total en MXN', `
    select p.folio, p.estado, p.pago_estado, p.total
      from public.pedidos p
     where p.canal = 'web' and p.estado in ('pagado', 'preparando', 'enviado', 'entregado')
       and not (p.pago_estado = 'aprobado' and exists (
             select 1 from public.pagos g where g.pedido_id = p.id
                and g.estado in ('approved', 'aprobado') and g.monto = p.total and g.moneda = 'MXN'))`],
  ['I4b', 'cada pedido web pagado descontó exactamente sus piezas (bitácora "venta")', `
    select p.folio, p.estado, i.piezas, coalesce(m.vendidas, 0) as vendidas
      from public.pedidos p
      join (select pedido_id, sum(cantidad) as piezas from public.pedido_items group by 1) i on i.pedido_id = p.id
      left join (select pedido_id, -sum(delta) as vendidas from public.movimientos_stock where motivo = 'venta' group by 1) m on m.pedido_id = p.id
     where p.canal = 'web' and p.estado in ('pagado', 'preparando', 'enviado', 'entregado')
       and i.piezas <> coalesce(m.vendidas, 0)`],
  ['I5', 'saldo de puntos de cada clienta ≥ 0', `
    select c.correo, sum(m.delta) as saldo from public.puntos_movimientos m join public.clientas c on c.id = m.clienta_id
     group by c.id, c.correo having sum(m.delta) < 0`],
  ['I8', 'toda transferencia aprobada o rechazada quedó en la auditoría', `
    select p.folio, g.estado from public.pagos g join public.pedidos p on p.id = g.pedido_id
     where g.proveedor = 'transferencia' and g.estado in ('aprobado', 'rechazado')
       and not exists (select 1 from public.auditoria_panel a
                        where a.accion in ('aprobar_transferencia', 'rechazar_transferencia') and a.registro = p.folio)`],
];

let rotas = 0;
const muestra = (filas) => filas.slice(0, 5).map((f) => '      ' + JSON.stringify(f)).join('\n');
for (const [id, nombre, sql] of reglas) {
  let filas;
  try { filas = await q(sql); } catch (e) { console.log(`?  ${id} ${nombre}: no se pudo revisar (${e.message})`); rotas++; continue; }
  if (filas.length) { rotas++; console.log(`✗  ${id} ${nombre}: ${filas.length} caso(s)\n${muestra(filas)}`); }
  else console.log(`✓  ${id} ${nombre}`);
}

// I2: el stock solo cambia por la bitácora (contra la foto; las reservas no cambian el stock).
if (existsSync(FOTO)) {
  const foto = JSON.parse(readFileSync(FOTO, 'utf8'));
  const filas = await q(`
    select v.id, v.sku, v.stock, coalesce(m.suma, 0) as movido
      from public.variantes v
      left join (select variante_id, sum(delta) as suma from public.movimientos_stock where creado_en > $1 group by 1) m
        on m.variante_id = v.id`, [foto.ahora]);
  const mal = filas.filter((f) => f.id in foto.stock && f.stock !== foto.stock[f.id] + Number(f.movido))
    .map((f) => ({ sku: f.sku, foto: foto.stock[f.id], movido: Number(f.movido), stock: f.stock }));
  if (mal.length) { rotas++; console.log(`✗  I2 stock = foto + bitácora: ${mal.length} caso(s)\n${muestra(mal)}`); }
  else console.log(`✓  I2 stock = foto (${foto.ahora}) + bitácora`);
} else console.log('·  I2 sin foto: corre primero  node scripts/revisar-reglas.mjs --foto');

const alertas = await q(`select tipo, count(*)::int as n from privado.alertas where not atendida group by 1 order by 2 desc`).catch(() => null);
if (alertas === null) console.log('·  I10 no se pudieron leer las alertas');
else if (alertas.length) console.log(`!  I10 alertas sin atender (revisar si se esperaban): ${alertas.map((a) => `${a.tipo}×${a.n}`).join(', ')}`);
else console.log('✓  I10 sin alertas sin atender');

await c.end();
console.log(rotas ? `\n${rotas} regla(s) rota(s).` : '\nTodas las reglas se cumplen.');
process.exit(rotas ? 1 : 0);
