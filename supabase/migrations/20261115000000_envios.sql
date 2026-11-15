-- =============================================================================
-- Fase 4 · Envíos por paquetería con Envia.com (ARQUITECTURA §5, Fase 4)
--
--   envios-cotizar (Edge) → Envia /ship/rate/ (una paquetería por petición [Envia]) → guardar_cotizaciones
--   pedidos-crear → crear_pedido usa la COTIZACIÓN GUARDADA (nunca un precio del navegador)
--   envios-guia (panel) → envio_reservar_guia → Envia /ship/generate/ → envio_guardar_guia
--   webhook-envia → Envia /ship/generaltrack/ (la verdad) → registrar_rastreo_envio
--
-- ⚠️ Datos provisionales (los reales los da la clienta; editables por la dueña):
--   dirección de origen, peso y caja de un par, paqueterías a cotizar y cargo extra por envío.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Configuración de envío (en la misma fila de config_tienda)
-- ---------------------------------------------------------------------------
alter table public.config_tienda
  add column envio_origen jsonb not null default jsonb_build_object(
    'name', 'Pupilentes AGO', 'company', 'Pupilentes AGO', 'phone', '5571113508',
    'street', 'Por confirmar', 'number', 'S/N', 'district', 'Por confirmar',
    'city', 'Iztacalco', 'state', 'CX', 'postalCode', '08000', 'country', 'MX')
    check (jsonb_typeof(envio_origen) = 'object' and envio_origen ? 'postalCode'),
  add column envio_peso_par_kg numeric(6,3) not null default 0.100 check (envio_peso_par_kg > 0 and envio_peso_par_kg <= 5),
  add column envio_caja_cm jsonb not null default '{"length": 15, "width": 10, "height": 6}'
    check (jsonb_typeof(envio_caja_cm) = 'object'),
  add column envio_paqueterias text[] not null default '{estafeta,dhl,fedex}'
    check (cardinality(envio_paqueterias) between 1 and 6),
  add column envio_cargo_extra numeric(10,2) not null default 0 check (envio_cargo_extra between 0 and 500),
  add column envio_cotizacion_min integer not null default 30 check (envio_cotizacion_min between 5 and 240);

grant update (envio_origen, envio_peso_par_kg, envio_caja_cm, envio_paqueterias, envio_cargo_extra, envio_cotizacion_min)
  on public.config_tienda to authenticated;   -- la política duena_edita limita a la dueña con MFA

-- La paquetería ya no sale de una tarifa fija: se cotiza con Envia.com
update public.tarifas_entrega set activo = false where tipo = 'paqueteria';

-- ---------------------------------------------------------------------------
-- Cotizaciones guardadas: el precio que vio la clienta queda en el servidor
-- ---------------------------------------------------------------------------
create table privado.cotizaciones_envio (
  id          uuid primary key default gen_random_uuid(),
  cp          text not null check (cp ~ '^[0-9]{5}$'),
  piezas      integer not null check (piezas between 1 and 50),
  carrier     text not null check (carrier ~ '^[a-z0-9_-]{2,40}$'),
  servicio    text not null check (length(servicio) between 1 and 60),
  descripcion text check (length(descripcion) <= 120),
  entrega     text check (length(entrega) <= 80),
  costo       numeric(10,2) not null check (costo >= 0),          -- lo que cobra Envia
  precio      numeric(10,2) not null check (precio >= 0),         -- lo que paga la clienta (costo + cargo extra)
  creado_en   timestamptz not null default now(),
  expira_en   timestamptz not null
);
create index cotizaciones_expira_idx on privado.cotizaciones_envio (expira_en);
-- Regla del proyecto: RLS en todas las tablas, también en `privado` (la API no lo expone; defensa en profundidad)
alter table privado.cotizaciones_envio enable row level security;
revoke all on privado.cotizaciones_envio from public, anon, authenticated;

-- p_opciones = [{ carrier, servicio, descripcion?, entrega?, costo }]
create function public.guardar_cotizaciones(p_cp text, p_piezas integer, p_opciones jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as
$$
declare c public.config_tienda; v jsonb;
begin
  select * into c from public.config_tienda;
  if p_cp !~ '^[0-9]{5}$' or p_piezas not between 1 and c.max_piezas_pedido then raise exception 'cotizacion_invalida' using errcode = 'P0001'; end if;
  with nuevas as (
    insert into privado.cotizaciones_envio (cp, piezas, carrier, servicio, descripcion, entrega, costo, precio, expira_en)
    select p_cp, p_piezas, lower(o ->> 'carrier'), o ->> 'servicio', left(o ->> 'descripcion', 120), left(o ->> 'entrega', 80),
           (o ->> 'costo')::numeric, round((o ->> 'costo')::numeric + c.envio_cargo_extra, 2),
           now() + make_interval(mins => c.envio_cotizacion_min)
    from jsonb_array_elements(p_opciones) o
    where (o ->> 'costo') ~ '^[0-9]+(\.[0-9]+)?$'
    returning *
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'carrier', carrier, 'servicio', servicio, 'descripcion', descripcion,
                                               'entrega', entrega, 'precio', precio, 'expira', expira_en) order by precio), '[]')
    into v from nuevas;
  return v;
end
$$;

-- ---------------------------------------------------------------------------
-- crear_pedido: igual que en 20261114000000_pedidos.sql, salvo que la paquetería
-- toma el costo de una cotización guardada (vigente, mismo CP y mismas piezas)
-- y exige la dirección completa que necesita la guía.
-- ---------------------------------------------------------------------------
create or replace function public.crear_pedido(p_datos jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as
$$
declare
  c          public.config_tienda;
  v_clave    text := p_datos ->> 'clave_idempotencia';
  v_metodo   text := p_datos ->> 'metodo_pago';
  v_tel      text := regexp_replace(coalesce(p_datos #>> '{contacto,telefono}', ''), '\D', '', 'g');
  v_correo   text := lower(trim(coalesce(p_datos #>> '{contacto,correo}', '')));
  v_nombre   text := trim(coalesce(p_datos #>> '{contacto,nombre}', ''));
  v_entrega  jsonb := p_datos -> 'entrega';
  v_dir      jsonb := p_datos #> '{entrega,direccion_envio}';
  v_cot      privado.cotizaciones_envio;
  v_ped      public.pedidos;
  v_sub      numeric := 0;
  v_envio    numeric;
  v_total    numeric;
  v_piezas   integer := 0;
  v_it       record;
  v_clienta  uuid;
  v_minutos  integer;
  v_expira   timestamptz;
begin
  select * into c from public.config_tienda;

  if v_clave is null or length(v_clave) not between 16 and 100 then raise exception 'idempotencia_invalida' using errcode = 'P0001'; end if;
  -- Dos peticiones simultáneas con la misma clave: la segunda espera y encuentra el pedido abajo
  perform pg_advisory_xact_lock(hashtextextended('crear_pedido:' || v_clave, 0));
  select * into v_ped from public.pedidos where clave_idempotencia = v_clave;
  if found then
    return jsonb_build_object('id', v_ped.id, 'folio', v_ped.folio, 'token', v_ped.token_rastreo, 'total', v_ped.total,
                              'expira', v_ped.expira_reserva_en, 'metodo_pago', v_ped.metodo_pago, 'repetido', true, 'estado', v_ped.estado,
                              'mp_preferencia_id', v_ped.mp_preferencia_id);
  end if;

  if v_metodo not in ('mercadopago', 'transferencia') then raise exception 'metodo_invalido' using errcode = 'P0001'; end if;
  if length(v_nombre) not between 2 and 120 or v_tel !~ '^[0-9]{10}$'
     or (v_correo <> '' and v_correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'contacto_invalido' using errcode = 'P0001';
  end if;

  if (select count(*) from public.pedidos
       where contacto ->> 'telefono' = v_tel and estado in ('pendiente_pago', 'pendiente_validacion')
         and creado_en > now() - interval '24 hours') >= c.max_pendientes_telefono then
    raise exception 'demasiados_pendientes' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_datos -> 'items') <> 'array' or jsonb_array_length(p_datos -> 'items') = 0 then
    raise exception 'sin_items' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_datos -> 'items') > 10 then raise exception 'demasiadas_piezas' using errcode = 'P0001'; end if;

  for v_it in
    select i.sku, sum(i.cantidad)::integer as cantidad, v.id as variante_id, v.precio, v.activo,
           (t.id is null or t.activo) and p.activo as visible
    from jsonb_to_recordset(p_datos -> 'items') as i(sku text, cantidad integer)
    left join public.variantes v on v.sku = i.sku
    left join public.productos p on p.id = v.producto_id
    left join public.tonos t on t.id = v.tono_id
    group by i.sku, v.id, v.precio, v.activo, t.id, t.activo, p.activo
  loop
    if v_it.variante_id is null or not v_it.activo or not v_it.visible then
      raise exception 'sku_no_disponible' using errcode = 'P0001', detail = v_it.sku;
    end if;
    if v_it.cantidad is null or v_it.cantidad < 1 or v_it.cantidad > c.max_piezas_renglon then
      raise exception 'demasiadas_piezas' using errcode = 'P0001', detail = v_it.sku;
    end if;
    v_piezas := v_piezas + v_it.cantidad;
    v_sub := v_sub + v_it.precio * v_it.cantidad;
  end loop;
  if v_piezas > c.max_piezas_pedido then raise exception 'demasiadas_piezas' using errcode = 'P0001'; end if;

  -- Envío: SIEMPRE del servidor
  if v_entrega ->> 'tipo' = 'paqueteria' then
    if jsonb_typeof(v_dir) <> 'object'
       or length(trim(coalesce(v_dir ->> 'calle', ''))) not between 3 and 120
       or length(trim(coalesce(v_dir ->> 'colonia', ''))) not between 2 and 80
       or length(trim(coalesce(v_dir ->> 'ciudad', ''))) not between 2 and 60
       or length(trim(coalesce(v_dir ->> 'estado', ''))) not between 2 and 40
       or coalesce(v_dir ->> 'cp', '') !~ '^[0-9]{5}$' then
      raise exception 'direccion_invalida' using errcode = 'P0001';
    end if;
    if coalesce(v_entrega ->> 'cotizacion', '') !~ '^[0-9a-f-]{36}$' then raise exception 'cotizacion_vencida' using errcode = 'P0001'; end if;
    select * into v_cot from privado.cotizaciones_envio
     where id = (v_entrega ->> 'cotizacion')::uuid and expira_en > now();
    if not found then raise exception 'cotizacion_vencida' using errcode = 'P0001'; end if;
    -- La cotización vale para ese CP y esa cantidad de piezas (el peso del paquete)
    if v_cot.cp <> v_dir ->> 'cp' or v_cot.piezas <> v_piezas then raise exception 'cotizacion_no_coincide' using errcode = 'P0001'; end if;
    v_envio := v_cot.precio;
    v_entrega := v_entrega || jsonb_build_object('carrier', v_cot.carrier, 'servicio', v_cot.servicio,
                                                 'zona', initcap(v_cot.carrier) || ' · ' || coalesce(v_cot.descripcion, v_cot.servicio),
                                                 'entrega_estimada', v_cot.entrega);
  else
    v_envio := public.cotizar_entrega(v_entrega);
  end if;

  v_total := v_sub + v_envio;
  if (p_datos ->> 'total_visto') is null or (p_datos ->> 'total_visto')::numeric <> v_total then
    raise exception 'total_cambio' using errcode = 'P0001', detail = v_total::text;
  end if;

  select id into v_clienta from public.clientas where telefono = v_tel order by creado_en limit 1;
  if v_clienta is null then
    insert into public.clientas (nombre, telefono, correo)
    values (v_nombre, v_tel, nullif(v_correo, ''))
    on conflict do nothing returning id into v_clienta;
    if v_clienta is null then select id into v_clienta from public.clientas where lower(correo) = v_correo limit 1; end if;
  end if;

  insert into public.pedidos (clave_idempotencia, canal, estado, pago_estado, clienta_id, contacto, subtotal, envio, total, entrega, metodo_pago)
  values (v_clave, 'web', 'pendiente_pago', 'pendiente', v_clienta,
          jsonb_build_object('nombre', v_nombre, 'telefono', v_tel, 'correo', nullif(v_correo, '')),
          v_sub, v_envio, v_total, v_entrega, v_metodo)
  returning * into v_ped;

  insert into public.pedido_items (pedido_id, variante_id, cantidad, precio_unitario)
  select v_ped.id, v.id, sum(i.cantidad), v.precio
  from jsonb_to_recordset(p_datos -> 'items') as i(sku text, cantidad integer)
  join public.variantes v on v.sku = i.sku
  group by v.id, v.precio;

  v_minutos := case v_metodo when 'transferencia' then c.reserva_transfer_min else c.reserva_tarjeta_min end;
  v_expira := public.reservar_stock(v_ped.id, v_minutos);

  return jsonb_build_object('id', v_ped.id, 'folio', v_ped.folio, 'token', v_ped.token_rastreo, 'total', v_total,
                            'subtotal', v_sub, 'envio', v_envio, 'expira', v_expira, 'metodo_pago', v_metodo, 'repetido', false,
                            'estado', 'pendiente_pago');
end
$$;

-- ---------------------------------------------------------------------------
-- Guías (panel). Una sola guía activa por pedido: un doble clic no compra dos.
-- ---------------------------------------------------------------------------
alter table public.envios
  add column id_externo text check (length(id_externo) <= 80),               -- shipmentId de Envia
  add column etiqueta_url text check (etiqueta_url ~ '^https://'),          -- respaldo mientras no exista el bucket de R2
  add column detalle jsonb,
  add column actualizado_en timestamptz not null default now();
create unique index envios_una_guia_activa on public.envios (pedido_id)
  where proveedor = 'envia' and estado not in ('error', 'cancelada');
create unique index envios_guia_idx on public.envios (proveedor, guia) where guia is not null;

create function public.envio_reservar_guia(p_pedido uuid, p_usuario uuid)
returns jsonb
language plpgsql security definer set search_path = '' as
$$
declare v_ped public.pedidos; v_id uuid; v_piezas integer;
begin
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'pedido_no_existe' using errcode = 'P0001'; end if;
  if v_ped.entrega ->> 'tipo' <> 'paqueteria' then raise exception 'no_es_paqueteria' using errcode = 'P0001'; end if;
  if v_ped.no_entregar then raise exception 'no_entregar' using errcode = 'P0001'; end if;
  if v_ped.estado not in ('pagado', 'preparando') then raise exception 'pedido_no_listo' using errcode = 'P0001'; end if;
  begin
    insert into public.envios (pedido_id, proveedor, servicio, estado)
    values (p_pedido, 'envia', v_ped.entrega ->> 'servicio', 'generando') returning id into v_id;
  exception when unique_violation then
    raise exception 'guia_existente' using errcode = 'P0001';
  end;
  if v_ped.estado = 'pagado' then perform public.cambiar_estado_pedido(p_pedido, 'preparando', p_usuario, 'guía de paquetería'); end if;
  select sum(cantidad)::integer into v_piezas from public.pedido_items where pedido_id = p_pedido;
  return jsonb_build_object('envio', v_id, 'folio', v_ped.folio, 'contacto', v_ped.contacto, 'entrega', v_ped.entrega,
                            'piezas', v_piezas, 'subtotal', v_ped.subtotal);
end
$$;

create function public.envio_guardar_guia(p_envio uuid, p_usuario uuid, p_datos jsonb)
returns void
language plpgsql security definer set search_path = '' as
$$
declare v_pedido uuid; v_folio text;
begin
  update public.envios
     set guia = p_datos ->> 'guia', url_rastreo = nullif(p_datos ->> 'url_rastreo', ''), costo = (p_datos ->> 'costo')::numeric,
         id_externo = p_datos ->> 'id_externo', etiqueta_clave = nullif(p_datos ->> 'etiqueta_clave', ''),
         etiqueta_url = nullif(p_datos ->> 'etiqueta_url', ''), estado = 'guia_generada', actualizado_en = now()
   where id = p_envio and estado = 'generando'
  returning pedido_id into v_pedido;
  if v_pedido is null then raise exception 'envio_no_generando' using errcode = 'P0001'; end if;
  select folio into v_folio from public.pedidos where id = v_pedido;
  insert into public.auditoria_panel (usuario, accion, tabla, registro, despues)
  values (p_usuario, 'generar_guia', 'envios', v_folio, jsonb_build_object('guia', p_datos ->> 'guia', 'costo', p_datos ->> 'costo'));
end
$$;

create function public.envio_marcar_error(p_envio uuid, p_error text)
returns void
language sql security definer set search_path = '' as
$$
  update public.envios set estado = 'error', detalle = jsonb_build_object('error', left(p_error, 300)), actualizado_en = now()
   where id = p_envio and estado = 'generando';
$$;

-- ---------------------------------------------------------------------------
-- Rastreo (webhook-envia, DESPUÉS de consultar el estado a la API de Envia).
-- p_categoria la decide la Edge Function: en_camino | entregado | incidencia | sin_cambio
-- ---------------------------------------------------------------------------
create function public.registrar_rastreo_envio(p_guia text, p_categoria text, p_estado_original text)
returns jsonb
language plpgsql security definer set search_path = '' as
$$
declare v_env public.envios; v_ped public.pedidos; v_res text := 'sin_cambio';
begin
  if p_categoria not in ('en_camino', 'entregado', 'incidencia', 'sin_cambio') then raise exception 'categoria_invalida' using errcode = 'P0001'; end if;
  select * into v_env from public.envios where proveedor = 'envia' and guia = p_guia for update;
  if not found then
    insert into privado.alertas (tipo, detalle) values ('envio_desconocido', jsonb_build_object('guia', left(p_guia, 80)));
    return jsonb_build_object('resultado', 'guia_desconocida');
  end if;
  select * into v_ped from public.pedidos where id = v_env.pedido_id for update;

  update public.envios
     set estado = case p_categoria when 'sin_cambio' then estado else p_categoria end,
         detalle = coalesce(detalle, '{}') || jsonb_build_object('ultimo_estado', left(p_estado_original, 80), 'visto', now()),
         actualizado_en = now()
   where id = v_env.id;

  if p_categoria = 'en_camino' and v_ped.estado in ('pagado', 'preparando') then
    perform public.cambiar_estado_pedido(v_ped.id, 'enviado');
    v_res := 'enviado';
  elsif p_categoria = 'entregado' and privado.transicion_valida(v_ped.estado, 'entregado') then
    perform public.cambiar_estado_pedido(v_ped.id, 'entregado');
    v_res := 'entregado';
  elsif p_categoria = 'incidencia' then
    insert into privado.alertas (tipo, detalle, pedido_id)
    values ('envio_incidencia', jsonb_build_object('folio', v_ped.folio, 'guia', p_guia, 'estado', left(p_estado_original, 80)), v_ped.id);
    v_res := 'incidencia';
  end if;
  if v_ped.no_entregar and p_categoria in ('en_camino', 'entregado') then
    insert into privado.alertas (tipo, detalle, pedido_id)
    values ('envio_no_entregar', jsonb_build_object('folio', v_ped.folio, 'guia', p_guia), v_ped.id);
  end if;
  return jsonb_build_object('resultado', v_res, 'folio', v_ped.folio);
end
$$;

-- Limpieza de cotizaciones viejas (la llama el cron)
create function public.limpiar_cotizaciones_viejas()
returns integer
language sql security definer set search_path = '' as
$$
  with x as (delete from privado.cotizaciones_envio where expira_en < now() - interval '1 day' returning 1)
  select count(*)::integer from x
$$;

-- ---------------------------------------------------------------------------
-- Permisos: todo solo para las Edge Functions
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'public.guardar_cotizaciones(text, integer, jsonb)', 'public.envio_reservar_guia(uuid, uuid)',
    'public.envio_guardar_guia(uuid, uuid, jsonb)', 'public.envio_marcar_error(uuid, text)',
    'public.registrar_rastreo_envio(text, text, text)', 'public.limpiar_cotizaciones_viejas()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
