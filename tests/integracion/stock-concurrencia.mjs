// Prueba de concurrencia REAL (ARQUITECTURA §6.3: "Última pieza comprada 2 veces en paralelo → 1 éxito, 1 agotado").
// Dos conexiones distintas intentan reservar la última pieza al mismo tiempo.
// pgTAP corre en una sola transacción y no puede simular esto.
//
// Uso:  node tests/integracion/stock-concurrencia.mjs [DB_URL]
// Por defecto usa la BD local de `supabase start` (puerto 55322). Deja la BD como estaba.
import pg from 'pg';

const URL = process.argv[2] || process.env.DB_URL || 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';
const ID = (n) => `20000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const RONDAS = 20;

const admin = new pg.Client({ connectionString: URL });
await admin.connect();

async function limpiar() {
  // La bitácora es inmutable por trigger; esta prueba no escribe en ella (solo reserva y libera).
  await admin.query(`delete from public.reservas_stock where pedido_id in (select id from public.pedidos where id_externo like 'conc-%')`);
  await admin.query(`delete from public.pedido_items where pedido_id in (select id from public.pedidos where id_externo like 'conc-%')`);
  await admin.query(`delete from public.pedidos where id_externo like 'conc-%'`);
  await admin.query(`delete from public.variantes where id = $1`, [ID(4)]);
  await admin.query(`delete from public.tonos where id = $1`, [ID(3)]);
  await admin.query(`delete from public.productos where id = $1`, [ID(2)]);
  await admin.query(`delete from public.marcas where id = $1`, [ID(1)]);
}

let fallas = 0;
try {
  await limpiar();
  await admin.query(`insert into public.marcas (id, slug, nombre) values ($1, 'conc-marca', 'Conc')`, [ID(1)]);
  await admin.query(`insert into public.productos (id, marca_id, slug, nombre, tipo) values ($1, $2, 'conc-linea', 'Conc', 'lente')`, [ID(2), ID(1)]);
  await admin.query(`insert into public.tonos (id, producto_id, slug, color, nombre, familia) values ($1, $2, 'conc-gris', 'Gris', 'Conc Gris', 'gris')`, [ID(3), ID(2)]);
  await admin.query(`insert into public.variantes (id, producto_id, tono_id, sku, precio, stock) values ($1, $2, $3, 'CONC-GRIS-N', 500, 1)`, [ID(4), ID(2), ID(3)]);

  const a = new pg.Client({ connectionString: URL });
  const b = new pg.Client({ connectionString: URL });
  await a.connect(); await b.connect();

  for (let i = 0; i < RONDAS; i++) {
    const pedidos = [];
    for (const lado of ['a', 'b']) {
      const { rows } = await admin.query(`insert into public.pedidos (id_externo) values ($1) returning id`, [`conc-${i}-${lado}`]);
      await admin.query(`insert into public.pedido_items (pedido_id, variante_id, cantidad, precio_unitario) values ($1, $2, 1, 500)`, [rows[0].id, ID(4)]);
      pedidos.push(rows[0].id);
    }
    // Las dos reservas salen al mismo tiempo, cada una en su conexión y transacción
    const intento = (cli, pedido) => cli.query('select public.reservar_stock($1, 30)', [pedido]).then(() => 'ok', (e) => e.message);
    const [ra, rb] = await Promise.all([intento(a, pedidos[0]), intento(b, pedidos[1])]);
    const exitos = [ra, rb].filter((r) => r === 'ok').length;
    const { rows: [v] } = await admin.query(`select stock, stock_reservado from public.variantes where id = $1`, [ID(4)]);
    const bien = exitos === 1 && [ra, rb].includes('sin_stock') && v.stock_reservado === 1 && v.stock === 1;
    if (!bien) { fallas++; console.error(`ronda ${i}: a=${ra} b=${rb} reservado=${v.stock_reservado}`); }
    for (const p of pedidos) await admin.query('select public.liberar_reserva($1)', [p]);
  }
  await a.end(); await b.end();
  console.log(fallas ? `✗ ${fallas}/${RONDAS} rondas con sobreventa` : `✓ ${RONDAS}/${RONDAS} rondas: siempre 1 reserva y 1 "sin_stock"; nunca se apartó de más`);
} finally {
  await limpiar();
  await admin.end();
}
process.exit(fallas ? 1 : 0);
