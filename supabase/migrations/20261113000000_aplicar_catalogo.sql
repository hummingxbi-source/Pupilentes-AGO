-- =============================================================================
-- Fase 2 · aplicar_catalogo: UNA sola implementación del guardado de catálogo
--
-- La usan:
--   · scripts/importar-catalogo.mjs (terminal) y supabase/seed.sql (semilla)
--   · la Edge Function panel-catalogo (importar desde el panel)
-- Recibe el plan ya validado por _shared/catalogo/plan.js y lo guarda en una
-- transacción: upsert por slug/sku. El stock inicial entra con mover_stock
-- (ref 'inicial:<sku>'), así que reimportar NUNCA duplica stock.
-- =============================================================================

create function public.aplicar_catalogo(p_plan jsonb, p_usuario uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nuevas integer;
  v_stock  integer := 0;
  v_r      record;
  v_resumen jsonb;
begin
  if p_plan is null or jsonb_typeof(p_plan) <> 'object' then
    raise exception 'plan_invalido' using errcode = 'P0001';
  end if;

  insert into public.marcas (slug, nombre)
  select m.slug, m.nombre
  from jsonb_to_recordset(coalesce(p_plan->'marcas', '[]')) as m(slug text, nombre text)
  on conflict (slug) do update set nombre = excluded.nombre;

  insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo)
  select (select id from public.marcas where slug = p.marca), p.slug, p.nombre, p.tipo, p.alias, p.descripcion,
         coalesce(p.destacado, false), coalesce(p.orden, 0), coalesce(p.activo, true)
  from jsonb_to_recordset(coalesce(p_plan->'productos', '[]'))
       as p(slug text, marca text, nombre text, tipo text, alias text, descripcion text, destacado boolean, orden integer, activo boolean)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion,
                                   destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;

  insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo)
  select (select id from public.productos where slug = t.producto), t.slug, t.color, t.nombre, t.alias, t.familia, t.intensidad,
         t.descripcion, t.iris, t.filtro, coalesce(t.destacado, false), coalesce(t.orden, 0), coalesce(t.activo, true)
  from jsonb_to_recordset(coalesce(p_plan->'tonos', '[]'))
       as t(slug text, producto text, color text, nombre text, alias text, familia text, intensidad smallint,
            descripcion text, iris text, filtro text, destacado boolean, orden integer, activo boolean)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia,
                                   intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base,
                                   filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;

  select count(*) into v_nuevas
  from jsonb_to_recordset(coalesce(p_plan->'variantes', '[]')) as v(sku text)
  where not exists (select 1 from public.variantes x where x.sku = v.sku);

  insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo)
  select (select id from public.productos where slug = v.producto),
         (select id from public.tonos where slug = v.tono),
         v.sku, v.duracion, v.graduacion, v.precio, coalesce(v.activo, true)
  from jsonb_to_recordset(coalesce(p_plan->'variantes', '[]'))
       as v(sku text, producto text, tono text, duracion text, graduacion numeric, precio numeric, activo boolean)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;

  -- Stock inicial: una sola vez por SKU en toda la vida del catálogo
  for v_r in
    select x.id, v.sku, v.stock
    from jsonb_to_recordset(coalesce(p_plan->'variantes', '[]')) as v(sku text, stock integer)
    join public.variantes x on x.sku = v.sku
    where coalesce(v.stock, 0) > 0
  loop
    if public.mover_stock(v_r.id, v_r.stock, 'inicial', 'inicial:' || v_r.sku, 'importacion', null, p_usuario) then
      v_stock := v_stock + v_r.stock;
    end if;
  end loop;

  insert into public.imagenes (producto_id, tono_id, url, alt, orden)
  select (select id from public.productos where slug = i.producto),
         (select id from public.tonos where slug = i.tono),
         i.url, i.alt, coalesce(i.orden, 0)
  from jsonb_to_recordset(coalesce(p_plan->'imagenes', '[]')) as i(producto text, tono text, url text, alt text, orden integer)
  on conflict (producto_id, tono_id, url) do update set alt = excluded.alt, orden = excluded.orden;

  v_resumen := jsonb_build_object(
    'marcas', jsonb_array_length(coalesce(p_plan->'marcas', '[]')),
    'productos', jsonb_array_length(coalesce(p_plan->'productos', '[]')),
    'tonos', jsonb_array_length(coalesce(p_plan->'tonos', '[]')),
    'variantes', jsonb_array_length(coalesce(p_plan->'variantes', '[]')),
    'variantes_nuevas', v_nuevas,
    'imagenes', jsonb_array_length(coalesce(p_plan->'imagenes', '[]')),
    'stock_inicial', v_stock
  );
  if p_usuario is not null then
    insert into public.auditoria_panel (usuario, accion, tabla, despues)
    values (p_usuario, 'importar_catalogo', 'catalogo', v_resumen);
  end if;
  return v_resumen;
end;
$$;

revoke execute on function public.aplicar_catalogo(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.aplicar_catalogo(jsonb, uuid) to service_role;
