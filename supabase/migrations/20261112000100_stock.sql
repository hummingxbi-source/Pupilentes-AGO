-- =============================================================================
-- Fase 1 · Regla de oro del stock (ARQUITECTURA §3.2)
--
-- El stock SOLO cambia con estas cuatro funciones, cada una en una transacción:
--   reservar_stock(pedido)          aparta lo del pedido o no aparta nada
--   confirmar_venta(pedido)         pago aprobado: baja stock y reservado
--   liberar_reserva(pedido)         pago vencido/rechazado/cancelado: devuelve lo apartado
--   mover_stock(variante, delta…)   ventas de ML/TikTok, ajustes, devoluciones, conciliación
-- + liberar_reservas_vencidas()     la llama el cron.
--
-- Todas: SECURITY DEFINER con search_path vacío, EXECUTE solo para service_role
-- (las Edge Functions). La sobreventa se evita con UPDATE … WHERE condicional:
-- dos compras de la última pieza se resuelven dentro de Postgres y solo una gana.
-- =============================================================================

-- Encola el empuje de stock a ML/TikTok para las publicaciones activas de la variante.
create function privado.encolar_sync(p_variante uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into privado.cola_sync (variante_id, canal, intentos, proximo_intento, error)
  select distinct p_variante, pc.canal, 0, now(), null
  from public.publicaciones_canal pc
  where pc.variante_id = p_variante and pc.activo
  on conflict (variante_id, canal) do update
    set intentos = 0, proximo_intento = now(), error = null;
$$;

create function privado.alerta(p_tipo text, p_detalle jsonb)
returns void
language sql
security definer
set search_path = ''
as $$ insert into privado.alertas (tipo, detalle) values (p_tipo, p_detalle); $$;

-- ---------------------------------------------------------------------------
-- reservar_stock: aparta todos los renglones del pedido, o ninguno.
-- Devuelve la fecha de vencimiento de la reserva. Idempotente: si el pedido ya
-- tiene reserva activa, devuelve la existente sin apartar de nuevo.
-- Errores (SQLSTATE P0001, el mensaje es el código):
--   pedido_no_existe · pedido_sin_items · pedido_ya_confirmado · variante_inactiva · sin_stock (detail = sku)
-- ---------------------------------------------------------------------------
create function public.reservar_stock(p_pedido uuid, p_minutos integer default 30)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expira  timestamptz;
  v_renglon record;
  v_ok      boolean;
begin
  if p_minutos is null or p_minutos < 1 or p_minutos > 4320 then   -- máximo 3 días [24]
    raise exception 'minutos_invalidos' using errcode = 'P0001';
  end if;

  -- Serializa llamadas sobre el mismo pedido
  perform 1 from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'pedido_no_existe' using errcode = 'P0001'; end if;

  if exists (select 1 from public.reservas_stock where pedido_id = p_pedido and estado = 'confirmada') then
    raise exception 'pedido_ya_confirmado' using errcode = 'P0001';
  end if;
  select max(expira_en) into v_expira from public.reservas_stock where pedido_id = p_pedido and estado = 'activa';
  if v_expira is not null then return v_expira; end if;

  if not exists (select 1 from public.pedido_items where pedido_id = p_pedido) then
    raise exception 'pedido_sin_items' using errcode = 'P0001';
  end if;

  v_expira := now() + make_interval(mins => p_minutos);

  -- Orden por id de variante: evita bloqueos cruzados entre pedidos simultáneos
  for v_renglon in
    select pi.variante_id, sum(pi.cantidad)::integer as cantidad, v.sku, v.activo
    from public.pedido_items pi join public.variantes v on v.id = pi.variante_id
    where pi.pedido_id = p_pedido
    group by pi.variante_id, v.sku, v.activo
    order by pi.variante_id
  loop
    if not v_renglon.activo then
      raise exception 'variante_inactiva' using errcode = 'P0001', detail = v_renglon.sku;
    end if;

    update public.variantes
       set stock_reservado = stock_reservado + v_renglon.cantidad
     where id = v_renglon.variante_id
       and stock - stock_reservado >= v_renglon.cantidad
    returning true into v_ok;

    if v_ok is null then
      -- Un renglón no alcanza: la excepción revierte todo lo apartado en esta llamada
      raise exception 'sin_stock' using errcode = 'P0001', detail = v_renglon.sku;
    end if;
    v_ok := null;

    insert into public.reservas_stock (pedido_id, variante_id, cantidad, expira_en, estado)
    values (p_pedido, v_renglon.variante_id, v_renglon.cantidad, v_expira, 'activa')
    on conflict (pedido_id, variante_id) do update
      set cantidad = excluded.cantidad, expira_en = excluded.expira_en, estado = 'activa', creado_en = now();
  end loop;

  update public.pedidos set expira_reserva_en = v_expira, actualizado_en = now() where id = p_pedido;
  return v_expira;
end;
$$;

-- ---------------------------------------------------------------------------
-- confirmar_venta: el pago se aprobó. Baja stock y stock_reservado, marca la
-- reserva como confirmada, escribe la venta en la bitácora y encola la sync.
-- Devuelve true si confirmó ahora y false si ya estaba confirmada (idempotente).
-- Errores: pedido_no_existe · reserva_no_activa · sin_stock_fisico (detail = sku)
-- ---------------------------------------------------------------------------
create function public.confirmar_venta(p_pedido uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r   record;
  v_ok  boolean;
begin
  perform 1 from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'pedido_no_existe' using errcode = 'P0001'; end if;

  if not exists (select 1 from public.reservas_stock where pedido_id = p_pedido and estado = 'activa') then
    if exists (select 1 from public.reservas_stock where pedido_id = p_pedido and estado = 'confirmada') then
      return false;
    end if;
    raise exception 'reserva_no_activa' using errcode = 'P0001';
  end if;

  for v_r in
    select r.variante_id, r.cantidad, v.sku
    from public.reservas_stock r join public.variantes v on v.id = r.variante_id
    where r.pedido_id = p_pedido and r.estado = 'activa'
    order by r.variante_id
  loop
    update public.variantes
       set stock = stock - v_r.cantidad,
           stock_reservado = stock_reservado - v_r.cantidad
     where id = v_r.variante_id
       and stock >= v_r.cantidad
       and stock_reservado >= v_r.cantidad
    returning true into v_ok;

    if v_ok is null then
      -- Solo pasa si una venta de otro canal dejó el stock físico por debajo de lo apartado
      raise exception 'sin_stock_fisico' using errcode = 'P0001', detail = v_r.sku;
    end if;
    v_ok := null;

    insert into public.movimientos_stock (variante_id, delta, motivo, canal, pedido_id, ref_externa)
    values (v_r.variante_id, -v_r.cantidad, 'venta', 'web', p_pedido, 'web:' || p_pedido || ':' || v_r.variante_id);

    perform privado.encolar_sync(v_r.variante_id);
  end loop;

  update public.reservas_stock set estado = 'confirmada' where pedido_id = p_pedido and estado = 'activa';
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- liberar_reserva: devuelve lo apartado. No hace nada si ya estaba liberada o
-- confirmada. Devuelve cuántos renglones liberó.
-- ---------------------------------------------------------------------------
create function public.liberar_reserva(p_pedido uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r record;
  v_n integer := 0;
begin
  perform 1 from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'pedido_no_existe' using errcode = 'P0001'; end if;

  for v_r in
    select variante_id, cantidad from public.reservas_stock
    where pedido_id = p_pedido and estado = 'activa'
    order by variante_id
    for update
  loop
    update public.variantes
       set stock_reservado = greatest(stock_reservado - v_r.cantidad, 0)
     where id = v_r.variante_id;
    perform privado.encolar_sync(v_r.variante_id);
    v_n := v_n + 1;
  end loop;

  update public.reservas_stock set estado = 'liberada' where pedido_id = p_pedido and estado = 'activa';
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------
-- mover_stock: cambio de stock físico con bitácora.
-- `p_ref` identifica el hecho (p. ej. 'ml:<orden>:<item>'); si ya se registró,
-- no hace nada y devuelve false (idempotencia de webhooks y reintentos).
-- Nunca baja de 0: si el delta pedido dejaría stock negativo, se aplica hasta 0
-- y se genera una alerta de sobreventa.
-- ---------------------------------------------------------------------------
create function public.mover_stock(
  p_variante uuid,
  p_delta    integer,
  p_motivo   text,
  p_ref      text,
  p_canal    text default null,
  p_pedido   uuid default null,
  p_usuario  uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock     integer;
  v_reservado integer;
  v_aplicado  integer;
  v_sku       text;
begin
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100000 then
    raise exception 'delta_invalido' using errcode = 'P0001';
  end if;
  if p_motivo is null or p_motivo not in ('venta', 'ajuste', 'devolucion', 'conciliacion', 'inicial') then
    raise exception 'motivo_invalido' using errcode = 'P0001';
  end if;
  if p_ref is null or length(p_ref) not between 1 and 200 then
    raise exception 'ref_invalida' using errcode = 'P0001';
  end if;

  select stock, stock_reservado, sku into v_stock, v_reservado, v_sku
  from public.variantes where id = p_variante for update;
  if not found then raise exception 'variante_no_existe' using errcode = 'P0001'; end if;

  if exists (select 1 from public.movimientos_stock where ref_externa = p_ref) then
    return false;
  end if;

  v_aplicado := greatest(p_delta, -v_stock);   -- no baja de 0

  insert into public.movimientos_stock (variante_id, delta, motivo, canal, pedido_id, ref_externa, usuario, detalle)
  values (p_variante, v_aplicado, p_motivo, p_canal, p_pedido, p_ref, p_usuario,
          case when v_aplicado <> p_delta then jsonb_build_object('delta_pedido', p_delta) end)
  on conflict (ref_externa) do nothing;
  if not found then return false; end if;      -- otro proceso registró el mismo hecho

  update public.variantes set stock = stock + v_aplicado where id = p_variante;

  if v_aplicado <> p_delta then
    perform privado.alerta('sobreventa', jsonb_build_object('sku', v_sku, 'ref', p_ref, 'delta_pedido', p_delta, 'aplicado', v_aplicado));
  elsif v_stock + v_aplicado < v_reservado then
    perform privado.alerta('stock_bajo_reservado', jsonb_build_object('sku', v_sku, 'ref', p_ref, 'stock', v_stock + v_aplicado, 'reservado', v_reservado));
  end if;

  perform privado.encolar_sync(p_variante);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- liberar_reservas_vencidas: para el cron. Devuelve cuántos pedidos liberó.
-- ---------------------------------------------------------------------------
create function public.liberar_reservas_vencidas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido uuid;
  v_n integer := 0;
begin
  for v_pedido in
    select distinct pedido_id from public.reservas_stock
    where estado = 'activa' and expira_en < now()
    order by pedido_id
    limit 500
  loop
    perform public.liberar_reserva(v_pedido);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: solo las Edge Functions (service_role)
-- ---------------------------------------------------------------------------
revoke execute on function public.reservar_stock(uuid, integer)                         from public, anon, authenticated;
revoke execute on function public.confirmar_venta(uuid)                                 from public, anon, authenticated;
revoke execute on function public.liberar_reserva(uuid)                                 from public, anon, authenticated;
revoke execute on function public.mover_stock(uuid, integer, text, text, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.liberar_reservas_vencidas()                           from public, anon, authenticated;
grant  execute on function public.reservar_stock(uuid, integer)                         to service_role;
grant  execute on function public.confirmar_venta(uuid)                                 to service_role;
grant  execute on function public.liberar_reserva(uuid)                                 to service_role;
grant  execute on function public.mover_stock(uuid, integer, text, text, text, uuid, uuid) to service_role;
grant  execute on function public.liberar_reservas_vencidas()                           to service_role;

revoke execute on function privado.encolar_sync(uuid)       from public, anon, authenticated, service_role;
revoke execute on function privado.alerta(text, jsonb)      from public, anon, authenticated, service_role;
revoke execute on function privado.validar_variante()       from public, anon, authenticated, service_role;
revoke execute on function privado.bitacora_inmutable()     from public, anon, authenticated, service_role;
