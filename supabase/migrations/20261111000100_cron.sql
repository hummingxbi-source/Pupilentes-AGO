-- =============================================================================
-- Fase 0 · Supabase Cron → Edge Function `cron-conciliar` cada 10 minutos
-- ARQUITECTURA §2 y §3.3 D. Patrón de Supabase: pg_cron + pg_net + Vault [20].
--
-- La URL del proyecto y el secreto del cron viven en Vault con estos nombres:
--   url_proyecto   → p. ej. https://<ref>.supabase.co  (local: ver seed.sql)
--   secreto_cron   → el mismo valor que el secret CRON_SECRET de las funciones
-- No se usa la llave secreta del proyecto: Supabase advierte que cualquier rol
-- que pueda entrar a la BD puede leerla mientras la petición espera [20]; un
-- secreto propio, que solo abre `cron-conciliar`, expone mucho menos.
-- Si los secretos no existen, la llamada se omite con un aviso (no falla).
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create function privado.llamar_funcion(p_nombre text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url     text;
  v_secreto text;
begin
  if p_nombre !~ '^[a-z0-9-]{1,60}$' then
    raise exception 'nombre de función inválido: %', p_nombre using errcode = '22023';
  end if;
  select decrypted_secret into v_url     from vault.decrypted_secrets where name = 'url_proyecto';
  select decrypted_secret into v_secreto from vault.decrypted_secrets where name = 'secreto_cron';
  if v_url is null or v_secreto is null then
    raise warning 'cron: faltan los secretos url_proyecto / secreto_cron en Vault; no se llamó a %', p_nombre;
    return null;
  end if;
  return net.http_post(
    url                  := rtrim(v_url, '/') || '/functions/v1/' || p_nombre,
    headers              := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secreto),
    body                 := jsonb_build_object('programado_en', now()),
    timeout_milliseconds := 10000
  );
end;
$$;
revoke execute on function privado.llamar_funcion(text) from public, anon, authenticated, service_role;

-- cron.schedule con el mismo nombre actualiza el trabajo si ya existe.
select cron.schedule(
  'conciliar-cada-10-min',
  '*/10 * * * *',
  $$ select privado.llamar_funcion('cron-conciliar') $$
);
