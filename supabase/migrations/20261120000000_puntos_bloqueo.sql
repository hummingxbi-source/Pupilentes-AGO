-- =============================================================================
-- Fase 8 · Hallazgo de la prueba de seguridad "los mismos puntos usados dos veces EN PARALELO"
-- (tests/seguridad/fase7.test.mjs), 19 nov 2026: en local falló con
--   crear_pedido: deadlock detected   →   respuestas [200, 500] en lugar de [200, 409]
-- Los puntos NO se gastaban dos veces (Postgres abortaba una transacción), pero la clienta
-- veía un error interno y el resultado dependía del azar del momento.
--
-- Causa: el bloqueo de la fila de la clienta (`for update`) se tomaba después del INSERT del
-- pedido. Ese INSERT ya deja un candado KEY SHARE sobre la misma fila por la llave foránea;
-- dos transacciones con KEY SHARE que luego piden FOR UPDATE se esperan mutuamente.
-- Arreglo: tomar el FOR UPDATE antes de crear el pedido (orden de bloqueo único). El bloqueo
-- de más abajo se queda: dentro de la misma transacción no cuesta nada.
-- Ref.: https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-DEADLOCKS
--       https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS (FOR KEY SHARE)
--
-- Misma firma que en 20261118000000_cuenta.sql: `create or replace` conserva los permisos.
-- =============================================================================

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
  v_cuenta   uuid;
  v_puntos   integer;
  v_cot      privado.cotizaciones_envio;
  v_ped      public.pedidos;
  v_sub      numeric := 0;
  v_envio    numeric;
  v_desc     numeric := 0;
  v_total    numeric;
  v_piezas   integer := 0;
  v_it       record;
  v_clienta  uuid;
  v_max_pts  integer;
  v_saldo    integer;
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
                              'mp_preferencia_id', v_ped.mp_preferencia_id, 'descuento', v_ped.descuento, 'puntos_usados', v_ped.puntos_usados);
  end if;

  begin
    v_cuenta := nullif(p_datos ->> 'cuenta_id', '')::uuid;
    v_puntos := coalesce((p_datos ->> 'puntos')::integer, 0);
  exception when others then
    raise exception 'puntos_invalidos' using errcode = 'P0001';
  end;
  if v_puntos < 0 or v_puntos > 1000000 then raise exception 'puntos_invalidos' using errcode = 'P0001'; end if;
  if v_puntos > 0 and v_cuenta is null then raise exception 'puntos_sin_cuenta' using errcode = 'P0001'; end if;
  if v_puntos > 0 and not c.puntos_activos then raise exception 'puntos_inactivos' using errcode = 'P0001'; end if;

  if v_metodo not in ('mercadopago', 'transferencia') then raise exception 'metodo_invalido' using errcode = 'P0001'; end if;
  if v_cuenta is not null then
    v_clienta := privado.asegurar_cuenta(v_cuenta);
    -- Con puntos, la fila de la clienta se bloquea AQUÍ, antes de crear el pedido. Si se bloquea
    -- después (como antes), el INSERT del pedido ya tomó un candado de llave foránea (KEY SHARE)
    -- sobre esta fila, y dos compras en paralelo de la misma clienta se esperan una a otra:
    -- Postgres aborta una con "deadlock detected" y la clienta recibe un 500 en vez de un 409.
    if v_puntos > 0 then
      perform 1 from public.clientas where id = v_clienta for update;
    end if;
    -- Con cuenta, el recibo va a su correo verificado si no escribió otro
    if v_correo = '' then v_correo := (select lower(email) from auth.users where id = v_cuenta); end if;
  end if;
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

  -- Puntos: descuento sobre los productos (nunca sobre el envío), con tope
  if v_puntos > 0 then
    v_max_pts := floor(floor(v_sub * c.puntos_max_pct) / 100 / c.puntos_valor)::integer;
    if v_puntos > v_max_pts then raise exception 'puntos_excedidos' using errcode = 'P0001', detail = v_max_pts::text; end if;
    v_desc := round(v_puntos * c.puntos_valor, 2);
  end if;

  v_total := v_sub + v_envio - v_desc;
  if (p_datos ->> 'total_visto') is null or (p_datos ->> 'total_visto')::numeric <> v_total then
    raise exception 'total_cambio' using errcode = 'P0001', detail = v_total::text;
  end if;

  if v_clienta is null then
    -- Invitada: se liga por teléfono SOLO para que aparezca en el panel (la cuenta nunca usa este ligado, §8)
    select id into v_clienta from public.clientas where telefono = v_tel order by creado_en limit 1;
    if v_clienta is null then
      insert into public.clientas (nombre, telefono, correo)
      values (v_nombre, v_tel, nullif(v_correo, ''))
      on conflict do nothing returning id into v_clienta;
      if v_clienta is null then select id into v_clienta from public.clientas where lower(correo) = v_correo limit 1; end if;
    end if;
  end if;

  insert into public.pedidos (clave_idempotencia, canal, estado, pago_estado, clienta_id, contacto, subtotal, envio, descuento, puntos_usados,
                              total, entrega, metodo_pago, cuenta_id, cuenta_ligada_por)
  values (v_clave, 'web', 'pendiente_pago', 'pendiente', v_clienta,
          jsonb_build_object('nombre', v_nombre, 'telefono', v_tel, 'correo', nullif(v_correo, '')),
          v_sub, v_envio, v_desc, v_puntos, v_total, v_entrega, v_metodo,
          v_cuenta, case when v_cuenta is not null then 'sesion' end)
  returning * into v_ped;

  insert into public.pedido_items (pedido_id, variante_id, cantidad, precio_unitario)
  select v_ped.id, v.id, sum(i.cantidad), v.precio
  from jsonb_to_recordset(p_datos -> 'items') as i(sku text, cantidad integer)
  join public.variantes v on v.sku = i.sku
  group by v.id, v.precio;

  v_minutos := case v_metodo when 'transferencia' then c.reserva_transfer_min else c.reserva_tarjeta_min end;
  v_expira := public.reservar_stock(v_ped.id, v_minutos);

  if v_puntos > 0 then
    -- Saldo con la fila bloqueada: dos compras en paralelo no gastan los mismos puntos
    perform 1 from public.clientas where id = v_clienta for update;
    v_saldo := privado.saldo_puntos(v_clienta);
    if v_puntos > v_saldo then raise exception 'puntos_insuficientes' using errcode = 'P0001', detail = greatest(v_saldo, 0)::text; end if;
  end if;
  perform privado.conciliar_puntos(v_ped.id);     -- registra el canje (si hay)

  return jsonb_build_object('id', v_ped.id, 'folio', v_ped.folio, 'token', v_ped.token_rastreo, 'total', v_total,
                            'subtotal', v_sub, 'envio', v_envio, 'descuento', v_desc, 'puntos_usados', v_puntos,
                            'expira', v_expira, 'metodo_pago', v_metodo, 'repetido', false, 'estado', 'pendiente_pago');
end
$$;
