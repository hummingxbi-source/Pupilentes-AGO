-- =============================================================================
-- Fase 3 · Pedidos y pagos (ARQUITECTURA §3.3 A, A2, F)
--
-- Toda la lógica que mueve dinero o stock vive aquí, en transacciones. Las Edge
-- Functions solo validan quién llama, hablan con Mercado Pago y llaman a estas
-- funciones (EXECUTE solo para service_role).
--
-- Decisiones (§9.1, 11 nov 2026):
--   D2: Mercado Pago con tarjeta y SPEI, SIN efectivo (OXXO).
--   D3: transferencia directa → la pieza se aparta 24 h.
--   D5: se puede comprar como invitada (contacto en el pedido).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Configuración de la tienda (la edita la dueña desde el panel)
-- ---------------------------------------------------------------------------
create table public.config_tienda (
  id                      boolean primary key default true check (id),   -- una sola fila
  reserva_tarjeta_min     integer not null default 30   check (reserva_tarjeta_min between 10 and 120),
  reserva_transfer_min    integer not null default 1440 check (reserva_transfer_min between 60 and 4320),  -- D3: 24 h
  reserva_spei_max_min    integer not null default 4320 check (reserva_spei_max_min between 60 and 4320),  -- tope si MP deja SPEI pendiente [24]
  max_piezas_renglon      integer not null default 5    check (max_piezas_renglon between 1 and 50),
  max_piezas_pedido       integer not null default 10   check (max_piezas_pedido between 1 and 50),
  max_pendientes_telefono integer not null default 3    check (max_pendientes_telefono between 1 and 20),
  -- Datos para transferencia (⚠️ los reales los da la clienta; nunca el nombre de la dueña en la web)
  banco                   text not null default 'Por confirmar',
  clabe                   text not null default '000000000000000000' check (clabe ~ '^[0-9]{18}$'),
  beneficiario            text not null default 'Pupilentes AGO',
  whatsapp                text not null default '5571113508' check (whatsapp ~ '^[0-9]{10}$'),
  actualizado_en          timestamptz not null default now()
);
insert into public.config_tienda default values;

-- Tarifas de entrega en CDMX (⚠️ valores de la demo: confirmarlas con la clienta).
-- La paquetería se cotiza con Envia.com en la Fase 4; mientras, tarifas provisionales.
create table public.tarifas_entrega (
  tipo    text not null check (tipo in ('metro', 'metro_otra', 'didi', 'paqueteria')),
  zona    text not null check (length(zona) between 1 and 80),   -- estación, alcaldía o servicio
  costo   numeric(10,2) not null check (costo >= 0),
  detalle text check (length(detalle) <= 120),
  activo  boolean not null default true,
  orden   integer not null default 0,
  primary key (tipo, zona)
);
insert into public.tarifas_entrega (tipo, zona, costo, detalle, orden) values
  ('metro', 'Pantitlán', 0, 'Entrega en andén, con cita', 1),
  ('metro', 'Tepalcates', 0, 'Entrega en andén, con cita', 2),
  ('metro_otra', 'Otra estación', 60, 'Costo extra por traslado', 3),
  ('didi', 'Iztacalco', 75, null, 10), ('didi', 'Iztapalapa', 80, null, 11), ('didi', 'Venustiano Carranza', 85, null, 12),
  ('didi', 'Nezahualcóyotl', 85, null, 13), ('didi', 'Benito Juárez', 135, null, 14), ('didi', 'Coyoacán', 140, null, 15),
  ('didi', 'Cuauhtémoc', 130, null, 16), ('didi', 'Gustavo A. Madero', 150, null, 17), ('didi', 'Álvaro Obregón', 185, null, 18),
  ('didi', 'Tlalpan', 175, null, 19), ('didi', 'Otra', 160, null, 20),
  ('paqueteria', 'Estándar', 139, '3 a 5 días hábiles · provisional hasta la Fase 4', 30),
  ('paqueteria', 'Express', 229, '1 a 2 días hábiles · provisional hasta la Fase 4', 31);

-- Lectura pública de lo necesario para cotizar (sin datos sensibles)
create view public.entregas_publicas as
  select tipo, zona, costo, detalle, orden from public.tarifas_entrega where activo;
grant select on public.entregas_publicas to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Columnas nuevas de pedidos
-- ---------------------------------------------------------------------------
alter table public.pedidos
  add column metodo_pago text check (metodo_pago in ('mercadopago', 'transferencia')),
  add column mp_preferencia_id text check (length(mp_preferencia_id) <= 80),
  add column no_entregar boolean not null default false,   -- p. ej. alerta de fraude o contracargo
  add column nota_interna text check (length(nota_interna) <= 500);

alter table privado.alertas add column notificada_en timestamptz;
alter table privado.alertas add column pedido_id uuid references public.pedidos(id);

-- ---------------------------------------------------------------------------
-- Envío: SIEMPRE se calcula aquí (el navegador solo muestra)
-- p_entrega: { tipo: metro|metro_otra|didi|paqueteria, zona: "…" }
-- ---------------------------------------------------------------------------
create function public.cotizar_entrega(p_entrega jsonb)
returns numeric
language plpgsql stable security definer set search_path = '' as
$$
declare v_costo numeric;
begin
  select costo into v_costo from public.tarifas_entrega
   where activo and tipo = p_entrega ->> 'tipo' and zona = p_entrega ->> 'zona';
  if v_costo is null then raise exception 'entrega_invalida' using errcode = 'P0001'; end if;
  return v_costo;
end
$$;

-- ---------------------------------------------------------------------------
-- Máquina de estados del pedido. Ningún UPDATE libre de `estado`.
-- ---------------------------------------------------------------------------
create function privado.transicion_valida(p_de text, p_a text) returns boolean
language sql immutable set search_path = '' as
$$
  select (p_de, p_a) in (
    ('pendiente_pago', 'pendiente_validacion'), ('pendiente_pago', 'pagado'), ('pendiente_pago', 'cancelado'),
    ('pendiente_pago', 'expirado'), ('pendiente_pago', 'pagado_sin_stock'),
    ('pendiente_validacion', 'pagado'), ('pendiente_validacion', 'cancelado'), ('pendiente_validacion', 'expirado'),
    ('pendiente_validacion', 'pagado_sin_stock'),
    ('expirado', 'pagado'), ('expirado', 'pagado_sin_stock'), ('cancelado', 'pagado'), ('cancelado', 'pagado_sin_stock'),
    ('pagado', 'preparando'), ('pagado', 'enviado'), ('pagado', 'entregado'), ('pagado', 'reembolsado'), ('pagado', 'contracargo'),
    ('preparando', 'enviado'), ('preparando', 'entregado'), ('preparando', 'reembolsado'), ('preparando', 'contracargo'),
    ('enviado', 'entregado'), ('enviado', 'contracargo'), ('enviado', 'reembolsado'),
    ('entregado', 'reembolsado'), ('entregado', 'contracargo'),
    ('pagado_sin_stock', 'reembolsado'), ('pagado_sin_stock', 'pagado'), ('pagado_sin_stock', 'contracargo')
  )
$$;

create function public.cambiar_estado_pedido(p_pedido uuid, p_nuevo text, p_usuario uuid default null, p_nota text default null)
returns text
language plpgsql security definer set search_path = '' as
$$
declare v_actual text;
begin
  select estado into v_actual from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'pedido_no_existe' using errcode = 'P0001'; end if;
  if v_actual = p_nuevo then return v_actual; end if;
  if not privado.transicion_valida(v_actual, p_nuevo) then
    raise exception 'transicion_invalida' using errcode = 'P0001', detail = v_actual || ' → ' || p_nuevo;
  end if;
  update public.pedidos set estado = p_nuevo, actualizado_en = now() where id = p_pedido;
  if p_usuario is not null then
    insert into public.auditoria_panel (usuario, accion, tabla, registro, antes, despues)
    values (p_usuario, 'estado_pedido', 'pedidos', p_pedido::text, jsonb_build_object('estado', v_actual), jsonb_build_object('estado', p_nuevo, 'nota', p_nota));
  end if;
  return p_nuevo;
end
$$;

-- Bloquea UPDATE directo de estado (por si alguna función futura lo olvida): solo pasa si
-- viene de cambiar_estado_pedido, que marca la transacción.
-- (Las políticas del panel no conceden UPDATE de pedidos; esto es defensa en profundidad.)

-- ---------------------------------------------------------------------------
-- crear_pedido: valida, calcula en servidor y aparta. Todo en una transacción.
-- p_datos = {
--   clave_idempotencia, metodo_pago: mercadopago|transferencia,
--   items: [{ sku, cantidad }], entrega: { tipo, zona, ... datos de entrega },
--   contacto: { nombre, telefono, correo }, total_visto
-- }
-- Errores (mensaje = código): idempotencia_invalida · metodo_invalido · sin_items · demasiadas_piezas ·
--   sku_no_disponible (detail=sku) · entrega_invalida · contacto_invalido · demasiados_pendientes ·
--   total_cambio (detail = total nuevo) · sin_stock (detail = sku, de reservar_stock)
-- ---------------------------------------------------------------------------
create function public.crear_pedido(p_datos jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as
$$
declare
  c          public.config_tienda;
  v_clave    text := p_datos ->> 'clave_idempotencia';
  v_metodo   text := p_datos ->> 'metodo_pago';
  v_contacto jsonb := p_datos -> 'contacto';
  v_tel      text := regexp_replace(coalesce(p_datos #>> '{contacto,telefono}', ''), '\D', '', 'g');
  v_correo   text := lower(trim(coalesce(p_datos #>> '{contacto,correo}', '')));
  v_nombre   text := trim(coalesce(p_datos #>> '{contacto,nombre}', ''));
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
  -- Doble toque / reintento de red: devuelve el mismo pedido
  select * into v_ped from public.pedidos where clave_idempotencia = v_clave;
  if found then
    return jsonb_build_object('id', v_ped.id, 'folio', v_ped.folio, 'token', v_ped.token_rastreo, 'total', v_ped.total,
                              'expira', v_ped.expira_reserva_en, 'metodo_pago', v_ped.metodo_pago, 'repetido', true,
                              'mp_preferencia_id', v_ped.mp_preferencia_id);
  end if;

  if v_metodo not in ('mercadopago', 'transferencia') then raise exception 'metodo_invalido' using errcode = 'P0001'; end if;
  if length(v_nombre) not between 2 and 120 or v_tel !~ '^[0-9]{10}$'
     or (v_correo <> '' and v_correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'contacto_invalido' using errcode = 'P0001';
  end if;

  -- Topes anti-acaparamiento (ARQUITECTURA §3.3 A regla 3)
  if (select count(*) from public.pedidos
       where contacto ->> 'telefono' = v_tel and estado in ('pendiente_pago', 'pendiente_validacion')
         and creado_en > now() - interval '24 hours') >= c.max_pendientes_telefono then
    raise exception 'demasiados_pendientes' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_datos -> 'items') <> 'array' or jsonb_array_length(p_datos -> 'items') = 0 then
    raise exception 'sin_items' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_datos -> 'items') > 10 then raise exception 'demasiadas_piezas' using errcode = 'P0001'; end if;

  v_envio := public.cotizar_entrega(p_datos -> 'entrega');

  -- Precios SIEMPRE de la BD
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

  v_total := v_sub + v_envio;
  if (p_datos ->> 'total_visto') is null or (p_datos ->> 'total_visto')::numeric <> v_total then
    -- El precio o el envío cambiaron: se le muestra el nuevo total antes de pagar
    raise exception 'total_cambio' using errcode = 'P0001', detail = v_total::text;
  end if;

  -- Clienta (invitada): se liga por teléfono para que aparezca en el panel
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
          v_sub, v_envio, v_total, p_datos -> 'entrega', v_metodo)
  returning * into v_ped;

  insert into public.pedido_items (pedido_id, variante_id, cantidad, precio_unitario)
  select v_ped.id, v.id, sum(i.cantidad), v.precio
  from jsonb_to_recordset(p_datos -> 'items') as i(sku text, cantidad integer)
  join public.variantes v on v.sku = i.sku
  group by v.id, v.precio;

  v_minutos := case v_metodo when 'transferencia' then c.reserva_transfer_min else c.reserva_tarjeta_min end;
  v_expira := public.reservar_stock(v_ped.id, v_minutos);   -- sin stock → excepción y se revierte TODO

  return jsonb_build_object('id', v_ped.id, 'folio', v_ped.folio, 'token', v_ped.token_rastreo, 'total', v_total,
                            'subtotal', v_sub, 'envio', v_envio, 'expira', v_expira, 'metodo_pago', v_metodo, 'repetido', false);
end
$$;

-- ---------------------------------------------------------------------------
-- Confirmar un pago (MP o transferencia). Si la reserva venció, intenta reservar
-- de nuevo; si ya no hay stock → pagado_sin_stock + alerta (la dueña reembolsa).
-- ---------------------------------------------------------------------------
create function privado.confirmar_pago(p_pedido uuid, p_usuario uuid default null)
returns text
language plpgsql security definer set search_path = '' as
$$
declare v_estado text;
begin
  select estado into v_estado from public.pedidos where id = p_pedido for update;
  if v_estado in ('pagado', 'preparando', 'enviado', 'entregado', 'pagado_sin_stock', 'reembolsado', 'contracargo') then
    return v_estado;                                   -- ya procesado (idempotente)
  end if;
  begin
    if not exists (select 1 from public.reservas_stock where pedido_id = p_pedido and estado = 'activa') then
      perform public.reservar_stock(p_pedido, 30);     -- pago tardío: ¿todavía hay?
    end if;
    perform public.confirmar_venta(p_pedido);
    perform public.cambiar_estado_pedido(p_pedido, 'pagado', p_usuario);
    update public.pedidos set pago_estado = 'aprobado', actualizado_en = now() where id = p_pedido;
    return 'pagado';
  exception when sqlstate 'P0001' then
    -- Solo los errores de stock se convierten en "pagado sin stock"; cualquier otro se propaga
    if sqlerrm not in ('sin_stock', 'sin_stock_fisico', 'reserva_no_activa') then raise; end if;
    -- El dinero entró pero la pieza ya no está
    perform public.cambiar_estado_pedido(p_pedido, 'pagado_sin_stock', p_usuario);
    update public.pedidos set pago_estado = 'aprobado', actualizado_en = now() where id = p_pedido;
    insert into privado.alertas (tipo, detalle, pedido_id)
    values ('pagado_sin_stock', jsonb_build_object('folio', (select folio from public.pedidos where id = p_pedido), 'motivo', sqlerrm), p_pedido);
    return 'pagado_sin_stock';
  end;
end
$$;

-- ---------------------------------------------------------------------------
-- registrar_pago_mp: lo llama webhook-mercadopago DESPUÉS de verificar la firma y
-- de consultar el pago a la API de Mercado Pago (nunca con el contenido del aviso).
-- p_pago = { id, status, status_detail, transaction_amount, currency_id,
--            external_reference, payment_type_id, date_of_expiration }
-- ---------------------------------------------------------------------------
create function public.registrar_pago_mp(p_pago jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as
$$
declare
  c        public.config_tienda;
  v_ped    public.pedidos;
  v_id     text := p_pago ->> 'id';
  v_status text := p_pago ->> 'status';
  v_monto  numeric := (p_pago ->> 'transaction_amount')::numeric;
  v_res    text := 'sin_cambio';
  v_hasta  timestamptz;
begin
  select * into c from public.config_tienda;
  if v_id is null or v_id !~ '^[0-9]{1,30}$' then raise exception 'pago_invalido' using errcode = 'P0001'; end if;

  select * into v_ped from public.pedidos where id::text = p_pago ->> 'external_reference' for update;
  if not found then
    insert into privado.alertas (tipo, detalle) values ('pago_sin_pedido', jsonb_build_object('pago', v_id, 'ref', p_pago ->> 'external_reference'));
    return jsonb_build_object('resultado', 'pedido_no_existe');
  end if;

  insert into public.pagos (pedido_id, proveedor, id_externo, estado, estado_detalle, monto, moneda)
  values (v_ped.id, 'mercadopago', v_id, v_status, p_pago ->> 'status_detail', coalesce(v_monto, 0), coalesce(p_pago ->> 'currency_id', 'MXN'))
  on conflict (proveedor, id_externo) do update
    set estado = excluded.estado, estado_detalle = excluded.estado_detalle, monto = excluded.monto, actualizado_en = now();

  if v_status = 'approved' then
    if coalesce(p_pago ->> 'currency_id', '') <> 'MXN' or v_monto is distinct from v_ped.total then
      insert into privado.alertas (tipo, detalle, pedido_id)
      values ('monto_distinto', jsonb_build_object('folio', v_ped.folio, 'pagado', v_monto, 'moneda', p_pago ->> 'currency_id', 'total', v_ped.total), v_ped.id);
      return jsonb_build_object('resultado', 'monto_distinto');
    end if;
    v_res := privado.confirmar_pago(v_ped.id);

  elsif v_status in ('pending', 'in_process') then
    -- SPEI u otro pago que tarda en acreditarse: se extiende la reserva hasta su vencimiento (tope configurable) [24]
    v_hasta := least(coalesce((p_pago ->> 'date_of_expiration')::timestamptz, now() + interval '1 day'),
                     v_ped.creado_en + make_interval(mins => c.reserva_spei_max_min));
    update public.reservas_stock set expira_en = greatest(expira_en, v_hasta) where pedido_id = v_ped.id and estado = 'activa';
    update public.pedidos set expira_reserva_en = greatest(expira_reserva_en, v_hasta), actualizado_en = now() where id = v_ped.id;
    v_res := 'pendiente';

  elsif v_status in ('rejected') then
    v_res := 'rechazado';                       -- puede reintentar mientras dure la reserva

  elsif v_status = 'cancelled' then
    if v_ped.estado in ('pendiente_pago', 'pendiente_validacion') then
      perform public.liberar_reserva(v_ped.id);
      perform public.cambiar_estado_pedido(v_ped.id, 'cancelado');
    end if;
    v_res := 'cancelado';

  elsif v_status = 'refunded' then
    if v_ped.estado not in ('reembolsado') and privado.transicion_valida(v_ped.estado, 'reembolsado') then
      perform public.cambiar_estado_pedido(v_ped.id, 'reembolsado');
      update public.pedidos set pago_estado = 'reembolsado' where id = v_ped.id;
      insert into privado.alertas (tipo, detalle, pedido_id) values ('reembolso', jsonb_build_object('folio', v_ped.folio), v_ped.id);
    end if;
    v_res := 'reembolsado';

  elsif v_status = 'charged_back' then
    if privado.transicion_valida(v_ped.estado, 'contracargo') then
      perform public.cambiar_estado_pedido(v_ped.id, 'contracargo');
    end if;
    update public.pedidos set pago_estado = 'contracargo', no_entregar = true where id = v_ped.id;
    insert into privado.alertas (tipo, detalle, pedido_id) values ('contracargo', jsonb_build_object('folio', v_ped.folio, 'monto', v_monto), v_ped.id);
    v_res := 'contracargo';
  end if;
  return jsonb_build_object('resultado', v_res, 'folio', v_ped.folio);
end
$$;

-- ---------------------------------------------------------------------------
-- Transferencia directa (§3.3 A2)
-- ---------------------------------------------------------------------------
-- La clienta avisa que ya transfirió (con comprobante en R2 o "lo mandé por WhatsApp")
create function public.avisar_transferencia(p_token text, p_comprobante text default null)
returns jsonb
language plpgsql security definer set search_path = '' as
$$
declare v_ped public.pedidos;
begin
  select * into v_ped from public.pedidos where token_rastreo = p_token for update;
  if not found or v_ped.metodo_pago <> 'transferencia' then raise exception 'pedido_no_existe' using errcode = 'P0001'; end if;
  if v_ped.estado not in ('pendiente_pago', 'pendiente_validacion') then raise exception 'pedido_no_pendiente' using errcode = 'P0001'; end if;
  insert into public.pagos (pedido_id, proveedor, id_externo, estado, monto, comprobante_clave)
  values (v_ped.id, 'transferencia', 'tr-' || v_ped.folio, 'por_validar', v_ped.total, p_comprobante)
  on conflict (proveedor, id_externo) do update set comprobante_clave = coalesce(excluded.comprobante_clave, public.pagos.comprobante_clave), actualizado_en = now();
  perform public.cambiar_estado_pedido(v_ped.id, 'pendiente_validacion');
  return jsonb_build_object('folio', v_ped.folio, 'estado', 'pendiente_validacion');
end
$$;

-- La dueña aprueba o rechaza (panel-transferencias, con MFA)
create function public.panel_validar_transferencia(p_pedido uuid, p_aprobar boolean, p_usuario uuid, p_nota text default null)
returns text
language plpgsql security definer set search_path = '' as
$$
declare v_ped public.pedidos; v_res text;
begin
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found or v_ped.metodo_pago <> 'transferencia' then raise exception 'pedido_no_existe' using errcode = 'P0001'; end if;
  if v_ped.estado not in ('pendiente_pago', 'pendiente_validacion', 'expirado', 'cancelado') then
    raise exception 'pedido_no_pendiente' using errcode = 'P0001';
  end if;
  insert into public.pagos (pedido_id, proveedor, id_externo, estado, monto)
  values (v_ped.id, 'transferencia', 'tr-' || v_ped.folio, case when p_aprobar then 'aprobado' else 'rechazado' end, v_ped.total)
  on conflict (proveedor, id_externo) do update set estado = excluded.estado, actualizado_en = now();
  insert into public.auditoria_panel (usuario, accion, tabla, registro, despues)
  values (p_usuario, case when p_aprobar then 'aprobar_transferencia' else 'rechazar_transferencia' end, 'pedidos', v_ped.folio,
          jsonb_build_object('total', v_ped.total, 'nota', p_nota));
  if p_aprobar then
    v_res := privado.confirmar_pago(v_ped.id, p_usuario);
  else
    perform public.liberar_reserva(v_ped.id);
    if v_ped.estado <> 'cancelado' then perform public.cambiar_estado_pedido(v_ped.id, 'cancelado', p_usuario, p_nota); end if;
    update public.pedidos set pago_estado = 'rechazado' where id = v_ped.id;
    v_res := 'cancelado';
  end if;
  return v_res;
end
$$;

-- Reembolso registrado (después de que Mercado Pago lo aceptó, o manual para transferencia)
create function public.panel_registrar_reembolso(p_pedido uuid, p_usuario uuid, p_id_reembolso text, p_nota text default null)
returns text
language plpgsql security definer set search_path = '' as
$$
declare v_ped public.pedidos;
begin
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'pedido_no_existe' using errcode = 'P0001'; end if;
  perform public.cambiar_estado_pedido(p_pedido, 'reembolsado', p_usuario, p_nota);
  update public.pedidos set pago_estado = 'reembolsado' where id = p_pedido;
  insert into public.auditoria_panel (usuario, accion, tabla, registro, despues)
  values (p_usuario, 'reembolsar', 'pedidos', v_ped.folio, jsonb_build_object('total', v_ped.total, 'reembolso', p_id_reembolso, 'nota', p_nota));
  return 'reembolsado';
end
$$;

-- Al expirar una reserva sin pago, el pedido pendiente pasa a "expirado"
create or replace function public.liberar_reservas_vencidas()
returns integer
language plpgsql security definer set search_path = '' as
$$
declare v_pedido uuid; v_n integer := 0;
begin
  for v_pedido in
    select distinct pedido_id from public.reservas_stock
    where estado = 'activa' and expira_en < now() order by pedido_id limit 500
  loop
    perform public.liberar_reserva(v_pedido);
    if (select estado from public.pedidos where id = v_pedido) in ('pendiente_pago', 'pendiente_validacion') then
      perform public.cambiar_estado_pedido(v_pedido, 'expirado');
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end
$$;

-- ---------------------------------------------------------------------------
-- Rastreo público (§3.3 F): nunca el domicilio completo ni datos de otros
-- ---------------------------------------------------------------------------
create function privado.vista_rastreo(p_ped public.pedidos)
returns jsonb
language sql stable security definer set search_path = '' as
$$
  select jsonb_build_object(
    'folio', p_ped.folio, 'estado', p_ped.estado, 'pago_estado', p_ped.pago_estado, 'metodo_pago', p_ped.metodo_pago,
    'creado_en', p_ped.creado_en, 'expira_reserva_en', p_ped.expira_reserva_en,
    'subtotal', p_ped.subtotal, 'envio', p_ped.envio, 'total', p_ped.total,
    'nombre', split_part(p_ped.contacto ->> 'nombre', ' ', 1),
    'entrega', jsonb_build_object('tipo', p_ped.entrega ->> 'tipo', 'zona', p_ped.entrega ->> 'zona', 'cita', p_ped.entrega ->> 'cita'),
    'items', (select coalesce(jsonb_agg(jsonb_build_object('nombre', coalesce(t.nombre, pr.nombre), 'sku', v.sku, 'graduacion', v.graduacion,
                                                           'duracion', v.duracion, 'cantidad', i.cantidad, 'precio', i.precio_unitario,
                                                           'clave', coalesce(t.slug, pr.slug)) order by v.sku), '[]')
              from public.pedido_items i join public.variantes v on v.id = i.variante_id
              join public.productos pr on pr.id = v.producto_id left join public.tonos t on t.id = v.tono_id
              where i.pedido_id = p_ped.id),
    'envio_info', (select jsonb_build_object('guia', e.guia, 'url_rastreo', e.url_rastreo, 'proveedor', e.proveedor, 'estado', e.estado)
                   from public.envios e where e.pedido_id = p_ped.id order by e.creado_en desc limit 1),
    'transferencia', case when p_ped.metodo_pago = 'transferencia' and p_ped.estado in ('pendiente_pago', 'pendiente_validacion')
                     then (select jsonb_build_object('banco', banco, 'clabe', clabe, 'beneficiario', beneficiario) from public.config_tienda) end,
    'whatsapp', (select whatsapp from public.config_tienda)
  )
$$;

create function public.rastrear_por_token(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = '' as
$$
declare v_ped public.pedidos;
begin
  if p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select * into v_ped from public.pedidos where token_rastreo = p_token;
  if not found then return null; end if;
  return privado.vista_rastreo(v_ped);
end
$$;

create function public.rastrear_por_folio(p_folio text, p_tel4 text)
returns jsonb
language plpgsql stable security definer set search_path = '' as
$$
declare v_ped public.pedidos;
begin
  if p_tel4 !~ '^[0-9]{4}$' then return null; end if;
  select * into v_ped from public.pedidos where folio = upper(trim(p_folio)) and right(contacto ->> 'telefono', 4) = p_tel4;
  if not found then return null; end if;
  return privado.vista_rastreo(v_ped);
end
$$;

-- ---------------------------------------------------------------------------
-- Alertas para el panel ("Hoy") y para el correo del equipo
-- ---------------------------------------------------------------------------
create function public.panel_alertas()
returns table (id uuid, tipo text, detalle jsonb, creado_en timestamptz, pedido_id uuid)
language plpgsql stable security definer set search_path = '' as
$$
begin
  if not seguridad.es_panel(array['duena', 'ayudante']) then raise exception 'sin_acceso' using errcode = '42501'; end if;
  return query
    select a.id, a.tipo, a.detalle, a.creado_en, a.pedido_id from privado.alertas a where not a.atendida
    union all
    -- El cron dejó de correr: lo detecta el panel (el cron no puede avisar de sí mismo)
    select gen_random_uuid(), 'cron_sin_correr', jsonb_build_object('ultima', l.ultima_corrida), l.ultima_corrida, null
    from privado.latidos l where l.nombre = 'cron-conciliar' and l.ultima_corrida < now() - interval '30 minutes'
    order by 4 desc limit 50;
end
$$;

create function public.panel_atender_alerta(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as
$$
begin
  if not seguridad.es_panel(array['duena', 'ayudante']) then raise exception 'sin_acceso' using errcode = '42501'; end if;
  update privado.alertas set atendida = true where id = p_id;
  insert into public.auditoria_panel (usuario, accion, tabla, registro) values ((select auth.uid()), 'atender_alerta', 'alertas', p_id::text);
end
$$;

-- Alertas pendientes de mandar por correo (las toma el cron)
create function public.alertas_por_notificar()
returns table (id uuid, tipo text, detalle jsonb, creado_en timestamptz)
language sql security definer set search_path = '' as
$$
  update privado.alertas set notificada_en = now()
  where id in (select id from privado.alertas where notificada_en is null order by creado_en limit 20)
  returning id, tipo, detalle, creado_en
$$;

-- ---------------------------------------------------------------------------
-- RLS y permisos
-- ---------------------------------------------------------------------------
alter table public.config_tienda enable row level security;
alter table public.tarifas_entrega enable row level security;
revoke all on public.config_tienda, public.tarifas_entrega from anon, authenticated;
grant select on public.config_tienda, public.tarifas_entrega to authenticated;
grant update (reserva_tarjeta_min, reserva_transfer_min, max_piezas_renglon, max_piezas_pedido, max_pendientes_telefono, banco, clabe, beneficiario, whatsapp) on public.config_tienda to authenticated;
grant update (costo, detalle, activo, orden) on public.tarifas_entrega to authenticated;
do $$
declare t text;
begin
  foreach t in array array['config_tienda', 'tarifas_entrega'] loop
    execute format($p$create policy panel_lee on public.%I for select to authenticated using ((select seguridad.es_panel(array['duena', 'ayudante'])))$p$, t);
    execute format($p$create policy duena_edita on public.%I for update to authenticated using ((select seguridad.es_panel(array['duena']))) with check ((select seguridad.es_panel(array['duena'])))$p$, t);
    execute format($p$create policy mfa_obligatorio_panel on public.%I as restrictive for all to authenticated
                     using ((select seguridad.rol_panel()) is null or (select seguridad.mfa_ok()))
                     with check ((select seguridad.rol_panel()) is null or (select seguridad.mfa_ok()))$p$, t);
  end loop;
end $$;
create trigger auditar_panel after update on public.config_tienda for each row execute function privado.auditar_panel();
create trigger auditar_panel after update on public.tarifas_entrega for each row execute function privado.auditar_panel();

-- EXECUTE: solo las Edge Functions, salvo las dos del panel (que validan rol + MFA adentro)
do $$
declare f text;
begin
  foreach f in array array[
    'public.cotizar_entrega(jsonb)', 'public.cambiar_estado_pedido(uuid, text, uuid, text)', 'public.crear_pedido(jsonb)',
    'public.registrar_pago_mp(jsonb)', 'public.avisar_transferencia(text, text)',
    'public.panel_validar_transferencia(uuid, boolean, uuid, text)', 'public.panel_registrar_reembolso(uuid, uuid, text, text)',
    'public.liberar_reservas_vencidas()', 'public.rastrear_por_token(text)', 'public.rastrear_por_folio(text, text)',
    'public.alertas_por_notificar()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
revoke execute on function public.panel_alertas(), public.panel_atender_alerta(uuid) from public, anon;
grant execute on function public.panel_alertas(), public.panel_atender_alerta(uuid) to authenticated, service_role;
revoke execute on function privado.transicion_valida(text, text), privado.confirmar_pago(uuid, uuid), privado.vista_rastreo(public.pedidos)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Webhooks: registro idempotente de avisos (§6.1 regla 6)
-- ---------------------------------------------------------------------------
create function public.registrar_evento(p_proveedor text, p_id_evento text, p_payload jsonb)
returns boolean
language plpgsql security definer set search_path = '' as
$$
begin
  insert into privado.eventos_webhook (proveedor, id_evento, payload) values (p_proveedor, p_id_evento, p_payload)
  on conflict (proveedor, id_evento) do update set intentos = privado.eventos_webhook.intentos + 1
  where privado.eventos_webhook.procesado_en is null;          -- reintento de uno que falló: se vuelve a procesar
  return found;                                                 -- false = ya procesado antes
end
$$;

create function public.marcar_evento(p_proveedor text, p_id_evento text, p_error text default null)
returns void
language sql security definer set search_path = '' as
$$
  update privado.eventos_webhook
     set procesado_en = case when p_error is null then now() end, error = left(p_error, 500)
   where proveedor = p_proveedor and id_evento = p_id_evento;
  insert into privado.alertas (tipo, detalle)
  select 'webhook_fallido', jsonb_build_object('proveedor', p_proveedor, 'evento', p_id_evento, 'error', left(p_error, 200))
  where p_error is not null
    and (select intentos from privado.eventos_webhook where proveedor = p_proveedor and id_evento = p_id_evento) >= 2;
$$;

-- Cancelación desde el panel (solo pedidos aún no pagados) o si Mercado Pago no respondió al crear el cobro
create function public.cancelar_pedido(p_pedido uuid, p_usuario uuid default null, p_nota text default null)
returns text
language plpgsql security definer set search_path = '' as
$$
declare v_estado text;
begin
  select estado into v_estado from public.pedidos where id = p_pedido for update;
  if v_estado not in ('pendiente_pago', 'pendiente_validacion', 'expirado') then raise exception 'pedido_no_cancelable' using errcode = 'P0001'; end if;
  perform public.liberar_reserva(p_pedido);
  if v_estado <> 'expirado' then perform public.cambiar_estado_pedido(p_pedido, 'cancelado', p_usuario, p_nota); end if;
  return 'cancelado';
end
$$;

create function public.guardar_preferencia_mp(p_pedido uuid, p_preferencia text)
returns void
language sql security definer set search_path = '' as
$$ update public.pedidos set mp_preferencia_id = p_preferencia, actualizado_en = now() where id = p_pedido $$;

-- Limpieza de payloads de webhooks a los 90 días (§6.1 regla 14); la llama el cron
create function public.limpiar_payloads_viejos()
returns integer
language sql security definer set search_path = '' as
$$
  with x as (update privado.eventos_webhook set payload = null where payload is not null and recibido_en < now() - interval '90 days' returning 1)
  select count(*)::integer from x
$$;

do $$
declare f text;
begin
  foreach f in array array['public.registrar_evento(text, text, jsonb)', 'public.marcar_evento(text, text, text)',
                           'public.cancelar_pedido(uuid, uuid, text)', 'public.guardar_preferencia_mp(uuid, text)',
                           'public.limpiar_payloads_viejos()'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
