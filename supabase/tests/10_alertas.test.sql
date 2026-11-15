-- pgTAP · Fase 8 · alertas completas (tamaño de BD, respaldo atrasado, conciliación fallida)
begin;
select plan(10);

select ok(not has_function_privilege('authenticated', 'public.revisar_salud(integer)', 'execute'), 'solo el cron revisa la salud');
select ok(not has_function_privilege('anon', 'public.alerta_conciliacion(text, text)', 'execute'), 'anon no crea alertas');

select is(public.revisar_salud() -> 'alertas_nuevas', '[]'::jsonb, 'BD chica y sin respaldos todavía → sin alertas');
select is(public.revisar_salud(0) -> 'alertas_nuevas', '["bd_grande"]'::jsonb, 'BD por encima del límite → alerta bd_grande');
select is(public.revisar_salud(0) -> 'alertas_nuevas', '[]'::jsonb, 'la misma alerta no se repite cada 10 min');

select public.registrar_latido('respaldo', '{"archivo":"x"}');
select is(public.revisar_salud() -> 'alertas_nuevas', '[]'::jsonb, 'respaldo reciente → sin alerta');
update privado.latidos set ultima_corrida = now() - interval '2 days' where nombre = 'respaldo';
select is(public.revisar_salud() -> 'alertas_nuevas', '["respaldo_atrasado"]'::jsonb, 'respaldo de hace 2 días → alerta');

select is(public.alerta_conciliacion('ml', 'Mercado Libre 500'), true, 'paso de ML falló → alerta');
select is(public.alerta_conciliacion('tiktok', 'otra'), false, 'mientras no se atienda, no se repite');
select throws_ok($$select public.alerta_conciliacion('x', 'y')$$, 'P0001', 'canal_invalido', 'canal inventado → rechazado');

select * from finish();
rollback;
