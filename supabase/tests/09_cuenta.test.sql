-- pgTAP · Fase 7 · cuenta de clienta y puntos (ARQUITECTURA §6.3, §8)
begin;
select plan(43);

-- Usuarios: A y B con correo verificado, U sin verificar, P del panel
insert into auth.users (id, email, email_confirmed_at) values
  ('70000000-0000-0000-0000-00000000000a', 'Ana@Cuenta.mx', now()),
  ('70000000-0000-0000-0000-00000000000b', 'bea@cuenta.mx', now()),
  ('70000000-0000-0000-0000-00000000000c', 'sinverificar@cuenta.mx', null),
  ('70000000-0000-0000-0000-00000000000d', 'duena7@cuenta.mx', now());
insert into public.perfiles_panel (user_id, rol) values ('70000000-0000-0000-0000-00000000000d', 'duena');

create function pg_temp.pedido(p_clave text, p_sku text, p_total numeric, p_cuenta uuid default null, p_puntos integer default 0,
                               p_tel text default '5577000001', p_correo text default '')
returns jsonb language sql as $$
  select public.crear_pedido(jsonb_build_object(
    'clave_idempotencia', p_clave, 'metodo_pago', 'mercadopago', 'items', jsonb_build_array(jsonb_build_object('sku', p_sku, 'cantidad', 1)),
    'entrega', jsonb_build_object('tipo', 'metro', 'zona', 'Pantitlán'),
    'contacto', jsonb_build_object('nombre', 'Ana Cuenta', 'telefono', p_tel, 'correo', p_correo),
    'total_visto', p_total, 'cuenta_id', p_cuenta, 'puntos', p_puntos))
$$;
create function pg_temp.pagar(p_pedido uuid, p_id text) returns text language sql as $$
  select public.registrar_pago_mp(jsonb_build_object('id', p_id, 'status', 'approved', 'currency_id', 'MXN', 'external_reference', p_pedido,
                                                     'transaction_amount', (select total from public.pedidos where id = p_pedido))) ->> 'resultado'
$$;
create function pg_temp.saldo(p_user uuid) returns integer language sql as $$
  select coalesce(sum(m.delta), 0)::int from public.puntos_movimientos m join public.clientas c on c.id = m.clienta_id where c.auth_user_id = p_user
$$;
create function pg_temp.como(p_sub text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_sub, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create temp table ids (k text primary key, v uuid);
grant select on ids to authenticated;

-- Permisos --------------------------------------------------------------------------------
select ok(not has_function_privilege('authenticated', 'public.cuenta_resumen(uuid)', 'execute'), 'una sesión no pide el resumen de nadie por RPC (va por la función cuenta)');
select ok(not has_function_privilege('anon', 'public.cuenta_vincular(uuid)', 'execute'), 'anon no vincula cuentas');
select ok(not has_function_privilege('authenticated', 'public.cuenta_guardar_perfil(uuid, jsonb)', 'execute'), 'una sesión no edita perfiles por RPC');
select ok(not has_function_privilege('service_role', 'privado.conciliar_puntos(uuid)', 'execute'), 'nadie de la API mueve puntos directo');

-- Quién puede tener cuenta -----------------------------------------------------------------
select throws_ok($$select public.cuenta_vincular('70000000-0000-0000-0000-00000000000c')$$, 'P0001', 'correo_sin_verificar', 'correo sin verificar → sin cuenta');
select throws_ok($$select public.cuenta_vincular('70000000-0000-0000-0000-00000000000d')$$, 'P0001', 'cuenta_de_panel', 'una cuenta del panel no es cuenta de clienta');

-- Pedidos de invitada antes de crear la cuenta ------------------------------------------------
insert into ids select 'inv_correo', (pg_temp.pedido('cuenta-prueba-00001', 'UL-ANGELES-N-BLUE-ANU-N', 799, p_correo => 'ana@cuenta.mx') ->> 'id')::uuid;
insert into ids select 'inv_tel',    (pg_temp.pedido('cuenta-prueba-00002', 'UL-ANGELES-N-BLUE-ANU-N', 799, p_correo => 'otra@persona.mx') ->> 'id')::uuid;
select is(pg_temp.pagar((select v from ids where k = 'inv_correo'), '7001'), 'pagado', 'pedido de invitada pagado');

select is((public.cuenta_vincular('70000000-0000-0000-0000-00000000000a') ->> 'vinculados')::int, 1, 'al entrar se asocia el pedido de invitada con su mismo correo');
select is((select cuenta_id from public.pedidos where id = (select v from ids where k = 'inv_tel')), null,
  'el pedido con su teléfono pero OTRO correo no se asocia (ligado por teléfono sin verificar, §8)');
select is((select cuenta_ligada_por from public.pedidos where id = (select v from ids where k = 'inv_correo')), 'correo', 'queda marcado como ligado por correo');
select is(pg_temp.saldo('70000000-0000-0000-0000-00000000000a'), 79, 'el pedido ya pagado suma sus puntos: ⌊799 / 10⌋ = 79');
select is((public.cuenta_vincular('70000000-0000-0000-0000-00000000000a') ->> 'vinculados')::int, 0, 'vincular otra vez no repite nada');
select is(pg_temp.saldo('70000000-0000-0000-0000-00000000000a'), 79, '…ni duplica puntos');
select lives_ok($$select public.cuenta_vincular('70000000-0000-0000-0000-00000000000b')$$, 'B crea su cuenta');

-- Resumen: del pedido ligado por correo no salen contacto ni dirección ------------------------
select is((public.cuenta_resumen('70000000-0000-0000-0000-00000000000a') ->> 'saldo')::int, 79, 'resumen: saldo');
select is(jsonb_array_length(public.cuenta_resumen('70000000-0000-0000-0000-00000000000a') -> 'pedidos'), 1, 'resumen: un pedido');
select ok(not (public.cuenta_resumen('70000000-0000-0000-0000-00000000000a') #> '{pedidos,0}' ? 'contacto')
          and not (public.cuenta_resumen('70000000-0000-0000-0000-00000000000a') #> '{pedidos,0,entrega}' ? 'zona'),
  'resumen: el pedido ligado por correo no expone contacto ni entrega');
select is(public.cuenta_resumen('70000000-0000-0000-0000-00000000000a') #>> '{pedidos,0,items,0,sku}', 'UL-ANGELES-N-BLUE-ANU-N', 'resumen: trae los SKU para recomprar');

-- RLS: cada quien lo suyo --------------------------------------------------------------------
select pg_temp.como('70000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.clientas), 1, 'A ve solo su fila de clientas');
select is((select count(*)::int from public.puntos_movimientos), 1, 'A ve sus movimientos de puntos');
select is((select count(*)::int from public.pedidos), 0, 'el pedido ligado por correo no se lee directo (solo por el resumen)');
reset role;
select pg_temp.como('70000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.puntos_movimientos), 0, 'B no ve los puntos de A');
select is((select count(*)::int from public.clientas where auth_user_id = '70000000-0000-0000-0000-00000000000a'), 0, 'B no ve la fila de A');
select is((select count(*)::int from public.pedidos where cuenta_id = '70000000-0000-0000-0000-00000000000a'), 0, 'B no ve pedidos de A');
reset role;

-- Canje en el servidor --------------------------------------------------------------------------
select throws_ok($$select pg_temp.pedido('cuenta-prueba-00003', 'UL-ANGELES-N-BLUE-ANU-N', 789, null, 20)$$, 'P0001', 'puntos_sin_cuenta', 'sin cuenta no se usan puntos');
select throws_ok($$select pg_temp.pedido('cuenta-prueba-00004', 'UL-ANGELES-N-BLUE-ANU-N', 749, '70000000-0000-0000-0000-00000000000a', 100)$$,
  'P0001', 'puntos_insuficientes', 'más puntos de los que tiene → rechazado');
select throws_ok($$select pg_temp.pedido('cuenta-prueba-00005', 'UL-ANGELES-N-BLUE-ANU-N', 349, '70000000-0000-0000-0000-00000000000a', 900)$$,
  'P0001', 'puntos_excedidos', 'más del 50 % del subtotal → rechazado');
select throws_ok($$select pg_temp.pedido('cuenta-prueba-00006', 'UL-ANGELES-N-BLUE-ANU-N', 799, '70000000-0000-0000-0000-00000000000a', 60)$$,
  'P0001', 'total_cambio', 'el descuento lo calcula el servidor (total sin descuento → total_cambio)');

insert into ids select 'con_puntos', (pg_temp.pedido('cuenta-prueba-00007', 'UL-ANGELES-N-BLUE-ANU-N', 769, '70000000-0000-0000-0000-00000000000a', 60) ->> 'id')::uuid;
select is((select descuento || '/' || puntos_usados || '/' || total || '/' || cuenta_ligada_por from public.pedidos where id = (select v from ids where k = 'con_puntos')),
  '30.00/60/769.00/sesion', '60 puntos × $0.50 = $30 de descuento; pedido ligado por sesión');
select is(pg_temp.saldo('70000000-0000-0000-0000-00000000000a'), 19, 'los puntos se apartan al crear el pedido');
select throws_ok($$select pg_temp.pedido('cuenta-prueba-00008', 'UL-ANGELES-N-BLUE-ANU-N', 769, '70000000-0000-0000-0000-00000000000a', 60)$$,
  'P0001', 'puntos_insuficientes', 'los mismos puntos no se gastan dos veces');
select is((select correo from public.clientas where auth_user_id = '70000000-0000-0000-0000-00000000000a'), 'ana@cuenta.mx', 'la cuenta adoptó la fila de invitada con su correo');

select lives_ok($$select public.cancelar_pedido((select v from ids where k = 'con_puntos'))$$, 'el pedido se cancela');
select is(pg_temp.saldo('70000000-0000-0000-0000-00000000000a'), 79, 'cancelado → los puntos regresan');

-- Pago y reembolso ------------------------------------------------------------------------------
insert into ids select 'pagado', (pg_temp.pedido('cuenta-prueba-00009', 'UL-ANGELES-N-BLUE-ANU-N', 769, '70000000-0000-0000-0000-00000000000a', 60) ->> 'id')::uuid;
select pg_temp.pagar((select v from ids where k = 'pagado'), '7002');
select is(pg_temp.saldo('70000000-0000-0000-0000-00000000000a'), 95, 'pagado: 79 − 60 + ⌊(799 − 30) / 10⌋ = 95');
select lives_ok($$select privado.conciliar_puntos((select v from ids where k = 'pagado')); select privado.conciliar_puntos((select v from ids where k = 'pagado'))$$,
  'conciliar de nuevo no hace nada');
select is(pg_temp.saldo('70000000-0000-0000-0000-00000000000a'), 95, '…el saldo no cambia');
select public.panel_registrar_reembolso((select v from ids where k = 'pagado'), '70000000-0000-0000-0000-00000000000d', 'r-7');
select is(pg_temp.saldo('70000000-0000-0000-0000-00000000000a'), 79, 'reembolso: regresan los 60 usados y se quitan los 76 ganados');

-- Perfil y bono -----------------------------------------------------------------------------------
select throws_ok($$select public.cuenta_guardar_perfil('70000000-0000-0000-0000-00000000000a', '{"nombre":"A"}')$$, 'P0001', 'perfil_invalido', 'nombre de 1 letra → rechazado');
select is((public.cuenta_guardar_perfil('70000000-0000-0000-0000-00000000000a', '{"nombre":"Ana Cuenta","cumpleanos":"1995-04-12"}') ->> 'bono')::boolean, true,
  'perfil completo con una compra pagada → bono');
select is((public.cuenta_guardar_perfil('70000000-0000-0000-0000-00000000000a', '{"nombre":"Ana C.","cumpleanos":"1990-01-01"}') ->> 'bono')::boolean, false, 'el bono es una sola vez');
select is((public.cuenta_guardar_perfil('70000000-0000-0000-0000-00000000000b', '{"nombre":"Bea","cumpleanos":"1999-09-09"}') ->> 'bono')::boolean, false,
  'sin compras pagadas no hay bono (crear correos no regala descuentos)');
select throws_ok($$update public.puntos_movimientos set delta = 9999$$, '42501', null, 'la bitácora de puntos no se edita');

select * from finish();
rollback;
