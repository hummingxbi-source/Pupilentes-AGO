-- pgTAP · Fase 8 · H14: un pedido que cae en pagado_sin_stock libera su apartado en ese momento (regla I1)
begin;
select plan(4);

create function pg_temp.pedido(p_clave text, p_items jsonb, p_total numeric)
returns jsonb language sql as $$
  select public.crear_pedido(jsonb_build_object(
    'clave_idempotencia', p_clave, 'metodo_pago', 'mercadopago', 'items', p_items,
    'entrega', jsonb_build_object('tipo', 'metro', 'zona', 'Pantitlán'),
    'contacto', jsonb_build_object('nombre', 'Ana Prueba', 'telefono', '5598765400', 'correo', 'ana@prueba.mx'),
    'total_visto', p_total))
$$;

-- La última pieza: la web la aparta y, mientras paga, se vende en ML
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-N'),
  1 - (select stock from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-N'), 'ajuste', 'h14:prep', 'panel');
create temp table p as select (pg_temp.pedido('h14-ultima-pieza-0001', '[{"sku":"UL-CHELSEA-BLUE-ANU-N","cantidad":1}]',
  (select precio from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-N')) ->> 'id')::uuid as id;
select ok(public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-N'), -1, 'venta', 'ml:h14:1', 'ml'), 'ML vende la pieza apartada');

select is(public.registrar_pago_mp(jsonb_build_object('id', '9914', 'status', 'approved',
  'transaction_amount', (select total from public.pedidos where id = (select id from p)), 'currency_id', 'MXN', 'external_reference', (select id from p))) ->> 'resultado',
  'pagado_sin_stock', 'el pago tardío cae en pagado_sin_stock');
select is((select count(*)::int from public.reservas_stock where pedido_id = (select id from p) and estado = 'activa'), 0, 'su apartado se libera en ese momento');
select is((select stock || '/' || stock_reservado from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-N'), '0/0', 'I1: stock 0 y apartado 0 (no 0/1)');

select * from finish();
rollback;
