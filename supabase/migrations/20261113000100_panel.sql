-- =============================================================================
-- Fase 2 · Panel seguro (ARQUITECTURA §6.1 regla 11, §6.2, Fase 2)
--
-- · El rol vive SOLO en public.perfiles_panel ('duena' | 'ayudante').
-- · MFA forzado en la BD: una política RESTRICTIVA en cada tabla exige aal2 a
--   cualquier usuario del panel [26]. Con solo contraseña (aal1) no ve ni una fila,
--   aunque llame a la API directo. Las clientas (Fase 7) no son del panel: para
--   ellas esa política no aplica y solo verán lo que sus propias políticas permitan.
-- · Lectura: dueña y ayudante. Escritura directa: solo la dueña y solo columnas
--   seguras (precio, activo, textos). `stock` NUNCA: se ajusta con panel-stock →
--   panel_ajustar_stock → mover_stock.
-- · Auditoría: cada cambio hecho desde el panel queda en auditoria_panel (trigger).
-- =============================================================================

-- Funciones de seguridad para las políticas (envueltas en (select …) para que Postgres
-- las evalúe una vez por consulta y no una vez por fila). Esquema propio, no expuesto por la API
-- (config.toml solo expone public), con USAGE para authenticated porque las
-- políticas se evalúan con los permisos de quien consulta.
create schema seguridad;
revoke all on schema seguridad from public;
grant usage on schema seguridad to authenticated, service_role;

create function seguridad.rol_panel() returns text
language sql stable security definer set search_path = '' as
$$ select rol from public.perfiles_panel where user_id = (select auth.uid()) $$;

create function seguridad.mfa_ok() returns boolean
language sql stable set search_path = '' as
$$ select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2' $$;

create function seguridad.es_panel(p_roles text[]) returns boolean
language sql stable set search_path = '' as
$$ select coalesce(seguridad.rol_panel() = any (p_roles), false) and seguridad.mfa_ok() $$;

revoke execute on all functions in schema seguridad from public, anon;
grant execute on all functions in schema seguridad to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Lectura del panel + MFA obligatorio en todas las tablas que ve el panel
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'marcas', 'productos', 'tonos', 'variantes', 'imagenes', 'publicaciones_canal',
    'movimientos_stock', 'reservas_stock', 'pedidos', 'pedido_items', 'pagos', 'envios',
    'clientas', 'puntos_movimientos', 'auditoria_panel', 'perfiles_panel'
  ] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format($p$create policy panel_lee on public.%I for select to authenticated
                     using ((select seguridad.es_panel(array['duena', 'ayudante'])))$p$, t);
    execute format($p$create policy mfa_obligatorio_panel on public.%I as restrictive for all to authenticated
                     using ((select seguridad.rol_panel()) is null or (select seguridad.mfa_ok()))
                     with check ((select seguridad.rol_panel()) is null or (select seguridad.mfa_ok()))$p$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Escritura directa de la dueña: solo columnas seguras
-- ---------------------------------------------------------------------------
grant update (nombre, activo) on public.marcas to authenticated;
grant update (nombre, alias, descripcion, destacado, orden, activo) on public.productos to authenticated;
grant update (nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) on public.tonos to authenticated;
grant update (precio, activo) on public.variantes to authenticated;             -- stock y stock_reservado: nunca
grant insert (producto_id, tono_id, graduacion, url, alt, orden), update (alt, orden), delete on public.imagenes to authenticated;

create policy duena_edita on public.marcas    for update to authenticated using ((select seguridad.es_panel(array['duena']))) with check ((select seguridad.es_panel(array['duena'])));
create policy duena_edita on public.productos for update to authenticated using ((select seguridad.es_panel(array['duena']))) with check ((select seguridad.es_panel(array['duena'])));
create policy duena_edita on public.tonos     for update to authenticated using ((select seguridad.es_panel(array['duena']))) with check ((select seguridad.es_panel(array['duena'])));
create policy duena_edita on public.variantes for update to authenticated using ((select seguridad.es_panel(array['duena']))) with check ((select seguridad.es_panel(array['duena'])));
create policy duena_agrega on public.imagenes for insert to authenticated with check ((select seguridad.es_panel(array['duena'])));
create policy duena_edita on public.imagenes  for update to authenticated using ((select seguridad.es_panel(array['duena']))) with check ((select seguridad.es_panel(array['duena'])));
create policy duena_borra on public.imagenes  for delete to authenticated using ((select seguridad.es_panel(array['duena'])));

-- ---------------------------------------------------------------------------
-- Auditoría de cambios hechos desde el panel (con sesión de usuario)
-- ---------------------------------------------------------------------------
create function privado.auditar_panel() returns trigger
language plpgsql security definer set search_path = '' as
$$
declare
  v_usuario uuid := (select auth.uid());
  v_antes jsonb; v_despues jsonb; v_k text;
begin
  if v_usuario is null then return coalesce(new, old); end if;     -- importaciones y funciones de servicio se auditan aparte
  if tg_op = 'UPDATE' then
    v_antes := '{}'; v_despues := '{}';
    for v_k in select key from jsonb_each(to_jsonb(new)) loop
      if to_jsonb(new) -> v_k is distinct from to_jsonb(old) -> v_k then
        v_antes := v_antes || jsonb_build_object(v_k, to_jsonb(old) -> v_k);
        v_despues := v_despues || jsonb_build_object(v_k, to_jsonb(new) -> v_k);
      end if;
    end loop;
    if v_despues = '{}' then return new; end if;
  elsif tg_op = 'INSERT' then v_despues := to_jsonb(new);
  else v_antes := to_jsonb(old);
  end if;
  insert into public.auditoria_panel (usuario, accion, tabla, registro, antes, despues)
  values (v_usuario, lower(tg_op), tg_table_name, coalesce(new.id, old.id)::text, v_antes, v_despues);
  return coalesce(new, old);
end
$$;
revoke execute on function privado.auditar_panel() from public, anon, authenticated, service_role;

create trigger auditar_panel after update on public.marcas    for each row execute function privado.auditar_panel();
create trigger auditar_panel after update on public.productos for each row execute function privado.auditar_panel();
create trigger auditar_panel after update on public.tonos     for each row execute function privado.auditar_panel();
create trigger auditar_panel after update on public.variantes for each row execute function privado.auditar_panel();
create trigger auditar_panel after insert or update or delete on public.imagenes for each row execute function privado.auditar_panel();

-- ---------------------------------------------------------------------------
-- Ajuste de stock desde el panel (uno o un lote desde Excel). Todo o nada.
-- p_filas: [{ "sku": "…", "nuevo": 5, "esperado": 3 }]   (nuevo = valor final)
--      o   [{ "sku": "…", "delta": -1 }]
-- `esperado` (opcional) es el stock que vio la dueña en la vista previa: si cambió
-- mientras tanto (p. ej. hubo una venta), NO se aplica nada y se avisa (conflicto).
-- Nunca deja el stock por debajo de lo apartado por pedidos en curso.
-- ---------------------------------------------------------------------------
create function public.panel_ajustar_stock(p_filas jsonb, p_motivo text, p_lote text, p_usuario uuid, p_nota text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_f record;
  v_v record;
  v_nuevo integer;
  v_problemas jsonb := '[]';
  v_aplicadas integer := 0;
  v_iguales integer := 0;
begin
  if p_motivo not in ('ajuste', 'devolucion', 'conciliacion') then raise exception 'motivo_invalido' using errcode = 'P0001'; end if;
  if p_lote !~ '^[a-zA-Z0-9-]{8,64}$' then raise exception 'lote_invalido' using errcode = 'P0001'; end if;
  if p_usuario is null then raise exception 'usuario_requerido' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) = 0 or jsonb_array_length(p_filas) > 2000 then
    raise exception 'filas_invalidas' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.movimientos_stock where ref_externa like 'panel:' || p_lote || ':%') then
    raise exception 'lote_ya_aplicado' using errcode = 'P0001';
  end if;

  for v_f in
    select f.sku, f.nuevo, f.delta, f.esperado
    from jsonb_to_recordset(p_filas) as f(sku text, nuevo integer, delta integer, esperado integer)
    order by f.sku
  loop
    select id, stock, stock_reservado into v_v from public.variantes where sku = v_f.sku for update;
    if not found then
      v_problemas := v_problemas || jsonb_build_object('sku', v_f.sku, 'error', 'sku_no_existe'); continue;
    end if;
    if v_f.esperado is not null and v_f.esperado <> v_v.stock then
      v_problemas := v_problemas || jsonb_build_object('sku', v_f.sku, 'error', 'cambio_mientras_tanto', 'esperado', v_f.esperado, 'actual', v_v.stock); continue;
    end if;
    v_nuevo := coalesce(v_f.nuevo, v_v.stock + v_f.delta);
    if v_nuevo is null or (v_f.nuevo is not null and v_f.delta is not null) then
      v_problemas := v_problemas || jsonb_build_object('sku', v_f.sku, 'error', 'indica_nuevo_o_delta'); continue;
    end if;
    if v_nuevo < 0 or v_nuevo > 10000 then
      v_problemas := v_problemas || jsonb_build_object('sku', v_f.sku, 'error', 'cantidad_invalida', 'nuevo', v_nuevo); continue;
    end if;
    if v_nuevo < v_v.stock_reservado then
      v_problemas := v_problemas || jsonb_build_object('sku', v_f.sku, 'error', 'debajo_de_apartado', 'apartado', v_v.stock_reservado); continue;
    end if;
    if v_nuevo = v_v.stock then v_iguales := v_iguales + 1; continue; end if;

    perform public.mover_stock(v_v.id, v_nuevo - v_v.stock, p_motivo, 'panel:' || p_lote || ':' || v_f.sku, 'panel', null, p_usuario);
    insert into public.auditoria_panel (usuario, accion, tabla, registro, antes, despues)
    values (p_usuario, 'ajustar_stock', 'variantes', v_f.sku,
            jsonb_build_object('stock', v_v.stock),
            jsonb_build_object('stock', v_nuevo, 'motivo', p_motivo, 'lote', p_lote, 'nota', p_nota));
    v_aplicadas := v_aplicadas + 1;
  end loop;

  if jsonb_array_length(v_problemas) > 0 then
    -- La excepción revierte todo lo aplicado en esta llamada: o entran todas o ninguna
    raise exception 'ajuste_con_problemas' using errcode = 'P0001', detail = v_problemas::text;
  end if;
  return jsonb_build_object('aplicadas', v_aplicadas, 'sin_cambio', v_iguales, 'lote', p_lote);
end;
$$;
revoke execute on function public.panel_ajustar_stock(jsonb, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.panel_ajustar_stock(jsonb, text, text, uuid, text) to service_role;
