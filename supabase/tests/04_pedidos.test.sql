-- pgTAP · Fase 3 · pedidos y pagos (ARQUITECTURA §3.3, §6.3)
begin;
select plan(44);

create function pg_temp.pedido(p_clave text, p_items jsonb, p_total numeric, p_metodo text default 'mercadopago', p_tel text default '5512345678')
returns jsonb language sql as $$
  select public.crear_pedido(jsonb_build_object(
    'clave_idempotencia', p_clave, 'metodo_pago', p_metodo, 'items', p_items,
    'entrega', jsonb_build_object('tipo', 'metro', 'zona', 'Pantitlán'),
    'contacto', jsonb_build_object('nombre', 'Ana Prueba', 'telefono', p_tel, 'correo', 'ana@prueba.mx'),
    'total_visto', p_total))
$$;
create function pg_temp.stock(p_sku text) returns text language sql as $$ select stock || '/' || stock_reservado from public.variantes where sku = p_sku $$;
create function pg_temp.estado(p_folio text) returns text language sql as $$ select estado || '/' || pago_estado from public.pedidos where folio = p_folio $$;

-- Permisos ------------------------------------------------------------------------
select ok(not has_function_privilege('anon', 'public.crear_pedido(jsonb)', 'execute'), 'anon no crea pedidos por RPC (va por pedidos-crear con Turnstile)');
select ok(not has_function_privilege('authenticated', 'public.registrar_pago_mp(jsonb)', 'execute'), 'nadie marca pagos por RPC');
select ok(not has_function_privilege('authenticated', 'public.panel_validar_transferencia(uuid, boolean, uuid, text)', 'execute'), 'aprobar transferencias solo vía Edge Function');
select ok(not has_function_privilege('anon', 'public.rastrear_por_folio(text, text)', 'execute'), 'rastreo por folio solo vía Edge Function (con límite)');
select ok(not has_function_privilege('anon', 'public.panel_alertas()', 'execute'), 'anon no ve alertas');
set local role anon;
select lives_ok('select * from public.entregas_publicas', 'anon lee las tarifas de entrega públicas');
select throws_ok('select * from public.config_tienda', '42501', null, 'anon no lee la configuración (CLABE, etc.)');
reset role;

-- Precio y envío en servidor ----------------------------------------------------------
select throws_ok($$select pg_temp.pedido('clave-prueba-000001', '[{"sku":"UL-CLOUD-GRAY-ANU-N","cantidad":1}]', 1)$$, 'P0001', 'total_cambio',
  'total alterado en el navegador → total_cambio (no crea nada)');
select is((public.crear_pedido('{"clave_idempotencia":"clave-prueba-000002","metodo_pago":"mercadopago","items":[{"sku":"UL-HONEY-BROWN-ANU-N","cantidad":1,"precio":1}],"entrega":{"tipo":"metro","zona":"Pantitlán"},"contacto":{"nombre":"Ana","telefono":"5500000009"},"total_visto":"799.00","precio":1,"total":1}') ->> 'total')::numeric,
  799.00, 'aunque el navegador mande "precio": 1, se cobra el precio de la BD');
select is((pg_temp.pedido('clave-prueba-000003', '[{"sku":"UL-CLOUD-GRAY-ANU-N","cantidad":1}]', 799) ->> 'total')::numeric, 799.00, 'pedido válido: total = precio de la BD + envío Metro gratis');
select is(pg_temp.stock('UL-CLOUD-GRAY-ANU-N'), '6/1', 'se apartó 1 par');
select throws_ok($$select public.crear_pedido('{"clave_idempotencia":"clave-prueba-000004","metodo_pago":"mercadopago","items":[{"sku":"UL-CLOUD-GRAY-ANU-N","cantidad":1}],"entrega":{"tipo":"didi","zona":"Marte"},"contacto":{"nombre":"Ana","telefono":"5512345678"},"total_visto":"874"}')$$,
  'P0001', 'entrega_invalida', 'zona de entrega inventada → rechazada');
select is((public.crear_pedido('{"clave_idempotencia":"clave-prueba-000005","metodo_pago":"mercadopago","items":[{"sku":"UL-CLOUD-GRAY-ANU-N","cantidad":1}],"entrega":{"tipo":"didi","zona":"Iztacalco"},"contacto":{"nombre":"Ana","telefono":"5598765432"},"total_visto":"874"}') ->> 'envio')::numeric,
  75.00, 'DiDi Iztacalco: envío $75 calculado en servidor');

-- Idempotencia y topes --------------------------------------------------------------
select is(pg_temp.pedido('clave-prueba-000003', '[{"sku":"UL-CLOUD-GRAY-ANU-N","cantidad":1}]', 799) ->> 'repetido', 'true', 'misma clave → mismo pedido (doble toque)');
select is(pg_temp.stock('UL-CLOUD-GRAY-ANU-N'), '6/2', 'y no apartó otro par');
select throws_ok($$select pg_temp.pedido('clave-prueba-000006', '[{"sku":"UL-CLOUD-GRAY-ANU-N","cantidad":-2}]', -1598)$$, 'P0001', 'demasiadas_piezas', 'cantidad negativa → rechazada');
select throws_ok($$select pg_temp.pedido('clave-prueba-000007', '[{"sku":"UL-CLOUD-GRAY-ANU-N","cantidad":40}]', 31960)$$, 'P0001', 'demasiadas_piezas', 'cantidad enorme → rechazada');
select throws_ok($$select pg_temp.pedido('clave-prueba-000008', '[{"sku":"NO-EXISTE","cantidad":1}]', 1)$$, 'P0001', 'sku_no_disponible', 'SKU inventado → rechazado');
select lives_ok($$select pg_temp.pedido('clave-prueba-000009', '[{"sku":"UL-SIRI-BLUE-ANU-N","cantidad":1}]', 799)$$, '2.º pendiente del mismo teléfono');
select lives_ok($$select pg_temp.pedido('clave-prueba-000010', '[{"sku":"UL-SIRI-BLUE-ANU-N","cantidad":1}]', 799)$$, '3.º pendiente');
select throws_ok($$select pg_temp.pedido('clave-prueba-000011', '[{"sku":"UL-SIRI-BLUE-ANU-N","cantidad":1}]', 799)$$, 'P0001', 'demasiados_pendientes',
  '4.º pedido sin pagar del mismo teléfono → bloqueado (no se acapara el inventario)');
select throws_ok($$select pg_temp.pedido('clave-prueba-000012', '[{"sku":"UL-STORM-GRAY-ANU-M800","cantidad":1}]', 799, 'mercadopago', '5500000001')$$, 'P0001', 'sin_stock', 'agotado → sin_stock, sin pedido');
select is((select count(*)::int from public.pedidos where clave_idempotencia = 'clave-prueba-000012'), 0, 'el pedido sin stock no quedó guardado');

-- Webhook de Mercado Pago (ya verificado y consultado) ---------------------------------
create temp table f as select folio, id from public.pedidos where clave_idempotencia = 'clave-prueba-000003';
select is(public.registrar_pago_mp(jsonb_build_object('id', '111', 'status', 'approved', 'transaction_amount', 1, 'currency_id', 'MXN', 'external_reference', (select id from f))) ->> 'resultado',
  'monto_distinto', 'pago aprobado pero con monto distinto → NO se confirma');
select is(pg_temp.estado((select folio from f)), 'pendiente_pago/pendiente', '…el pedido sigue pendiente');
select is((select count(*)::int from privado.alertas where tipo = 'monto_distinto'), 1, '…y hay alerta');
select is(public.registrar_pago_mp(jsonb_build_object('id', '112', 'status', 'approved', 'transaction_amount', 799, 'currency_id', 'USD', 'external_reference', (select id from f))) ->> 'resultado',
  'monto_distinto', 'moneda distinta → NO se confirma');
select is(public.registrar_pago_mp(jsonb_build_object('id', '113', 'status', 'approved', 'transaction_amount', 799, 'currency_id', 'MXN', 'external_reference', (select id from f))) ->> 'resultado',
  'pagado', 'pago aprobado con monto y moneda correctos → pagado');
select is(pg_temp.stock('UL-CLOUD-GRAY-ANU-N'), '5/1', 'stock baja 6→5 y libera lo apartado');
select is(public.registrar_pago_mp(jsonb_build_object('id', '113', 'status', 'approved', 'transaction_amount', 799, 'currency_id', 'MXN', 'external_reference', (select id from f))) ->> 'resultado',
  'pagado', 'el mismo aviso otra vez…');
select is(pg_temp.stock('UL-CLOUD-GRAY-ANU-N'), '5/1', '…no descuenta dos veces');

-- SPEI pendiente: se extiende la reserva --------------------------------------------
create temp table g as select (pg_temp.pedido('clave-prueba-000013', '[{"sku":"UL-GEMINI-HAZEL-ANU-N","cantidad":1}]', 799, 'mercadopago', '5511112222') ->> 'id')::uuid as id;
select is(public.registrar_pago_mp(jsonb_build_object('id', '114', 'status', 'pending', 'payment_type_id', 'bank_transfer', 'transaction_amount', 799, 'currency_id', 'MXN',
  'external_reference', (select id from g), 'date_of_expiration', (now() + interval '2 days')::text)) ->> 'resultado', 'pendiente', 'SPEI pendiente');
select ok((select expira_en from public.reservas_stock where pedido_id = (select id from g)) > now() + interval '1 day', 'la reserva se extendió hasta el vencimiento del SPEI');

-- Pago tardío: la reserva venció y otra persona compró la última pieza -------------------
create temp table h as select (pg_temp.pedido('clave-prueba-000014', '[{"sku":"UL-CHELSEA-BLUE-ANU-M450","cantidad":2}]', 1598, 'mercadopago', '5533334444') ->> 'id')::uuid as id;
update public.reservas_stock set expira_en = now() - interval '1 minute' where pedido_id = (select id from h);
select is(public.liberar_reservas_vencidas() >= 1, true, 'el cron libera la reserva vencida');
select is((select estado from public.pedidos where id = (select id from h)), 'expirado', '…y el pedido queda expirado');
select ok(public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M450'), -1, 'venta', 'ml:prueba:tardio', 'ml'), 'mientras, se vende 1 en ML (quedan 1 de 2)');
select is(public.registrar_pago_mp(jsonb_build_object('id', '115', 'status', 'approved', 'transaction_amount', 1598, 'currency_id', 'MXN', 'external_reference', (select id from h))) ->> 'resultado',
  'pagado_sin_stock', 'el pago llega tarde y ya no alcanza → pagado_sin_stock');
select is((select count(*)::int from privado.alertas where tipo = 'pagado_sin_stock'), 1, '…con alerta para reembolsar');

-- Contracargo -------------------------------------------------------------------------
select is(public.registrar_pago_mp(jsonb_build_object('id', '113', 'status', 'charged_back', 'transaction_amount', 799, 'currency_id', 'MXN', 'external_reference', (select id from f))) ->> 'resultado',
  'contracargo', 'contracargo');
select is((select estado || '/' || no_entregar from public.pedidos where id = (select id from f)), 'contracargo/true', '…pedido marcado "no entregar"');

-- Transferencia ------------------------------------------------------------------------
create temp table t as select (pg_temp.pedido('clave-prueba-000015', '[{"sku":"UL-CHELSEA-BLUE-ANU-N","cantidad":1}]', 799, 'transferencia', '5544445555')) as r;
select ok((select (r ->> 'expira')::timestamptz from t) > now() + interval '23 hours', 'transferencia: apartado de 24 h (D3)');
select is(public.avisar_transferencia((select r ->> 'token' from t), null) ->> 'estado', 'pendiente_validacion', 'la clienta avisa que ya transfirió');
select is(public.panel_validar_transferencia((select (r ->> 'id')::uuid from t), true, null, 'ok'), 'pagado', 'la dueña aprueba → pagado y stock confirmado');

-- Máquina de estados --------------------------------------------------------------------
select throws_ok($$select public.cambiar_estado_pedido((select (r ->> 'id')::uuid from t), 'pendiente_pago')$$, 'P0001', 'transicion_invalida', 'de pagado no se regresa a pendiente');

select * from finish();
rollback;
