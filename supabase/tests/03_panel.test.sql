-- pgTAP · Fase 2 · panel seguro (ARQUITECTURA §6.1 regla 11, §6.3)
begin;
select plan(31);

-- Usuarios de prueba -------------------------------------------------------
insert into auth.users (id, email) values
  ('30000000-0000-0000-0000-0000000000d1', 'duena@prueba.mx'),
  ('30000000-0000-0000-0000-0000000000a1', 'ayudante@prueba.mx'),
  ('30000000-0000-0000-0000-0000000000c1', 'clienta@prueba.mx');
insert into public.perfiles_panel (user_id, rol) values
  ('30000000-0000-0000-0000-0000000000d1', 'duena'),
  ('30000000-0000-0000-0000-0000000000a1', 'ayudante');

create function pg_temp.como(p_sub text, p_aal text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_sub, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create temp table t_ref as select sku, precio from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-N';
grant select on t_ref to authenticated;

-- Dueña con solo contraseña (aal1): no ve nada --------------------------------
select pg_temp.como('30000000-0000-0000-0000-0000000000d1', 'aal1');
select is((select count(*)::int from public.variantes), 0, 'dueña sin MFA (aal1): 0 variantes');
select is((select count(*)::int from public.pedidos), 0, 'dueña sin MFA: 0 pedidos');
select is((select count(*)::int from public.perfiles_panel), 0, 'dueña sin MFA: ni su propio perfil');
update public.variantes set precio = 1 where sku = 'UL-ANGELES-N-BLUE-ANU-N';
reset role;
select is((select precio from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-N'), (select precio from t_ref), 'dueña sin MFA no puede cambiar precios');

-- Dueña con MFA (aal2) ----------------------------------------------------------
select pg_temp.como('30000000-0000-0000-0000-0000000000d1', 'aal2');
select is((select count(*)::int from public.variantes), 471, 'dueña con MFA ve todas las variantes');
select is((select count(*)::int from public.perfiles_panel), 2, 'dueña con MFA ve al equipo');
select lives_ok($$update public.variantes set precio = 777 where sku = 'UL-ANGELES-N-BLUE-ANU-N'$$, 'dueña con MFA cambia un precio');
select throws_ok($$update public.variantes set stock = 999 where sku = 'UL-ANGELES-N-BLUE-ANU-N'$$, '42501', null, 'dueña con MFA NO puede tocar stock directo');
select throws_ok($$update public.variantes set stock_reservado = 0$$, '42501', null, 'ni stock_reservado');
select throws_ok($$insert into public.variantes (producto_id, sku, precio) select producto_id, 'X-NUEVA', 1 from public.variantes limit 1$$, '42501', null, 'no inserta variantes directo (se usa panel-catalogo)');
select throws_ok($$delete from public.productos$$, '42501', null, 'no borra productos (se desactivan)');
select throws_ok($$select public.panel_ajustar_stock('[]', 'ajuste', 'lote-prueba-1', '30000000-0000-0000-0000-0000000000d1')$$, '42501', null, 'no ejecuta panel_ajustar_stock por RPC');
select throws_ok($$select public.aplicar_catalogo('{}')$$, '42501', null, 'no ejecuta aplicar_catalogo por RPC');
reset role;
select is((select precio from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-N'), 777.00, 'el precio cambió');
select is((select count(*)::int from public.auditoria_panel where usuario = '30000000-0000-0000-0000-0000000000d1' and tabla = 'variantes' and despues ->> 'precio' = '777.00'), 1,
          'el cambio de precio quedó en auditoria_panel con antes/después');

-- Ayudante con MFA: ve, pero no edita -------------------------------------------
select pg_temp.como('30000000-0000-0000-0000-0000000000a1', 'aal2');
select is((select count(*)::int from public.variantes), 471, 'ayudante con MFA ve el inventario');
update public.variantes set precio = 1 where sku = 'UL-ANGELES-N-BLUE-ANU-N';
reset role;
select is((select precio from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-N'), 777.00, 'ayudante no puede cambiar precios');

-- Clienta con sesión (OTP, Fase 7): no ve nada del panel ---------------------------
select pg_temp.como('30000000-0000-0000-0000-0000000000c1', 'aal1');
select is((select count(*)::int from public.variantes), 0, 'clienta: 0 variantes');
select is((select count(*)::int from public.pedidos), 0, 'clienta: 0 pedidos');
select is((select count(*)::int from public.auditoria_panel), 0, 'clienta: 0 filas de auditoría');
select lives_ok('select * from public.catalogo_publico limit 1', 'clienta sí lee el catálogo público');
reset role;

-- panel_ajustar_stock (lo llama la Edge Function panel-stock) -----------------------
select is(public.panel_ajustar_stock(
  '[{"sku":"UL-ANGELES-N-BLUE-ANU-N","nuevo":9,"esperado":6},{"sku":"UL-CLOUD-GRAY-ANU-N","delta":-1}]',
  'ajuste', 'lote-prueba-0001', '30000000-0000-0000-0000-0000000000d1') ->> 'aplicadas', '2', 'ajuste de 2 SKU');
select results_eq($$select stock from public.variantes where sku in ('UL-ANGELES-N-BLUE-ANU-N', 'UL-CLOUD-GRAY-ANU-N') order by sku$$, array[9, 5], 'stock 6→9 y 6→5');
select throws_ok($$select public.panel_ajustar_stock('[{"sku":"UL-ANGELES-N-BLUE-ANU-N","nuevo":1}]', 'ajuste', 'lote-prueba-0001', '30000000-0000-0000-0000-0000000000d1')$$,
  'P0001', 'lote_ya_aplicado', 'el mismo lote no se aplica dos veces');
select throws_ok($$select public.panel_ajustar_stock('[{"sku":"UL-SIRI-BLUE-ANU-N","nuevo":1},{"sku":"UL-ANGELES-N-BLUE-ANU-N","nuevo":3,"esperado":6}]', 'ajuste', 'lote-prueba-0002', '30000000-0000-0000-0000-0000000000d1')$$,
  'P0001', 'ajuste_con_problemas', 'si el stock cambió desde la vista previa → conflicto');
select is((select stock from public.variantes where sku = 'UL-SIRI-BLUE-ANU-N'), 4, '…y no se aplicó NINGUNA fila del lote (todo o nada)');
select throws_ok($$select public.panel_ajustar_stock('[{"sku":"NO-EXISTE","nuevo":1}]', 'ajuste', 'lote-prueba-0003', '30000000-0000-0000-0000-0000000000d1')$$,
  'P0001', 'ajuste_con_problemas', 'SKU inexistente → no se aplica');
select is((select count(*)::int from public.auditoria_panel where accion = 'ajustar_stock'), 2, 'cada ajuste aplicado quedó en auditoría');

-- aplicar_catalogo: reimportar no duplica stock -------------------------------------
select is((public.aplicar_catalogo('{"marcas":[{"slug":"m-t","nombre":"M"}],"productos":[{"slug":"m-t-acc","marca":"m-t","nombre":"Acc","tipo":"accesorio"}],"variantes":[{"sku":"MT-ACC","producto":"m-t-acc","precio":50,"stock":4}]}') ->> 'stock_inicial')::int, 4, 'catálogo nuevo: stock inicial 4');
select is((public.aplicar_catalogo('{"marcas":[{"slug":"m-t","nombre":"M"}],"productos":[{"slug":"m-t-acc","marca":"m-t","nombre":"Acc","tipo":"accesorio"}],"variantes":[{"sku":"MT-ACC","producto":"m-t-acc","precio":60,"stock":4}]}') ->> 'stock_inicial')::int, 0, 'reimportar: stock inicial 0…');
select results_eq($$select stock, precio from public.variantes where sku = 'MT-ACC'$$, $$values (4, 60.00::numeric(10,2))$$, '…el stock sigue en 4 y el precio sí se actualiza');

select * from finish();
rollback;
