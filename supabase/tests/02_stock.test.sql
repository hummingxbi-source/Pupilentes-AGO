-- pgTAP · Fase 1 · funciones de stock (ARQUITECTURA §3.2 regla de oro, §6.3)
begin;
select plan(31);

-- Datos de prueba ----------------------------------------------------------
insert into public.marcas (id, slug, nombre) values ('10000000-0000-0000-0000-0000000000a1', 'marca-st', 'Marca ST');
insert into public.productos (id, marca_id, slug, nombre, tipo) values
  ('10000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000a1', 'linea-st', 'Línea ST', 'lente');
insert into public.tonos (id, producto_id, slug, color, nombre, familia) values
  ('10000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000b1', 'linea-st-gris', 'Gris', 'Línea ST Gris', 'gris');
insert into public.variantes (id, producto_id, tono_id, sku, duracion, graduacion, precio, stock) values
  ('10000000-0000-0000-0000-0000000000d0', '10000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000c1', 'ST-GRIS-M050', 'anual', -0.50, 500, 5),
  ('10000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000c1', 'ST-GRIS-N', 'anual', null, 500, 1),
  ('10000000-0000-0000-0000-0000000000d2', '10000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000c1', 'ST-GRIS-M100', 'anual', -1.00, 500, 5);
insert into public.publicaciones_canal (variante_id, canal, id_externo_item) values
  ('10000000-0000-0000-0000-0000000000d1', 'ml', 'MLM-1');
insert into public.pedidos (id) values
  ('10000000-0000-0000-0000-0000000000e1'), ('10000000-0000-0000-0000-0000000000e2'), ('10000000-0000-0000-0000-0000000000e3');
-- e1: la última pieza neutra + 2 de -1.00 · e2: la misma última pieza neutra · e3: 2 de -1.00
insert into public.pedido_items (pedido_id, variante_id, cantidad, precio_unitario) values
  ('10000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000d1', 1, 500),
  ('10000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000d2', 2, 500),
  ('10000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-0000000000d1', 1, 500),
  ('10000000-0000-0000-0000-0000000000e3', '10000000-0000-0000-0000-0000000000d2', 2, 500);

create temp view st as select sku, stock, stock_reservado from public.variantes where sku in ('ST-GRIS-N', 'ST-GRIS-M100');

-- Permisos: nadie de la API ejecuta las funciones de stock ------------------
select ok(not has_function_privilege('anon', 'public.mover_stock(uuid, integer, text, text, text, uuid, uuid)', 'execute'), 'anon no ejecuta mover_stock');
select ok(not has_function_privilege('authenticated', 'public.mover_stock(uuid, integer, text, text, text, uuid, uuid)', 'execute'), 'authenticated no ejecuta mover_stock');
select ok(not has_function_privilege('anon', 'public.reservar_stock(uuid, integer)', 'execute'), 'anon no ejecuta reservar_stock');
select ok(not has_function_privilege('authenticated', 'public.reservar_stock(uuid, integer)', 'execute'), 'authenticated no ejecuta reservar_stock');
select ok(not has_function_privilege('authenticated', 'public.confirmar_venta(uuid)', 'execute'), 'authenticated no ejecuta confirmar_venta');
select ok(not has_function_privilege('authenticated', 'public.liberar_reserva(uuid)', 'execute'), 'authenticated no ejecuta liberar_reserva');
select ok(has_function_privilege('service_role', 'public.reservar_stock(uuid, integer)', 'execute'), 'service_role ejecuta reservar_stock');
set local role anon;
select throws_ok($$select public.mover_stock('10000000-0000-0000-0000-0000000000d1', 100, 'ajuste', 'hack')$$, '42501', null, 'anon: RPC a mover_stock → permiso denegado');
reset role;

-- reservar_stock -------------------------------------------------------------
select isnt(public.reservar_stock('10000000-0000-0000-0000-0000000000e1', 30), null, 'e1 reserva la última pieza neutra y 2 de -1.00');
select results_eq('select stock_reservado from st order by sku', array[2, 1], 'reservado: -1.00 → 2, neutro → 1');
select throws_ok($$select public.reservar_stock('10000000-0000-0000-0000-0000000000e2', 30)$$, 'P0001', 'sin_stock', 'e2 pide la misma última pieza → sin_stock');
select is((select count(*)::int from public.reservas_stock where pedido_id = '10000000-0000-0000-0000-0000000000e2'), 0, 'e2 no aparta nada');
select is(public.reservar_stock('10000000-0000-0000-0000-0000000000e1', 30),
          (select expira_reserva_en from public.pedidos where id = '10000000-0000-0000-0000-0000000000e1'),
          'reservar dos veces el mismo pedido devuelve la misma reserva');
select results_eq('select stock_reservado from st order by sku', array[2, 1], 'y no aparta doble');

-- e3 pide 2 de -1.00 (quedan 3 libres) → sí
select isnt(public.reservar_stock('10000000-0000-0000-0000-0000000000e3', 30), null, 'e3 reserva 2 de -1.00');
-- Todo o nada: e2 suma un renglón que sí alcanza (-0.50, se procesa primero por id)
-- más la pieza neutra que ya no hay → no debe quedar nada apartado
insert into public.pedido_items (pedido_id, variante_id, cantidad, precio_unitario) values
  ('10000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-0000000000d0', 1, 500);
select throws_ok($$select public.reservar_stock('10000000-0000-0000-0000-0000000000e2', 30)$$, 'P0001', 'sin_stock', 'un renglón sin stock revierte el pedido completo');
select is((select stock_reservado from public.variantes where sku = 'ST-GRIS-M050'), 0, 'el renglón que sí alcanzaba no quedó apartado');

-- liberar_reserva ------------------------------------------------------------
select is(public.liberar_reserva('10000000-0000-0000-0000-0000000000e3'), 1, 'e3 libera 1 renglón');
select is(public.liberar_reserva('10000000-0000-0000-0000-0000000000e3'), 0, 'liberar dos veces no duplica');
select results_eq('select stock_reservado from st order by sku', array[2, 1], 'reservado vuelve a 2 y 1');

-- confirmar_venta ------------------------------------------------------------
select is(public.confirmar_venta('10000000-0000-0000-0000-0000000000e1'), true, 'e1 pagado → confirmar_venta');
select results_eq('select stock from st order by sku', array[3, 0], 'stock físico baja: -1.00 → 3, neutro → 0');
select results_eq('select stock_reservado from st order by sku', array[0, 0], 'reservado baja a 0');
select is(public.confirmar_venta('10000000-0000-0000-0000-0000000000e1'), false, 'confirmar dos veces es idempotente');
select is((select count(*)::int from public.movimientos_stock where pedido_id = '10000000-0000-0000-0000-0000000000e1'), 2, 'la venta queda en la bitácora (2 renglones)');
select is((select count(*)::int from privado.cola_sync where variante_id = '10000000-0000-0000-0000-0000000000d1' and canal = 'ml'), 1, 'se encola la sync a ML de la variante publicada');
select throws_ok($$select public.confirmar_venta('10000000-0000-0000-0000-0000000000e3')$$, 'P0001', 'reserva_no_activa', 'no se confirma un pedido con la reserva liberada');

-- mover_stock ----------------------------------------------------------------
select is(public.mover_stock('10000000-0000-0000-0000-0000000000d2', -1, 'venta', 'ml:orden-1:item-1', 'ml'), true, 'venta de ML descuenta 1');
select is(public.mover_stock('10000000-0000-0000-0000-0000000000d2', -1, 'venta', 'ml:orden-1:item-1', 'ml'), false, 'el mismo aviso repetido no descuenta otra vez');
select is(public.mover_stock('10000000-0000-0000-0000-0000000000d2', -50, 'conciliacion', 'conc:1'), true, 'un delta mayor al stock se aplica…');
select results_eq($$select stock from st where sku = 'ST-GRIS-M100'$$, array[0], '…pero el stock no baja de 0');

select * from finish();
rollback;
