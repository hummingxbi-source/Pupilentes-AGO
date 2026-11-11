-- pgTAP · Fase 0 · permisos base (ARQUITECTURA §6.3, §6.1 regla 4)
-- Corre con: supabase test db
begin;
select plan(17);

-- Esquema privado: existe y la API no lo ve
select has_schema('privado');
select ok(not has_schema_privilege('anon', 'privado', 'usage'), 'anon no usa el esquema privado');
select ok(not has_schema_privilege('authenticated', 'privado', 'usage'), 'authenticated no usa el esquema privado');
select ok(has_schema_privilege('service_role', 'privado', 'usage'), 'service_role sí usa el esquema privado');

-- Funciones de servicio: solo service_role
select ok(not has_function_privilege('anon', 'public.consumir_limite(text, integer, integer)', 'execute'), 'anon no ejecuta consumir_limite');
select ok(not has_function_privilege('authenticated', 'public.consumir_limite(text, integer, integer)', 'execute'), 'authenticated no ejecuta consumir_limite');
select ok(has_function_privilege('service_role', 'public.consumir_limite(text, integer, integer)', 'execute'), 'service_role ejecuta consumir_limite');
select ok(not has_function_privilege('anon', 'public.registrar_latido(text, jsonb)', 'execute'), 'anon no ejecuta registrar_latido');
select ok(not has_function_privilege('service_role', 'privado.llamar_funcion(text)', 'execute'), 'nadie de la API ejecuta privado.llamar_funcion');

-- EXECUTE cerrado por defecto: una función nueva en public no queda abierta [27]
create function public.prueba_por_defecto() returns int language sql as 'select 1';
select ok(not has_function_privilege('anon', 'public.prueba_por_defecto()', 'execute'), 'función nueva: anon sin EXECUTE por defecto');
select ok(not has_function_privilege('authenticated', 'public.prueba_por_defecto()', 'execute'), 'función nueva: authenticated sin EXECUTE por defecto');

-- Tablas privadas: ni anon ni authenticated las leen
select ok(not has_table_privilege('anon', 'privado.limites_tasa', 'select'), 'anon no lee limites_tasa');
select ok(not has_table_privilege('authenticated', 'privado.latidos', 'select'), 'authenticated no lee latidos');

-- consumir_limite: máximo 2 por ventana → 3.ª petición rechazada
select is(public.consumir_limite('prueba:fase0', 60, 2), true,  'límite: 1.ª petición pasa');
select is(public.consumir_limite('prueba:fase0', 60, 2), true,  'límite: 2.ª petición pasa');
select is(public.consumir_limite('prueba:fase0', 60, 2), false, 'límite: 3.ª petición se bloquea');

-- Cron programado
select ok(exists(select 1 from cron.job where jobname = 'conciliar-cada-10-min' and schedule = '*/10 * * * *'), 'cron conciliar cada 10 min programado');

select * from finish();
rollback;
