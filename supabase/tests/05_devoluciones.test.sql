-- pgTAP · Fase 3 · devoluciones al inventario y estado protegido (ARQUITECTURA §3.3 E)
begin;
select plan(20);

create function pg_temp.pedido(p_clave text, p_sku text, p_total numeric, p_tel text)
returns uuid language sql as $$
  select (public.crear_pedido(jsonb_build_object(
    'clave_idempotencia', p_clave, 'metodo_pago', 'mercadopago',
    'items', jsonb_build_array(jsonb_build_object('sku', p_sku, 'cantidad', 1)),
    'entrega', jsonb_build_object('tipo', 'metro', 'zona', 'Pantitlán'),
    'contacto', jsonb_build_object('nombre', 'Ana Prueba', 'telefono', p_tel),
    'total_visto', p_total)) ->> 'id')::uuid
$$;
create function pg_temp.pago(p_pedido uuid, p_id text, p_status text, p_monto numeric default 799)
returns text language sql as $$
  select public.registrar_pago_mp(jsonb_build_object('id', p_id, 'status', p_status, 'transaction_amount', p_monto,
                                                     'currency_id', 'MXN', 'external_reference', p_pedido)) ->> 'resultado'
$$;
create function pg_temp.st(p_sku text) returns integer language sql as $$ select stock from public.variantes where sku = p_sku $$;
create function pg_temp.devs(p_pedido uuid) returns integer language sql as $$
  select count(*)::int from public.movimientos_stock where pedido_id = p_pedido and motivo = 'devolucion'
$$;

-- Permisos ------------------------------------------------------------------------------
select ok(not has_function_privilege('authenticated', 'public.panel_registrar_devolucion(uuid, uuid, text)', 'execute'),
  'devolver al inventario solo vía Edge Function (panel-pedidos)');
select ok(not has_function_privilege('service_role', 'privado.devolver_stock_pedido(uuid, uuid)', 'execute'),
  'la función interna de devolución no se llama directo');

-- A. Reembolso de Mercado Pago (webhook) de un pedido que no salió → el stock regresa solo -----
create temp table a as select pg_temp.pedido('clave-devol-0000001', 'UL-OCEAN-BLUE-ANU-N', 799, '5510000001') as id;
create temp table a0 as select pg_temp.st('UL-OCEAN-BLUE-ANU-N') as s;
select is(pg_temp.pago((select id from a), '9001', 'approved'), 'pagado', 'A: pagado');
select is(pg_temp.st('UL-OCEAN-BLUE-ANU-N'), (select s from a0) - 1, 'A: la venta descontó 1');
select is(pg_temp.pago((select id from a), '9001', 'refunded'), 'reembolsado', 'A: MP avisa reembolso');
select is(pg_temp.st('UL-OCEAN-BLUE-ANU-N'), (select s from a0), 'A: el par regresó al inventario');
select is(pg_temp.pago((select id from a), '9001', 'refunded'), 'reembolsado', 'A: el aviso repetido…');
select is(pg_temp.devs((select id from a)), 1, '…no devuelve dos veces');

-- B. Reembolso desde el panel de un pedido en preparación → regresa solo -------------------
create temp table b as select pg_temp.pedido('clave-devol-0000002', 'UL-BREEZE-GREEN-ANU-N', 799, '5510000002') as id;
do $x$ begin perform pg_temp.pago((select id from b), '9002', 'approved'); end $x$;
do $x$ begin perform public.cambiar_estado_pedido((select id from b), 'preparando'); end $x$;
create temp table b0 as select pg_temp.st('UL-BREEZE-GREEN-ANU-N') as s;
select is(public.panel_registrar_reembolso((select id from b), null, 'r-1', 'prueba'), 'reembolsado_stock_devuelto', 'B: reembolso en preparación');
select is(pg_temp.st('UL-BREEZE-GREEN-ANU-N'), (select s from b0) + 1, 'B: el par regresó');

-- C. Pedido ya enviado: el reembolso NO devuelve; la dueña confirma la devolución ------------
create temp table c as select pg_temp.pedido('clave-devol-0000003', 'UL-MINT-GREEN-ANU-N', 799, '5510000003') as id;
do $x$ begin perform pg_temp.pago((select id from c), '9003', 'approved'); end $x$;
do $x$ begin perform public.cambiar_estado_pedido((select id from c), 'enviado'); end $x$;
create temp table c0 as select pg_temp.st('UL-MINT-GREEN-ANU-N') as s;
select is(public.panel_registrar_reembolso((select id from c), null, 'r-2'), 'reembolsado', 'C: reembolso de un pedido enviado');
select is(pg_temp.st('UL-MINT-GREEN-ANU-N'), (select s from c0), 'C: el stock no cambia todavía');
select is(public.panel_registrar_devolucion((select id from c), null, 'regresó en buen estado'), 1, 'C: la dueña confirma que regresó vendible');
select is(pg_temp.st('UL-MINT-GREEN-ANU-N'), (select s from c0) + 1, 'C: ahora sí regresa el par');
select throws_ok($$select public.panel_registrar_devolucion((select id from c), null)$$, 'P0001', 'ya_devuelto', 'C: no se devuelve dos veces');

-- D. Contracargo de un pedido que no salió → regresa solo y queda "no entregar" -------------
create temp table d as select pg_temp.pedido('clave-devol-0000004', 'UL-SIRI-GREEN-ANU-N', 799, '5510000004') as id;
do $x$ begin perform pg_temp.pago((select id from d), '9004', 'approved'); end $x$;
create temp table d0 as select pg_temp.st('UL-SIRI-GREEN-ANU-N') as s;
select is(pg_temp.pago((select id from d), '9004', 'charged_back'), 'contracargo', 'D: contracargo');
select is(pg_temp.st('UL-SIRI-GREEN-ANU-N') || '/' || (select no_entregar from public.pedidos where id = (select id from d)),
  ((select s from d0) + 1) || '/true', 'D: el par regresó y el pedido quedó "no entregar"');

-- E. Pedido en un estado que no admite devolución ------------------------------------------
create temp table e as select pg_temp.pedido('clave-devol-0000005', 'UL-ANGELES-N-GREEN-ANU-N', 799, '5510000005') as id;
select throws_ok($$select public.panel_registrar_devolucion((select id from e), null)$$, 'P0001', 'pedido_no_devolvible',
  'E: un pedido pendiente no se "devuelve"');

-- F. Estado protegido ------------------------------------------------------------------------
select throws_ok($$update public.pedidos set estado = 'pagado' where id = (select id from e)$$, '42501', 'estado_protegido',
  'F: UPDATE libre de estado → bloqueado (solo cambiar_estado_pedido)');
select lives_ok($$update public.pedidos set nota_interna = 'cambiar otras columnas sí se puede' where id = (select id from e)$$,
  'F: el trigger solo cuida el estado');

select * from finish();
rollback;
