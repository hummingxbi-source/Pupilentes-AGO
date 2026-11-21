-- =============================================================================
-- Hallazgo H11 (Fase 8 · F2, D15): después de "Desconectar", volver a conectar la MISMA cuenta de
-- Mercado Libre o TikTok tronaba (500, secrets_name_idx): *_desconectar borra la integración pero deja el
-- secreto de Vault (vacío) con su nombre, y *_guardar_tokens intentaba crearlo otra vez.
-- Mismo cuerpo que en las migraciones de la Fase 5 y 6 + reuso del secreto por nombre.
-- =============================================================================
create or replace function public.ml_guardar_tokens(p_cuenta text, p_nombre text, p_access text, p_refresh text, p_expira timestamptz)
returns void
language plpgsql security definer set search_path = '' as
$$
declare v_id uuid; v_secreto text := jsonb_build_object('access', p_access, 'refresh', p_refresh)::text;
begin
  if p_cuenta !~ '^[0-9]{1,20}$' or coalesce(p_access, '') = '' or coalesce(p_refresh, '') = '' then
    raise exception 'tokens_invalidos' using errcode = 'P0001';
  end if;
  select secreto_vault into v_id from privado.integraciones where canal = 'ml' for update;
  -- Tras *_desconectar la fila de integraciones ya no existe, pero el secreto (vacío) sigue con su nombre:
  -- se reusa en vez de crear otro con el mismo nombre (hallazgo H11).
  if v_id is null then select id into v_id from vault.secrets where name = 'ml_tokens_' || p_cuenta; end if;
  if v_id is not null and exists (select 1 from vault.secrets where id = v_id) then
    perform vault.update_secret(v_id, v_secreto);
  else
    v_id := vault.create_secret(v_secreto, 'ml_tokens_' || p_cuenta, 'Tokens OAuth de Mercado Libre (Fase 5)');
  end if;
  insert into privado.integraciones (canal, cuenta_externa, nombre, expira_en, secreto_vault, estado, refrescando_hasta, actualizado_en)
  values ('ml', p_cuenta, p_nombre, p_expira, v_id, 'conectada', null, now())
  on conflict (canal) do update
    set cuenta_externa = excluded.cuenta_externa, nombre = coalesce(excluded.nombre, privado.integraciones.nombre),
        expira_en = excluded.expira_en, secreto_vault = excluded.secreto_vault, estado = 'conectada',
        refrescando_hasta = null, actualizado_en = now();
end
$$;

create or replace function public.tt_guardar_tokens(p_cuenta text, p_nombre text, p_access text, p_refresh text, p_expira timestamptz, p_cipher text)
returns void
language plpgsql security definer set search_path = '' as
$$
declare v_id uuid; v_secreto text := jsonb_build_object('access', p_access, 'refresh', p_refresh, 'cipher', p_cipher)::text;
begin
  if p_cuenta !~ '^[0-9]{1,30}$' or coalesce(p_access, '') = '' or coalesce(p_refresh, '') = '' or coalesce(p_cipher, '') = '' then
    raise exception 'tokens_invalidos' using errcode = 'P0001';
  end if;
  select secreto_vault into v_id from privado.integraciones where canal = 'tiktok' for update;
  -- Tras *_desconectar la fila de integraciones ya no existe, pero el secreto (vacío) sigue con su nombre:
  -- se reusa en vez de crear otro con el mismo nombre (hallazgo H11).
  if v_id is null then select id into v_id from vault.secrets where name = 'tt_tokens_' || p_cuenta; end if;
  if v_id is not null and exists (select 1 from vault.secrets where id = v_id) then
    perform vault.update_secret(v_id, v_secreto);
  else
    v_id := vault.create_secret(v_secreto, 'tt_tokens_' || p_cuenta, 'Tokens OAuth de TikTok Shop (Fase 6)');
  end if;
  insert into privado.integraciones (canal, cuenta_externa, nombre, expira_en, secreto_vault, estado, refrescando_hasta, actualizado_en)
  values ('tiktok', p_cuenta, p_nombre, p_expira, v_id, 'conectada', null, now())
  on conflict (canal) do update
    set cuenta_externa = excluded.cuenta_externa, nombre = coalesce(excluded.nombre, privado.integraciones.nombre),
        expira_en = excluded.expira_en, secreto_vault = excluded.secreto_vault, estado = 'conectada',
        refrescando_hasta = null, actualizado_en = now();
end
$$;
