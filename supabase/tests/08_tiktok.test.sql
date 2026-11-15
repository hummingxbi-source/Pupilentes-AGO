-- pgTAP · Fase 6 · TikTok Shop (mismo esquema que ML; aquí lo propio de TikTok)
begin;
select plan(14);

select ok(not has_function_privilege('authenticated', 'public.tt_leer_tokens()', 'execute'), 'nadie lee los tokens de TikTok por RPC');
select ok(not has_function_privilege('anon', 'public.tt_registrar_orden(jsonb)', 'execute'), 'anon no registra ventas de TikTok');
select is((select tt_sync_activo from public.config_tienda), false, 'la sincronización hacia TikTok nace APAGADA');

select lives_ok($$select public.tt_guardar_tokens('7494000000000000001', 'AGO', 'TTP_uno', 'TTP_R_uno', now() + interval '7 days', 'ROW_cipher')$$, 'guarda tokens y shop_cipher');
select is(public.tt_leer_tokens() ->> 'cipher', 'ROW_cipher', 'el shop_cipher también vive en Vault');
select throws_ok($$select public.tt_guardar_tokens('7494000000000000001', 'AGO', 'TTP_uno', 'TTP_R_uno', now(), '')$$, 'P0001', 'tokens_invalidos', 'sin shop_cipher no se guarda');

create function pg_temp.st(p_sku text) returns integer language sql as $$ select stock from public.variantes where sku = p_sku $$;
create temp table s0 as select pg_temp.st('UL-SIRI-BLUE-ANU-N') as siri;
select throws_ok($$select public.tt_vincular('UL-SIRI-BLUE-ANU-N', '1730000000000000001', null, 'propia', null, null)$$, 'P0001', 'publicacion_invalida',
  'en TikTok se vincula por SKU (sin SKU → rechazado)');
select lives_ok($$select public.tt_vincular('UL-SIRI-BLUE-ANU-N', '1730000000000000001', '1730000000000000101', 'propia', 'Siri', null)$$, 'vincula producto + SKU');
select is(public.tt_registrar_orden('{"id":"5800000000000000009","status":"paid","items":[{"item_id":"1730000000000000001","variation_id":"1730000000000000101","cantidad":2}]}') ->> 'movimientos', '1',
  'venta pagada → un movimiento');
select is(pg_temp.st('UL-SIRI-BLUE-ANU-N'), (select siri from s0) - 2, 'baja 2 pares');
select is(public.tt_registrar_orden('{"id":"5800000000000000009","status":"paid","items":[{"item_id":"1730000000000000001","variation_id":"1730000000000000101","cantidad":2}]}') ->> 'movimientos', '0',
  'aviso repetido no descuenta de nuevo');
select is(public.tt_registrar_orden('{"id":"5800000000000000010","status":"sin_cambio","items":[{"item_id":"1730000000000000001","variation_id":"1730000000000000101","cantidad":1}]}') ->> 'movimientos', '0',
  'orden sin pagar (UNPAID) no mueve stock');
select is(public.tt_registrar_orden('{"id":"5800000000000000009","status":"cancelled","items":[{"item_id":"1730000000000000001","variation_id":"1730000000000000101","cantidad":2}]}') ->> 'movimientos', '1',
  'cancelada → regresa');
select ok(not exists (select 1 from public.publicaciones_canal where canal = 'ml' and id_externo_item = '1730000000000000001'),
  'los vínculos de TikTok no se mezclan con los de ML');

select * from finish();
rollback;
