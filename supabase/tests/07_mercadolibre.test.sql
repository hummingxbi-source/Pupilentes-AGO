-- pgTAP · Fase 5 · Mercado Libre (tokens en Vault, ventas → inventario, cola de publicación)
begin;
select plan(27);

-- Permisos ------------------------------------------------------------------------------
select ok(not has_function_privilege('authenticated', 'public.ml_leer_tokens()', 'execute'), 'nadie lee los tokens de ML por RPC');
select ok(not has_function_privilege('anon', 'public.ml_registrar_orden(jsonb)', 'execute'), 'anon no registra ventas de ML');
select ok(not has_function_privilege('authenticated', 'public.ml_activar_sync(boolean, uuid)', 'execute'), 'activar la sincronización solo vía panel-ml');
select is((select ml_sync_activo from public.config_tienda), false, 'la sincronización hacia ML nace APAGADA');

-- Tokens en Vault --------------------------------------------------------------------------
select lives_ok($$select public.ml_guardar_tokens('777001', 'TIENDA', 'APP_USR-uno', 'TG-uno', now() + interval '6 hours')$$, 'guarda tokens');
select is(public.ml_leer_tokens() ->> 'access', 'APP_USR-uno', 'se leen desde Vault');
select is((select count(*)::int from privado.integraciones where canal = 'ml' and secreto_vault is not null), 1, 'la tabla solo guarda el id del secreto');
select ok(not exists (select 1 from privado.integraciones i where row_to_json(i)::text like '%APP_USR%'), 'ningún token en texto plano en la tabla');
select lives_ok($$select public.ml_guardar_tokens('777001', null, 'APP_USR-dos', 'TG-dos', now() + interval '6 hours')$$, 'refresco: reemplaza el secreto');
select is(public.ml_leer_tokens() ->> 'refresh', 'TG-dos', 'queda solo el último refresh token');
select is(public.ml_tomar_refresco(), true, 'el primero gana la concesión para refrescar');
select is(public.ml_tomar_refresco(), false, 'el segundo no (el refresh token es de un solo uso)');

-- Vinculación y ventas ---------------------------------------------------------------------
create function pg_temp.st(p_sku text) returns integer language sql as $$ select stock from public.variantes where sku = p_sku $$;
create temp table s0 as select pg_temp.st('UL-MINT-GREEN-ANU-N') as mint, pg_temp.st('UL-BREEZE-HAZEL-ANU-N') as breeze;
select lives_ok($$select public.ml_vincular('UL-MINT-GREEN-ANU-N', 'MLM555001', '9001', 'propia', 'Mint en ML', null)$$, 'vincula una variación de ML');
select lives_ok($$select public.ml_vincular('UL-BREEZE-HAZEL-ANU-N', 'MLM555002', null, 'full', 'Breeze en Full', null)$$, 'vincula una publicación con Full');
select is((select count(*)::int from privado.cola_sync where canal = 'ml'), 0, 'vincular no empuja stock por sí solo');

select is(public.ml_registrar_orden('{"id":"3000000001","status":"paid","items":[{"item_id":"MLM555001","variation_id":"9001","cantidad":2}]}') ->> 'movimientos', '1',
  'venta pagada en ML → un movimiento');
select is(pg_temp.st('UL-MINT-GREEN-ANU-N'), (select mint from s0) - 2, 'baja 2 pares del inventario');
select is(public.ml_registrar_orden('{"id":"3000000001","status":"paid","items":[{"item_id":"MLM555001","variation_id":"9001","cantidad":2}]}') ->> 'movimientos', '0',
  'el mismo aviso otra vez no descuenta de nuevo');
select is(public.ml_registrar_orden('{"id":"3000000001","status":"cancelled","items":[{"item_id":"MLM555001","variation_id":"9001","cantidad":2}]}') ->> 'movimientos', '1',
  'cancelada → regresa');
select is(pg_temp.st('UL-MINT-GREEN-ANU-N'), (select mint from s0), '…y el inventario vuelve a como estaba');
select is(public.ml_registrar_orden('{"id":"3000000002","status":"paid","items":[{"item_id":"MLM555002","variation_id":"","cantidad":1}]}') ->> 'movimientos', '0',
  'venta de Full no toca nuestro inventario físico');
select is(public.ml_registrar_orden('{"id":"3000000003","status":"paid","items":[{"item_id":"MLM999999","variation_id":"","cantidad":1}]}') ->> 'sin_vincular', '1',
  'publicación sin vincular → no se adivina la variante…');
select ok(exists (select 1 from privado.alertas where tipo = 'ml_sin_vincular' and detalle ->> 'item' = 'MLM999999'), '…y queda alerta');

-- Cola de publicación ------------------------------------------------------------------------
select is((select count(*)::int from public.ml_tomar_cola(20)), 0, 'con la sincronización apagada no se publica nada');
update public.config_tienda set ml_colchon = 1;
do $x$ begin perform public.ml_activar_sync(true, null); end $x$;
select is((select count(*)::int from privado.cola_sync c join public.variantes v on v.id = c.variante_id where c.canal = 'ml' and v.sku = 'UL-BREEZE-HAZEL-ANU-N'), 0,
  'al activar, lo de Full no entra a la cola');
create temp table cola as select * from public.ml_tomar_cola(20);
select is((select disponible from cola where item = 'MLM555001'), (select greatest(0, stock - stock_reservado - 1) from public.variantes where sku = 'UL-MINT-GREEN-ANU-N'),
  'se publica el disponible menos el colchón');
select is((select variacion from cola where item = 'MLM555001'), '9001', 'con su variación de ML');

select * from finish();
rollback;
