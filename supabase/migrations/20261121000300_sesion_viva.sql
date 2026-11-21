-- =============================================================================
-- Hallazgo H16 (Fase 8 · F3, S12): al cerrar sesión en el panel (a mano o por 30 min de inactividad), el token
-- seguía sirviendo hasta que vencía (1 h): las Edge Functions solo validan la firma (getClaims) y RLS no mira
-- si la sesión existe. Ahora el panel exige una sesión VIVA (la fila de auth.sessions del session_id del token):
--   · RLS: seguridad.mfa_ok() (la usan la política restrictiva y es_panel) también lo exige.
--   · Edge Functions: exigirPanel llama a public.sesion_vigente() (solo service_role).
-- La cuenta de clienta no cambia (su token solo le deja ver lo suyo).
-- =============================================================================
create or replace function seguridad.sesion_viva()
returns boolean
language sql stable security definer set search_path = '' as
$$
  select exists (
    select 1 from auth.sessions s
     where s.id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid
       and s.user_id = (select auth.uid())
       and (s.not_after is null or s.not_after > now()))
$$;
revoke execute on function seguridad.sesion_viva() from public, anon;
grant execute on function seguridad.sesion_viva() to authenticated;

create or replace function seguridad.mfa_ok()
returns boolean
language sql stable set search_path = '' as
$$ select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2' and seguridad.sesion_viva() $$;

-- Para las Edge Functions (exigirPanel): ¿sigue viva la sesión de ese usuario?
create function public.sesion_vigente(p_sesion uuid, p_usuario uuid)
returns boolean
language sql stable security definer set search_path = '' as
$$
  select exists (select 1 from auth.sessions s where s.id = p_sesion and s.user_id = p_usuario and (s.not_after is null or s.not_after > now()))
$$;
revoke execute on function public.sesion_vigente(uuid, uuid) from public, anon, authenticated;
grant execute on function public.sesion_vigente(uuid, uuid) to service_role;
