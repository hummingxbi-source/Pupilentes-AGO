-- =============================================================================
-- Hallazgo H13 (Fase 8 · F2, D15/K5): al cambiar el colchón de un canal, ML/TikTok seguían con el número
-- viejo hasta el siguiente cambio de stock o la reconciliación de 24 h. Ahora, si la sincronización de ese
-- canal está encendida, se encolan todas sus publicaciones activas (propias) y el cron las publica en su
-- siguiente pasada con disponible − colchón nuevo.
-- =============================================================================
create function privado.encolar_por_colchon()
returns trigger
language plpgsql security definer set search_path = '' as
$$
begin
  if new.ml_colchon is distinct from old.ml_colchon and new.ml_sync_activo then
    insert into privado.cola_sync (variante_id, canal, intentos, proximo_intento, error)
    select distinct pc.variante_id, 'ml', 0, now(), null from public.publicaciones_canal pc
     where pc.canal = 'ml' and pc.activo and pc.logistica = 'propia'
    on conflict (variante_id, canal) do update set intentos = 0, proximo_intento = now(), error = null;
  end if;
  if new.tt_colchon is distinct from old.tt_colchon and new.tt_sync_activo then
    insert into privado.cola_sync (variante_id, canal, intentos, proximo_intento, error)
    select distinct pc.variante_id, 'tiktok', 0, now(), null from public.publicaciones_canal pc
     where pc.canal = 'tiktok' and pc.activo and pc.logistica = 'propia'
    on conflict (variante_id, canal) do update set intentos = 0, proximo_intento = now(), error = null;
  end if;
  return null;
end
$$;
revoke execute on function privado.encolar_por_colchon() from public, anon, authenticated, service_role;

create trigger encolar_por_colchon after update of ml_colchon, tt_colchon on public.config_tienda
  for each row execute function privado.encolar_por_colchon();
