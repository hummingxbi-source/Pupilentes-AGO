-- =============================================================================
-- Fase 0 · Cimientos de la base de datos
-- ARQUITECTURA §3.2 y §6.1 (reglas 2 y 4).
--
-- 1. Funciones cerradas por defecto. En Postgres toda función nueva es ejecutable
--    por PUBLIC, y Supabase además concede EXECUTE a anon y authenticated en el
--    esquema public [27]. Aquí se revoca por defecto: cada función que deba
--    llamarse desde la API se concede a propósito en su propia migración.
-- 2. Esquema `privado`: no se expone por la API de datos (config.toml solo
--    expone public y graphql_public). Solo lo tocan las Edge Functions a través
--    de funciones de `public` concedidas únicamente a service_role.
-- 3. Infraestructura mínima que usan las Edge Functions desde la Fase 0:
--    límite de peticiones (_shared/limite.ts) y latidos de tareas programadas.
-- =============================================================================

-- 1. EXECUTE cerrado por defecto -------------------------------------------------
-- El EXECUTE de PUBLIC es un privilegio por defecto global: los ALTER DEFAULT
-- PRIVILEGES "IN SCHEMA" solo pueden sumar a lo global, no quitarlo. Por eso PUBLIC
-- se revoca sin IN SCHEMA, y anon/authenticated (que Supabase concede por esquema)
-- se revocan en el esquema public. La prueba pgTAP 00_cimientos lo comprueba.
alter default privileges revoke execute on functions from public;
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

-- 2. Esquema privado ------------------------------------------------------------
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;
grant usage on schema privado to service_role;

alter default privileges in schema privado revoke all on tables from public, anon, authenticated;
alter default privileges in schema privado revoke all on sequences from public, anon, authenticated;
alter default privileges in schema privado revoke execute on functions from anon, authenticated;

-- 3a. Límite de peticiones ------------------------------------------------------
-- Ventana fija: (clave, inicio de ventana) → conteo. La clave la arma la función
-- (p. ej. 'ip:1.2.3.4:pedidos-crear', 'folio:AGO-104:rastrear').
create table privado.limites_tasa (
  clave    text        not null check (length(clave) between 1 and 200),
  ventana  timestamptz not null,
  conteo   integer     not null default 0,
  primary key (clave, ventana)
);
alter table privado.limites_tasa enable row level security;
-- Sin políticas: nadie de la API puede leerla. service_role salta RLS.
create index limites_tasa_ventana_idx on privado.limites_tasa (ventana);

-- Suma 1 a la clave en la ventana actual y dice si aún está dentro del máximo.
-- Atómica: el upsert resuelve la concurrencia dentro de Postgres.
create function public.consumir_limite(p_clave text, p_ventana_seg integer, p_maximo integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inicio timestamptz;
  v_conteo integer;
begin
  if p_ventana_seg is null or p_ventana_seg < 1 or p_ventana_seg > 86400 then
    raise exception 'ventana inválida: %', p_ventana_seg using errcode = '22023';
  end if;
  if p_maximo is null or p_maximo < 1 then
    raise exception 'máximo inválido: %', p_maximo using errcode = '22023';
  end if;
  v_inicio := to_timestamp(floor(extract(epoch from now()) / p_ventana_seg) * p_ventana_seg);

  insert into privado.limites_tasa as l (clave, ventana, conteo)
  values (p_clave, v_inicio, 1)
  on conflict (clave, ventana) do update set conteo = l.conteo + 1
  returning l.conteo into v_conteo;

  return v_conteo <= p_maximo;
end;
$$;
revoke execute on function public.consumir_limite(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consumir_limite(text, integer, integer) to service_role;

-- 3b. Latidos de tareas programadas ----------------------------------------------
-- Cada corrida del cron deja su marca; en la Fase 3 una alerta revisa "cron sin correr".
create table privado.latidos (
  nombre          text        primary key check (length(nombre) between 1 and 60),
  ultima_corrida  timestamptz not null default now(),
  detalle         jsonb
);
alter table privado.latidos enable row level security;

create function public.registrar_latido(p_nombre text, p_detalle jsonb default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into privado.latidos (nombre, ultima_corrida, detalle)
  values (p_nombre, now(), p_detalle)
  on conflict (nombre) do update set ultima_corrida = excluded.ultima_corrida, detalle = excluded.detalle;
$$;
revoke execute on function public.registrar_latido(text, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_latido(text, jsonb) to service_role;

-- Limpieza de ventanas viejas (la llama el cron).
create function public.limpiar_limites_tasa()
returns integer
language sql
security definer
set search_path = ''
as $$
  with borradas as (
    delete from privado.limites_tasa where ventana < now() - interval '1 day' returning 1
  )
  select count(*)::integer from borradas;
$$;
revoke execute on function public.limpiar_limites_tasa() from public, anon, authenticated;
grant execute on function public.limpiar_limites_tasa() to service_role;
