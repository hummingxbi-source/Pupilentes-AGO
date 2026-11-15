-- =============================================================================
-- Fase 3 · Devoluciones al inventario y estado protegido (ARQUITECTURA §3.3 E)
--
-- Regla (decidida 14 nov 2026):
--   · Reembolso o contracargo de un pedido que NO salió (pagado / preparando):
--     las piezas siguen en la tienda → el stock regresa solo.
--   · Si ya se envió o entregó: el stock regresa solo cuando la dueña confirma en el
--     panel que el producto volvió vendible (panel_registrar_devolucion).
--   · Un pedido "pagado_sin_stock" nunca descontó stock → no hay nada que devolver.
-- Todo con mover_stock(+n, 'devolucion', ref única): repetirlo no duplica.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Devuelve al inventario lo que confirmar_venta descontó. Idempotente.
-- Devuelve cuántos renglones regresaron (0 si no había venta o ya se devolvió).
-- ---------------------------------------------------------------------------
create function privado.devolver_stock_pedido(p_pedido uuid, p_usuario uuid default null)
returns integer
language plpgsql security definer set search_path = '' as
$$
declare v_r record; v_n integer := 0;
begin
  for v_r in
    select variante_id, cantidad from public.reservas_stock
    where pedido_id = p_pedido and estado = 'confirmada'
    order by variante_id
  loop
    if public.mover_stock(v_r.variante_id, v_r.cantidad, 'devolucion',
                          'devolucion:' || p_pedido || ':' || v_r.variante_id, 'web', p_pedido, p_usuario) then
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end
$$;
revoke execute on function privado.devolver_stock_pedido(uuid, uuid) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Estado protegido: solo cambiar_estado_pedido puede cambiar pedidos.estado
-- (defensa en profundidad; ninguna política concede UPDATE de pedidos).
-- ---------------------------------------------------------------------------
create function privado.proteger_estado_pedido() returns trigger
language plpgsql set search_path = '' as
$$
begin
  if coalesce(current_setting('ago.cambio_estado', true), '') <> '1' then
    raise exception 'estado_protegido' using errcode = '42501',
      hint = 'El estado del pedido solo cambia con public.cambiar_estado_pedido';
  end if;
  return new;
end
$$;
create trigger proteger_estado before update of estado on public.pedidos
  for each row when (old.estado is distinct from new.estado)
  execute function privado.proteger_estado_pedido();

create or replace function public.cambiar_estado_pedido(p_pedido uuid, p_nuevo text, p_usuario uuid default null, p_nota text default null)
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
  perform set_config('ago.cambio_estado', '1', true);
  update public.pedidos set estado = p_nuevo, actualizado_en = now() where id = p_pedido;
  perform set_config('ago.cambio_estado', '', true);
  if p_usuario is not null then
    insert into public.auditoria_panel (usuario, accion, tabla, registro, antes, despues)
    values (p_usuario, 'estado_pedido', 'pedidos', p_pedido::text, jsonb_build_object('estado', v_actual), jsonb_build_object('estado', p_nuevo, 'nota', p_nota));
  end if;
  return p_nuevo;
end
$$;

-- ---------------------------------------------------------------------------
-- Reembolso desde el panel: si el pedido no había salido, el stock regresa solo.
-- Devuelve 'reembolsado' o 'reembolsado_stock_devuelto'.
-- ---------------------------------------------------------------------------
create or replace function public.panel_registrar_reembolso(p_pedido uuid, p_usuario uuid, p_id_reembolso text, p_nota text default null)
returns text
language plpgsql security definer set search_path = '' as
$$
declare v_ped public.pedidos; v_dev integer := 0;
begin
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'pedido_no_existe' using errcode = 'P0001'; end if;
  -- El aviso "refunded" de MP puede llegar antes que esta llamada: entonces ya está reembolsado
  if v_ped.estado <> 'reembolsado' then perform public.cambiar_estado_pedido(p_pedido, 'reembolsado', p_usuario, p_nota); end if;
  update public.pedidos set pago_estado = 'reembolsado' where id = p_pedido;
  if v_ped.estado in ('pagado', 'preparando') then v_dev := privado.devolver_stock_pedido(p_pedido, p_usuario); end if;
  insert into public.auditoria_panel (usuario, accion, tabla, registro, despues)
  values (p_usuario, 'reembolsar', 'pedidos', v_ped.folio,
          jsonb_build_object('total', v_ped.total, 'reembolso', p_id_reembolso, 'nota', p_nota, 'renglones_devueltos', v_dev));
  return case when v_dev > 0 then 'reembolsado_stock_devuelto' else 'reembolsado' end;
end
$$;

-- ---------------------------------------------------------------------------
-- La dueña confirma que un pedido ya enviado regresó vendible (§3.3 E).
-- Solo para pedidos reembolsados o en contracargo. Idempotente.
-- ---------------------------------------------------------------------------
create function public.panel_registrar_devolucion(p_pedido uuid, p_usuario uuid, p_nota text default null)
returns integer
language plpgsql security definer set search_path = '' as
$$
declare v_ped public.pedidos; v_dev integer;
begin
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'pedido_no_existe' using errcode = 'P0001'; end if;
  if v_ped.estado not in ('reembolsado', 'contracargo') then raise exception 'pedido_no_devolvible' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.reservas_stock where pedido_id = p_pedido and estado = 'confirmada') then
    raise exception 'sin_venta_que_devolver' using errcode = 'P0001';   -- p. ej. pagado_sin_stock
  end if;
  v_dev := privado.devolver_stock_pedido(p_pedido, p_usuario);
  if v_dev = 0 then raise exception 'ya_devuelto' using errcode = 'P0001'; end if;
  insert into public.auditoria_panel (usuario, accion, tabla, registro, despues)
  values (p_usuario, 'devolucion_inventario', 'pedidos', v_ped.folio, jsonb_build_object('renglones', v_dev, 'nota', p_nota));
  return v_dev;
end
$$;

-- ---------------------------------------------------------------------------
-- registrar_pago_mp: igual que en 20261114000000_pedidos.sql, salvo que
-- "refunded" y "charged_back" devuelven el stock si el pedido no había salido.
-- ---------------------------------------------------------------------------
create or replace function public.registrar_pago_mp(p_pago jsonb)
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
  v_salio  boolean;
begin
  select * into c from public.config_tienda;
  if v_id is null or v_id !~ '^[0-9]{1,30}$' then raise exception 'pago_invalido' using errcode = 'P0001'; end if;

  select * into v_ped from public.pedidos where id::text = p_pago ->> 'external_reference' for update;
  if not found then
    insert into privado.alertas (tipo, detalle) values ('pago_sin_pedido', jsonb_build_object('pago', v_id, 'ref', p_pago ->> 'external_reference'));
    return jsonb_build_object('resultado', 'pedido_no_existe');
  end if;
  v_salio := v_ped.estado in ('enviado', 'entregado');

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
      if not v_salio then perform privado.devolver_stock_pedido(v_ped.id); end if;
      insert into privado.alertas (tipo, detalle, pedido_id)
      values ('reembolso', jsonb_build_object('folio', v_ped.folio, 'stock_devuelto', not v_salio), v_ped.id);
    end if;
    v_res := 'reembolsado';

  elsif v_status = 'charged_back' then
    if privado.transicion_valida(v_ped.estado, 'contracargo') then
      perform public.cambiar_estado_pedido(v_ped.id, 'contracargo');
      if not v_salio then perform privado.devolver_stock_pedido(v_ped.id); end if;
    end if;
    update public.pedidos set pago_estado = 'contracargo', no_entregar = true where id = v_ped.id;
    insert into privado.alertas (tipo, detalle, pedido_id)
    values ('contracargo', jsonb_build_object('folio', v_ped.folio, 'monto', v_monto, 'stock_devuelto', not v_salio), v_ped.id);
    v_res := 'contracargo';
  end if;
  return jsonb_build_object('resultado', v_res, 'folio', v_ped.folio);
end
$$;

-- Permisos (create or replace conserva los de las funciones existentes; aquí las nuevas)
revoke execute on function public.panel_registrar_devolucion(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.panel_registrar_devolucion(uuid, uuid, text) to service_role;
