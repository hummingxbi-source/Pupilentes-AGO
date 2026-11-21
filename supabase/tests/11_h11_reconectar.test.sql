-- pgTAP · Fase 8 · H11: después de desconectar, la dueña puede volver a conectar la misma cuenta (ML y TikTok)
begin;
select plan(8);
create temp table u as select gen_random_uuid() as id;

select lives_ok($$select public.ml_guardar_tokens('777001', 'TIENDA', 'APP_USR-uno', 'TG-uno', now() + interval '6 hours')$$, 'ML: conecta');
select lives_ok($$select public.ml_desconectar((select id from u))$$, 'ML: desconecta');
select lives_ok($$select public.ml_guardar_tokens('777001', 'TIENDA', 'APP_USR-otra-vez', 'TG-otra-vez', now() + interval '6 hours')$$, 'ML: vuelve a conectar la misma cuenta');
select is(public.ml_leer_tokens() ->> 'access', 'APP_USR-otra-vez', 'ML: con los tokens nuevos');

select lives_ok($$select public.tt_guardar_tokens('7494000000000000001', 'TIENDA', 'TTP_uno', 'TTP_R_uno', now() + interval '7 days', 'cipher_1')$$, 'TikTok: conecta');
select lives_ok($$select public.tt_desconectar((select id from u))$$, 'TikTok: desconecta');
select lives_ok($$select public.tt_guardar_tokens('7494000000000000001', 'TIENDA', 'TTP_otra_vez', 'TTP_R_otra_vez', now() + interval '7 days', 'cipher_1')$$, 'TikTok: vuelve a conectar la misma cuenta');
select is(public.tt_leer_tokens() ->> 'access', 'TTP_otra_vez', 'TikTok: con los tokens nuevos');

select * from finish();
rollback;
