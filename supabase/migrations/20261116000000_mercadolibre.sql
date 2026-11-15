-- =============================================================================
-- Fase 5 · Mercado Libre (ARQUITECTURA §3.3 B, §5 Fase 5)
--
--   OAuth (panel-ml) → tokens en Supabase Vault; el access token dura 6 h y solo vale el ÚLTIMO
--   refresh token [ML: autenticación] → un solo proceso refresca a la vez (concesión con caducidad).
--   Venta en ML → webhook-mercadolibre / cron → GET /orders/{id} → ml_registrar_orden → mover_stock.
--   Cambio de stock nuestro → cola_sync → cron → PUT /items/{id} (solo si la sincronización está ACTIVA).
--
-- Regla de seguridad del inventario: la sincronización hacia ML nace APAGADA. Las ventas de ML
-- descuentan de nuestra BD desde el día 1, pero nuestro stock no se publica en ML hasta que la
-- dueña lo active (si no, el catálogo semilla sobrescribiría el stock real de sus publicaciones).
-- Publicaciones con Full (bodega de ML): el stock lo administra ML y no se edita por API [ML: stock
-- distribuido]; sus ventas NO tocan nuestro inventario físico y nunca se les empuja stock.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Configuración y estado de la integración
-- ---------------------------------------------------------------------------
alter table public.config_tienda
  add column ml_sync_activo boolean not null default false,
  add column ml_colchon     integer not null default 0 check (ml_colchon between 0 and 50);   -- ⚠️ lo decide la clienta (§8)
grant update (ml_colchon) on public.config_tienda to authenticated;   -- ml_sync_activo solo vía panel-ml (auditado)

alter table privado.integraciones
  add column estado            text not null default 'conectada' check (estado in ('conectada', 'requiere_autorizar')),
  add column nombre            text check (length(nombre) <= 120),
  add column refrescando_hasta timestamptz,
  add column actualizado_en    timestamptz not null default now();

alter table public.publicaciones_canal
  add column logistica      text not null default 'propia' check (logistica in ('propia', 'full')),
  add column titulo         text check (length(titulo) <= 200),
  add column ultimo_publicado integer,
  add column ultimo_error   text check (length(ultimo_error) <= 300);

-- Estados de OAuth (protección CSRF): ligados a quien inició, 10 min de vida
create table privado.oauth_estados (
  estado    text primary key check (estado ~ '^[0-9a-f]{64}$'),
  canal     text not null check (canal in ('ml', 'tiktok')),
  usuario   uuid not null,
  creado_en timestamptz not null default now()
);
alter table privado.oauth_estados enable row level security;
revoke all on privado.oauth_estados from public, anon, authenticated;

create function public.oauth_crear_estado(p_canal text, p_usuario uuid)
returns text
language plpgsql security definer set search_path = '' as
$$
declare v text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');   -- 64 hex, igual que token_rastreo
begin
  delete from privado.oauth_estados where creado_en < now() - interval '10 minutes';
  insert into privado.oauth_estados (estado, canal, usuario) values (v, p_canal, p_usuario);
  return v;
end
$$;

-- Un estado sirve una sola vez, solo para quien lo creó y solo 10 min
create function public.oauth_consumir_estado(p_canal text, p_estado text, p_usuario uuid)
returns boolean
language sql security definer set search_path = '' as
$$
  with x as (
    delete from privado.oauth_estados
     where estado = p_estado and canal = p_canal and usuario = p_usuario and creado_en > now() - interval '10 minutes'
    returning 1)
  select exists (select 1 from x)
$$;

-- ---------------------------------------------------------------------------
-- Tokens en Vault (nunca en una tabla ni en logs)
-- ---------------------------------------------------------------------------
create function public.ml_guardar_tokens(p_cuenta text, p_nombre text, p_access text, p_refresh text, p_expira timestamptz)
returns void
language plpgsql security definer set search_path = '' as
$$
declare v_id uuid; v_secreto text := jsonb_build_object('access', p_access, 'refresh', p_refresh)::text;
begin
  if p_cuenta !~ '^[0-9]{1,20}$' or coalesce(p_access, '') = '' or coalesce(p_refresh, '') = '' then
    raise exception 'tokens_invalidos' using errcode = 'P0001';
  end if;
  select secreto_vault into v_id from privado.integraciones where canal = 'ml' for update;
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

create function public.ml_leer_tokens()
returns jsonb
language sql stable security definer set search_path = '' as
$$
  select jsonb_build_object('cuenta', i.cuenta_externa, 'nombre', i.nombre, 'expira', i.expira_en, 'estado', i.estado,
                            'access', s.decrypted_secret::jsonb ->> 'access', 'refresh', s.decrypted_secret::jsonb ->> 'refresh')
  from privado.integraciones i join vault.decrypted_secrets s on s.id = i.secreto_vault
  where i.canal = 'ml'
$$;

-- Concesión para refrescar: solo un proceso a la vez (el refresh token es de un solo uso)
create function public.ml_tomar_refresco()
returns boolean
language sql security definer set search_path = '' as
$$
  with x as (
    update privado.integraciones set refrescando_hasta = now() + interval '30 seconds'
     where canal = 'ml' and (refrescando_hasta is null or refrescando_hasta < now())
    returning 1)
  select exists (select 1 from x)
$$;

create function public.ml_requiere_autorizar(p_motivo text)
returns void
language plpgsql security definer set search_path = '' as
$$
begin
  update privado.integraciones set estado = 'requiere_autorizar', refrescando_hasta = null, actualizado_en = now() where canal = 'ml';
  if not exists (select 1 from privado.alertas where tipo = 'ml_token' and not atendida) then
    insert into privado.alertas (tipo, detalle) values ('ml_token', jsonb_build_object('motivo', left(p_motivo, 200)));
  end if;
end
$$;

create function public.ml_desconectar(p_usuario uuid)
returns void
language plpgsql security definer set search_path = '' as
$$
declare v_id uuid;
begin
  select secreto_vault into v_id from privado.integraciones where canal = 'ml';
  delete from privado.integraciones where canal = 'ml';
  -- Se vacía el secreto (las funciones de Vault no borran; así no queda ningún token guardado)
  if v_id is not null then perform vault.update_secret(v_id, '{}'); end if;
  update public.config_tienda set ml_sync_activo = false where id;   -- safeupdate exige WHERE
  insert into public.auditoria_panel (usuario, accion, tabla, registro) values (p_usuario, 'ml_desconectar', 'integraciones', 'ml');
end
$$;

-- ---------------------------------------------------------------------------
-- Ventas de ML → nuestro inventario. Idempotente por orden + ítem + variación.
-- p_orden = { id, status, items: [{ item_id, variation_id, cantidad }] }
-- ---------------------------------------------------------------------------
create function public.ml_registrar_orden(p_orden jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as
$$
declare
  v_id     text := p_orden ->> 'id';
  v_status text := p_orden ->> 'status';
  v_it     record;
  v_pub    public.publicaciones_canal;
  v_ref    text;
  v_n      integer := 0;
  v_sin    integer := 0;
begin
  if v_id !~ '^[0-9]{1,20}$' then raise exception 'orden_invalida' using errcode = 'P0001'; end if;
  for v_it in
    select x.item_id, nullif(x.variation_id, '') as variation_id, x.cantidad
    from jsonb_to_recordset(p_orden -> 'items') as x(item_id text, variation_id text, cantidad integer)
  loop
    if v_it.cantidad is null or v_it.cantidad < 1 or v_it.cantidad > 1000 then continue; end if;
    select * into v_pub from public.publicaciones_canal
     where canal = 'ml' and id_externo_item = v_it.item_id and id_externo_variante is not distinct from v_it.variation_id;
    if not found then
      v_sin := v_sin + 1;
      if not exists (select 1 from privado.alertas where tipo = 'ml_sin_vincular' and not atendida and detalle ->> 'item' = v_it.item_id
                       and detalle ->> 'variacion' is not distinct from v_it.variation_id) then
        insert into privado.alertas (tipo, detalle)
        values ('ml_sin_vincular', jsonb_build_object('item', v_it.item_id, 'variacion', v_it.variation_id, 'orden', v_id));
      end if;
      continue;
    end if;
    if v_pub.logistica = 'full' then continue; end if;   -- salió de la bodega de ML, no de la nuestra
    v_ref := 'ml:' || v_id || ':' || v_it.item_id || ':' || coalesce(v_it.variation_id, '-');
    if v_status = 'paid' then
      if public.mover_stock(v_pub.variante_id, -v_it.cantidad, 'venta', v_ref, 'ml') then v_n := v_n + 1; end if;
    elsif v_status = 'cancelled' and exists (select 1 from public.movimientos_stock where ref_externa = v_ref) then
      -- ⚠️ Se asume que una venta cancelada en ML no salió de la tienda (confirmar con la clienta)
      if public.mover_stock(v_pub.variante_id, v_it.cantidad, 'devolucion', 'ml-cancel:' || substr(v_ref, 4), 'ml') then v_n := v_n + 1; end if;
    end if;
  end loop;
  return jsonb_build_object('movimientos', v_n, 'sin_vincular', v_sin, 'status', v_status);
end
$$;

-- ---------------------------------------------------------------------------
-- Vinculación de publicaciones ↔ variantes (panel-ml, dueña). No empuja stock por sí sola.
-- ---------------------------------------------------------------------------
create function public.ml_vincular(p_sku text, p_item text, p_variacion text, p_logistica text, p_titulo text, p_usuario uuid)
returns uuid
language plpgsql security definer set search_path = '' as
$$
declare v_var uuid; v_id uuid;
begin
  if p_item !~ '^ML[A-Z][0-9]{4,20}$' or (p_variacion is not null and p_variacion !~ '^[0-9]{1,20}$') then
    raise exception 'publicacion_invalida' using errcode = 'P0001';
  end if;
  select id into v_var from public.variantes where sku = p_sku;
  if v_var is null then raise exception 'sku_no_existe' using errcode = 'P0001'; end if;
  insert into public.publicaciones_canal (variante_id, canal, id_externo_item, id_externo_variante, logistica, titulo, activo)
  values (v_var, 'ml', p_item, p_variacion, coalesce(p_logistica, 'propia'), left(p_titulo, 200), true)
  on conflict (canal, id_externo_item, id_externo_variante) do update
    set variante_id = excluded.variante_id, logistica = excluded.logistica, titulo = excluded.titulo, activo = true, ultimo_error = null
  returning id into v_id;
  insert into public.auditoria_panel (usuario, accion, tabla, registro, despues)
  values (p_usuario, 'ml_vincular', 'publicaciones_canal', p_item || coalesce(':' || p_variacion, ''), jsonb_build_object('sku', p_sku, 'logistica', p_logistica));
  return v_id;
end
$$;

create function public.ml_desvincular(p_publicacion uuid, p_usuario uuid)
returns void
language plpgsql security definer set search_path = '' as
$$
declare v_pub public.publicaciones_canal;
begin
  update public.publicaciones_canal set activo = false where id = p_publicacion and canal = 'ml' returning * into v_pub;
  if not found then raise exception 'publicacion_no_existe' using errcode = 'P0001'; end if;
  insert into public.auditoria_panel (usuario, accion, tabla, registro) values (p_usuario, 'ml_desvincular', 'publicaciones_canal', v_pub.id_externo_item);
end
$$;

create function public.ml_activar_sync(p_activo boolean, p_usuario uuid)
returns void
language plpgsql security definer set search_path = '' as
$$
begin
  if p_activo and not exists (select 1 from privado.integraciones where canal = 'ml' and estado = 'conectada') then
    raise exception 'ml_no_conectado' using errcode = 'P0001';
  end if;
  update public.config_tienda set ml_sync_activo = p_activo where id;   -- safeupdate exige WHERE
  if p_activo then   -- al activar se publica TODO lo vinculado (la BD es la fuente de verdad)
    insert into privado.cola_sync (variante_id, canal)
    select distinct variante_id, 'ml' from public.publicaciones_canal where canal = 'ml' and activo and logistica = 'propia'
    on conflict (variante_id, canal) do update set intentos = 0, proximo_intento = now(), error = null;
  end if;
  insert into public.auditoria_panel (usuario, accion, tabla, registro, despues)
  values (p_usuario, 'ml_sync', 'config_tienda', 'ml', jsonb_build_object('activo', p_activo));
end
$$;

-- ---------------------------------------------------------------------------
-- Cola de salida hacia ML (la procesa el cron)
-- ---------------------------------------------------------------------------
-- Pendientes con lo que hay que publicar: disponible = físico − apartado − colchón (§3.2)
create function public.ml_tomar_cola(p_limite integer default 20)
returns table (variante_id uuid, disponible integer, item text, variacion text)
language plpgsql security definer set search_path = '' as
$$
begin
  if not (select ml_sync_activo from public.config_tienda) then return; end if;
  -- Reconciliación diaria: lo que no se ha publicado en 24 h vuelve a la cola
  insert into privado.cola_sync (variante_id, canal)
  select distinct pc.variante_id, 'ml' from public.publicaciones_canal pc
   where pc.canal = 'ml' and pc.activo and pc.logistica = 'propia' and (pc.ultimo_sync is null or pc.ultimo_sync < now() - interval '1 day')
  on conflict do nothing;
  return query
    with due as (
      select c.variante_id from privado.cola_sync c
       where c.canal = 'ml' and c.proximo_intento <= now() order by c.proximo_intento limit p_limite)
    select v.id, greatest(0, v.stock - v.stock_reservado - (select ml_colchon from public.config_tienda))::integer,
           pc.id_externo_item, pc.id_externo_variante
    from due join public.variantes v on v.id = due.variante_id
    join public.publicaciones_canal pc on pc.variante_id = v.id and pc.canal = 'ml' and pc.activo and pc.logistica = 'propia';
end
$$;

-- p_resultados = [{ variante_id, item, variacion, ok, publicado, error }]
create function public.ml_cola_resultados(p_resultados jsonb)
returns void
language plpgsql security definer set search_path = '' as
$$
declare r record;
begin
  for r in select * from jsonb_to_recordset(p_resultados) as x(variante_id uuid, item text, variacion text, ok boolean, publicado integer, error text) loop
    update public.publicaciones_canal
       set ultimo_sync = case when r.ok then now() else ultimo_sync end,
           ultimo_publicado = case when r.ok then r.publicado else ultimo_publicado end,
           ultimo_error = case when r.ok then null else left(r.error, 300) end
     where canal = 'ml' and id_externo_item = r.item and id_externo_variante is not distinct from nullif(r.variacion, '');
  end loop;
  -- La variante sale de la cola si TODAS sus publicaciones quedaron bien; si no, reintento con espera creciente
  delete from privado.cola_sync c where c.canal = 'ml' and c.variante_id in (
    select (x ->> 'variante_id')::uuid from jsonb_array_elements(p_resultados) x
    group by 1 having bool_and((x ->> 'ok')::boolean));
  update privado.cola_sync c
     set intentos = intentos + 1, proximo_intento = now() + make_interval(mins => least(60, (2 ^ least(intentos, 6))::integer)),
         error = (select left(x ->> 'error', 300) from jsonb_array_elements(p_resultados) x
                  where (x ->> 'variante_id')::uuid = c.variante_id and not (x ->> 'ok')::boolean limit 1)
   where c.canal = 'ml' and c.variante_id in (
     select (x ->> 'variante_id')::uuid from jsonb_array_elements(p_resultados) x where not (x ->> 'ok')::boolean);
  insert into privado.alertas (tipo, detalle)
  select 'ml_sync_fallido', jsonb_build_object('sku', v.sku, 'error', c.error)
  from privado.cola_sync c join public.variantes v on v.id = c.variante_id
  where c.canal = 'ml' and c.intentos = 5;
end
$$;

-- ---------------------------------------------------------------------------
-- Permisos: todo solo para las Edge Functions
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'public.oauth_crear_estado(text, uuid)', 'public.oauth_consumir_estado(text, text, uuid)',
    'public.ml_guardar_tokens(text, text, text, text, timestamptz)', 'public.ml_leer_tokens()', 'public.ml_tomar_refresco()',
    'public.ml_requiere_autorizar(text)', 'public.ml_desconectar(uuid)', 'public.ml_registrar_orden(jsonb)',
    'public.ml_vincular(text, text, text, text, text, uuid)', 'public.ml_desvincular(uuid, uuid)', 'public.ml_activar_sync(boolean, uuid)',
    'public.ml_tomar_cola(integer)', 'public.ml_cola_resultados(jsonb)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
