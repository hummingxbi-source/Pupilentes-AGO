-- pgTAP · Fase 8 · H16: con la sesión cerrada, el token del panel ya no ve nada aunque tenga aal2
begin;
select plan(5);

create temp table u as select gen_random_uuid() as id, gen_random_uuid() as sesion;
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'h16@prueba.mx', '', now(), now(), now() from u;
insert into public.perfiles_panel (user_id, rol) select id, 'duena' from u;
insert into auth.sessions (id, user_id, created_at, updated_at, aal) select sesion, id, now(), now(), 'aal2' from u;
grant select on u to authenticated;

select ok(not has_function_privilege('authenticated', 'public.sesion_vigente(uuid, uuid)', 'execute'), 'solo service_role pregunta por sesiones ajenas');

-- Sesión viva: la dueña con aal2 ve los pedidos
set local role authenticated;
select set_config('request.jwt.claims', (select json_build_object('sub', id, 'role', 'authenticated', 'aal', 'aal2', 'session_id', sesion)::text from u), true);
select ok(seguridad.mfa_ok(), 'sesión viva + aal2 → mfa_ok');
select ok((select count(*) from public.config_tienda) = 1, 've la configuración');
reset role;

-- Cierra sesión (Supabase borra la fila de auth.sessions): el mismo token ya no ve nada
delete from auth.sessions where id = (select sesion from u);
set local role authenticated;
select set_config('request.jwt.claims', (select json_build_object('sub', id, 'role', 'authenticated', 'aal', 'aal2', 'session_id', sesion)::text from u), true);
select ok(not seguridad.mfa_ok(), 'sesión cerrada → mfa_ok falso');
select is((select count(*)::int from public.config_tienda), 0, 'ya no ve la configuración');
reset role;

select * from finish();
rollback;
