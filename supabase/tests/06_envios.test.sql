-- pgTAP · Fase 4 · envíos por paquetería (cotización en servidor, guías y rastreo)
begin;
select plan(27);

-- Permisos ------------------------------------------------------------------------------
select ok(not has_function_privilege('anon', 'public.guardar_cotizaciones(text, integer, jsonb)', 'execute'), 'anon no guarda cotizaciones');
select ok(not has_function_privilege('authenticated', 'public.envio_reservar_guia(uuid, uuid)', 'execute'), 'guías solo vía envios-guia');
select ok(not has_function_privilege('authenticated', 'public.registrar_rastreo_envio(text, text, text)', 'execute'), 'rastreo solo vía webhook-envia');
select is((select count(*)::int from public.entregas_publicas where tipo = 'paqueteria'), 0, 'la paquetería ya no tiene tarifa fija pública');

-- Cotización guardada ------------------------------------------------------------------------
update public.config_tienda set envio_cargo_extra = 10;   -- ⚠️ solo para la prueba (por defecto 0)
create temp table q as select public.guardar_cotizaciones('06600', 1,
  '[{"carrier":"Estafeta","servicio":"ground","descripcion":"Terrestre","entrega":"3-5 días","costo":"125.50"},
    {"carrier":"dhl","servicio":"express","costo":"210"}]') as r;
select is(jsonb_array_length((select r from q)), 2, 'guarda las dos opciones');
select is(((select r from q) -> 0 ->> 'precio')::numeric, 135.50, 'precio = costo de Envia + cargo extra, ordenado del más barato');
select is((select r from q) -> 0 ->> 'carrier', 'estafeta', 'paquetería en minúsculas');
create temp table cot as select ((select r from q) -> 0 ->> 'id')::uuid as id;

create function pg_temp.pedido_paq(p_clave text, p_cot uuid, p_cp text, p_cant int, p_total numeric, p_dir boolean default true)
returns jsonb language sql as $$
  select public.crear_pedido(jsonb_build_object(
    'clave_idempotencia', p_clave, 'metodo_pago', 'transferencia',
    'items', jsonb_build_array(jsonb_build_object('sku', 'UL-OCEAN-BLUE-ANU-N', 'cantidad', p_cant)),
    'entrega', jsonb_build_object('tipo', 'paqueteria', 'zona', 'Paquetería', 'cotizacion', p_cot)
               || case when p_dir then jsonb_build_object('direccion_envio', jsonb_build_object(
                    'calle', 'Av. Siempre Viva 742', 'colonia', 'Roma Norte', 'ciudad', 'Cuauhtémoc', 'estado', 'Ciudad de México', 'cp', p_cp))
                  else '{}'::jsonb end,
    'contacto', jsonb_build_object('nombre', 'Ana Envío', 'telefono', '55' || lpad((random() * 1e8)::int::text, 8, '0')),
    'total_visto', p_total))
$$;

-- crear_pedido con paquetería -------------------------------------------------------------------
select throws_ok($$select pg_temp.pedido_paq('clave-envio-000001', (select id from cot), '06600', 1, 1)$$, 'P0001', 'total_cambio',
  'el total incluye el envío cotizado (no el del navegador)');
create temp table p1 as select pg_temp.pedido_paq('clave-envio-000002', (select id from cot), '06600', 1, 934.50) as r;
select is(((select r from p1) ->> 'envio')::numeric, 135.50, 'envío = precio de la cotización guardada');
select is((select entrega ->> 'carrier' || '/' || (entrega ->> 'servicio') from public.pedidos where id = ((select r from p1) ->> 'id')::uuid),
  'estafeta/ground', 'el pedido guarda paquetería y servicio para la guía');
select throws_ok($$select pg_temp.pedido_paq('clave-envio-000003', (select id from cot), '01000', 1, 934.50)$$, 'P0001', 'cotizacion_no_coincide',
  'otro código postal → hay que volver a cotizar');
select throws_ok($$select pg_temp.pedido_paq('clave-envio-000004', (select id from cot), '06600', 2, 1733.50)$$, 'P0001', 'cotizacion_no_coincide',
  'otra cantidad de piezas (otro peso) → hay que volver a cotizar');
select throws_ok($$select pg_temp.pedido_paq('clave-envio-000005', (select id from cot), '06600', 1, 934.50, false)$$, 'P0001', 'direccion_invalida',
  'sin dirección completa no hay guía posible');
select throws_ok($$select pg_temp.pedido_paq('clave-envio-000006', gen_random_uuid(), '06600', 1, 934.50)$$, 'P0001', 'cotizacion_vencida',
  'cotización inventada → rechazada');
update privado.cotizaciones_envio set expira_en = now() - interval '1 minute' where id = ((select r from q) -> 1 ->> 'id')::uuid;
select throws_ok(format($$select pg_temp.pedido_paq('clave-envio-000007', %L, '06600', 1, 1009)$$, (select r from q) -> 1 ->> 'id'), 'P0001', 'cotizacion_vencida',
  'cotización vencida → rechazada');
select throws_ok($$select public.crear_pedido('{"clave_idempotencia":"clave-envio-000008","metodo_pago":"transferencia","items":[{"sku":"UL-OCEAN-BLUE-ANU-N","cantidad":1}],"entrega":{"tipo":"paqueteria","zona":"Estándar"},"contacto":{"nombre":"Ana","telefono":"5599990000"},"total_visto":938}')$$,
  'P0001', 'direccion_invalida', 'la tarifa fija vieja de paquetería ya no sirve');

-- Guía ----------------------------------------------------------------------------------------
create temp table ped as select ((select r from p1) ->> 'id')::uuid as id;
select throws_ok($$select public.envio_reservar_guia((select id from ped), null)$$, 'P0001', 'pedido_no_listo', 'sin pagar no hay guía');
do $x$ begin perform public.panel_validar_transferencia((select id from ped), true, null, 'ok'); end $x$;
create temp table g as select public.envio_reservar_guia((select id from ped), null) as r;
select is((select r from g) ->> 'piezas', '1', 'la reserva devuelve lo que necesita la guía');
select is((select estado from public.pedidos where id = (select id from ped)), 'preparando', 'al generar la guía el pedido pasa a preparando');
select throws_ok($$select public.envio_reservar_guia((select id from ped), null)$$, 'P0001', 'guia_existente', 'doble clic → no compra otra guía');
do $x$ begin perform public.envio_marcar_error(((select r from g) ->> 'envio')::uuid, 'Envia no respondió'); end $x$;
select lives_ok($$select public.envio_reservar_guia((select id from ped), null)$$, 'si la anterior falló, se puede reintentar');
select lives_ok($$select public.envio_guardar_guia((select id from public.envios where pedido_id = (select id from ped) and estado = 'generando'), null,
  '{"guia":"EST123456","url_rastreo":"https://rastreo.example/EST123456","costo":"125.50","id_externo":"777"}')$$, 'se guarda la guía');

-- Rastreo -------------------------------------------------------------------------------------
select is(public.registrar_rastreo_envio('EST123456', 'en_camino', 'In transit') ->> 'resultado', 'enviado', 'en camino → pedido enviado');
select is(public.registrar_rastreo_envio('EST123456', 'entregado', 'Delivered') ->> 'resultado', 'entregado', 'entregado → pedido entregado');
select is((select estado from public.pedidos where id = (select id from ped)), 'entregado', '…y así queda el pedido');
select is(public.registrar_rastreo_envio('NO-EXISTE-1', 'entregado', 'Delivered') ->> 'resultado', 'guia_desconocida', 'guía ajena → no toca ningún pedido');
select ok(exists (select 1 from privado.alertas where tipo = 'envio_desconocido'), '…y deja alerta');

select * from finish();
rollback;
