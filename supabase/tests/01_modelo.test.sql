-- pgTAP · Fase 1 · modelo de datos y permisos (ARQUITECTURA §6.3)
begin;
select plan(16);

-- RLS en todas las tablas de public
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0, 'todas las tablas de public tienen RLS');
select is(
  (select count(*)::int from pg_tables where schemaname = 'privado' and not rowsecurity),
  0, 'todas las tablas de privado tienen RLS');

-- El anónimo no lee datos internos (0 filas / sin permiso)
set local role anon;
select throws_ok('select * from public.pedidos', '42501', null, 'anon no lee pedidos');
select throws_ok('select * from public.clientas', '42501', null, 'anon no lee clientas');
select throws_ok('select * from public.variantes', '42501', null, 'anon no lee variantes directo (solo la vista)');
select throws_ok('select * from privado.alertas', '42501', null, 'anon no ve el esquema privado');
select lives_ok('select * from public.catalogo_publico', 'anon lee catalogo_publico');
reset role;

set local role authenticated;
select is((select count(*)::int from public.pedidos), 0, 'authenticated sin rol de panel: 0 pedidos (RLS)');
select throws_ok($$update public.variantes set stock = 999$$, '42501', null, 'authenticated no puede hacer UPDATE de stock');
select throws_ok($$insert into public.movimientos_stock (variante_id, delta, motivo, ref_externa) values (gen_random_uuid(), 5, 'ajuste', 'x')$$,
  '42501', null, 'authenticated no escribe en la bitácora');
reset role;

-- La vista no expone columnas internas
select hasnt_column('public', 'catalogo_publico', 'stock', 'la vista no expone stock');
select hasnt_column('public', 'catalogo_publico', 'stock_reservado', 'la vista no expone stock_reservado');

-- Coherencia de variantes
insert into public.marcas (id, slug, nombre) values ('00000000-0000-0000-0000-0000000000a1', 'marca-prueba', 'Marca prueba');
insert into public.productos (id, marca_id, slug, nombre, tipo) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'linea-prueba', 'Línea prueba', 'lente'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', 'acc-prueba', 'Accesorio prueba', 'accesorio');
select throws_ok($$insert into public.variantes (producto_id, sku, precio) values ('00000000-0000-0000-0000-0000000000b1', 'P-SIN-TONO', 100)$$,
  '23514', null, 'un lente sin tono se rechaza');
select throws_ok($$insert into public.variantes (producto_id, sku, precio, graduacion) values ('00000000-0000-0000-0000-0000000000b2', 'P-ACC-GRAD', 100, -1.00)$$,
  '23514', null, 'un accesorio con graduación se rechaza');
select throws_ok($$insert into public.variantes (producto_id, sku, precio) values ('00000000-0000-0000-0000-0000000000b2', 'P-ACC-NEG', -5)$$,
  '23514', null, 'precio negativo se rechaza');
insert into public.tonos (id, producto_id, slug, color, nombre, familia) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'linea-prueba-azul', 'Azul', 'Línea prueba Azul', 'azul');
select throws_ok($$insert into public.variantes (producto_id, tono_id, sku, precio, graduacion) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'P-GRAD-RARA', 100, -1.10)$$,
  '23514', null, 'graduación fuera de pasos de 0.25 se rechaza');

select * from finish();
rollback;
