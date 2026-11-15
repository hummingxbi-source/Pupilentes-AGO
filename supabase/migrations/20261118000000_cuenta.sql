-- =============================================================================
-- Fase 7 · Cuenta de clienta y puntos (ARQUITECTURA §3.2, §6.3, Fase 7, §8)
--
-- · La cuenta es opcional (D5): se entra con un código al correo (Supabase Auth OTP).
--   Una cuenta = un usuario de auth.users con el correo VERIFICADO + una fila de clientas
--   con auth_user_id. Las cuentas del panel (perfiles_panel) no son cuentas de clienta.
-- · Pedidos de la cuenta: pedidos.cuenta_id. Se llena de dos formas y solo de esas:
--     'sesion' → el pedido se hizo con la sesión abierta (lo decide pedidos-crear con el token);
--     'correo' → pedido de invitada con el MISMO correo que la cuenta acaba de verificar.
--   Nunca por el ligado automático por teléfono de crear_pedido (§8): ese sigue solo para el panel.
--   De los pedidos ligados por correo la cuenta ve folio, estado, piezas y total, pero no el
--   contacto ni la dirección (los pudo escribir otra persona que usó ese correo).
-- · Puntos = bitácora (puntos_movimientos). Saldo = suma. Nunca se edita ni se borra una fila.
--   privado.conciliar_puntos deja la bitácora de un pedido igual a lo que su estado exige
--   (idempotente, se puede llamar las veces que sea):
--     canje  : −puntos_usados mientras el pedido siga vivo o pagado; 0 si se canceló, venció,
--              se reembolsó o tuvo contracargo (los puntos regresan).
--     compra : +⌊(subtotal − descuento) / pesos_por_punto⌋ cuando el pedido está pagado
--              (pagado, preparando, enviado, entregado); 0 si se reembolsa o hay contracargo.
--   Lo dispara un trigger cada vez que cambia el estado del pedido, así que cubre todos los
--   caminos (Mercado Pago, transferencia, cron, panel) sin tocar sus funciones.
-- · Canjear: crear_pedido valida el saldo con la fila de la clienta bloqueada (FOR UPDATE):
--   dos compras en paralelo no gastan los mismos puntos.
-- · Reglas de la demo (editables por la dueña): 1 punto por cada $10, cada punto vale $0.50,
--   +50 al completar el perfil. ⚠️ El bono se da cuando el perfil está completo Y la cuenta ya
--   tiene una compra pagada, para que crear correos falsos no regale descuentos.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Configuración de puntos (la dueña la edita desde el panel)
-- ---------------------------------------------------------------------------
alter table public.config_tienda
  add column puntos_activos         boolean       not null default true,
  add column puntos_pesos_por_punto numeric(10,2) not null default 10   check (puntos_pesos_por_punto between 1 and 1000),
  add column puntos_valor           numeric(10,2) not null default 0.50 check (puntos_valor between 0.01 and 10),
  add column puntos_max_pct         integer       not null default 50   check (puntos_max_pct between 0 and 90),
  add column puntos_bono_perfil     integer       not null default 50   check (puntos_bono_perfil between 0 and 1000);

grant update (puntos_activos, puntos_pesos_por_punto, puntos_valor, puntos_max_pct, puntos_bono_perfil)
  on public.config_tienda to authenticated;   -- la política duena_edita limita a la dueña con MFA

-- ---------------------------------------------------------------------------
-- Modelo
-- ---------------------------------------------------------------------------
alter table public.clientas
  add column cumpleanos date check (cumpleanos between date '1900-01-01' and date '2100-01-01'),
  add column actualizado_en timestamptz not null default now();

alter table public.pedidos
  add column cuenta_id uuid references auth.users(id) on delete set null,
  add column cuenta_ligada_por text check (cuenta_ligada_por in ('sesion', 'correo'));
create index pedidos_cuenta_idx on public.pedidos (cuenta_id) where cuenta_id is not null;
create index pedidos_correo_invitada_idx on public.pedidos (lower(contacto ->> 'correo')) where cuenta_id is null;

alter table public.puntos_movimientos drop constraint puntos_movimientos_motivo_check;
alter table public.puntos_movimientos
  add constraint puntos_movimientos_motivo_check
    check (motivo in ('compra', 'compra_revertida', 'canje', 'canje_devuelto', 'bono_perfil', 'ajuste', 'reverso'));
create index puntos_pedido_idx on public.puntos_movimientos (pedido_id) where pedido_id is not null;
create unique index puntos_un_bono_perfil on public.puntos_movimientos (clienta_id) where motivo = 'bono_perfil';

-- La bitácora no se edita ni se borra (ni siquiera con la llave secreta)
create function privado.puntos_inmutables() returns trigger
language plpgsql set search_path = '' as
$$ begin raise exception 'puntos_movimientos es una bitácora: no se edita ni se borra' using errcode = '42501'; end $$;
create trigger puntos_inmutables before update or delete on public.puntos_movimientos
  for each row execute function privado.puntos_inmutables();

-- ---------------------------------------------------------------------------
-- Cuenta: la fila de clientas de un usuario con correo verificado
-- ---------------------------------------------------------------------------
create function privado.asegurar_cuenta(p_user uuid)
returns uuid
language plpgsql security definer set search_path = '' as
$$
declare
  v_correo     text;
  v_confirmado timestamptz;
  v_cl         uuid;
begin
  select lower(email), email_confirmed_at into v_correo, v_confirmado from auth.users where id = p_user;
  if not found then raise exception 'cuenta_no_existe' using errcode = 'P0001'; end if;
  if v_confirmado is null or coalesce(v_correo, '') = '' then raise exception 'correo_sin_verificar' using errcode = 'P0001'; end if;
  if exists (select 1 from public.perfiles_panel where user_id = p_user) then
    raise exception 'cuenta_de_panel' using errcode = 'P0001';
  end if;

  select id into v_cl from public.clientas where auth_user_id = p_user;
  if v_cl is not null then return v_cl; end if;

  -- Ya compró como invitada con ese correo: se adopta su fila (el correo ya está verificado)
  update public.clientas set auth_user_id = p_user, actualizado_en = now()
   where id = (select id from public.clientas where lower(correo) = v_correo and auth_user_id is null limit 1)
  returning id into v_cl;
  if v_cl is not null then return v_cl; end if;

  insert into public.clientas (correo, auth_user_id) values (v_correo, p_user)
  on conflict do nothing returning id into v_cl;
  if v_cl is null then
    -- Otra fila usa ese correo con otra cuenta (p. ej. cambió de correo en Auth): fila sin correo
    select id into v_cl from public.clientas where auth_user_id = p_user;
    if v_cl is null then insert into public.clientas (auth_user_id) values (p_user) returning id into v_cl; end if;
  end if;
  return v_cl;
end
$$;

create function privado.saldo_puntos(p_clienta uuid) returns integer
language sql stable security definer set search_path = '' as
$$ select coalesce(sum(delta), 0)::integer from public.puntos_movimientos where clienta_id = p_clienta $$;

-- Bono por perfil completo (una vez por clienta; exige una compra pagada de la cuenta)
create function privado.otorgar_bono_perfil(p_clienta uuid)
returns boolean
language plpgsql security definer set search_path = '' as
$$
declare c public.config_tienda; v_cl public.clientas;
begin
  select * into c from public.config_tienda;
  select * into v_cl from public.clientas where id = p_clienta;
  if not c.puntos_activos or c.puntos_bono_perfil = 0 or v_cl.auth_user_id is null
     or coalesce(v_cl.nombre, '') = '' or v_cl.cumpleanos is null then
    return false;
  end if;
  if not exists (select 1 from public.pedidos where cuenta_id = v_cl.auth_user_id
                   and estado in ('pagado', 'preparando', 'enviado', 'entregado')) then
    return false;
  end if;
  insert into public.puntos_movimientos (clienta_id, delta, motivo)
  values (p_clienta, c.puntos_bono_perfil, 'bono_perfil')
  on conflict do nothing;
  return found;
end
$$;

-- ---------------------------------------------------------------------------
-- Deja la bitácora de puntos de un pedido como su estado lo exige. Idempotente.
-- ---------------------------------------------------------------------------
create function privado.conciliar_puntos(p_pedido uuid)
returns void
language plpgsql security definer set search_path = '' as
$$
declare
  c          public.config_tienda;
  v_ped      public.pedidos;
  v_cl       uuid;
  v_actual   integer;
  v_deseado  integer;
  v_pagado   boolean;
  v_muerto   boolean;
begin
  select * into v_ped from public.pedidos where id = p_pedido;
  if not found or v_ped.cuenta_id is null then return; end if;
  select id into v_cl from public.clientas where auth_user_id = v_ped.cuenta_id;
  if v_cl is null then return; end if;
  perform 1 from public.clientas where id = v_cl for update;    -- serializa con los canjes de esa clienta
  select * into c from public.config_tienda;

  v_pagado := v_ped.estado in ('pagado', 'preparando', 'enviado', 'entregado');
  v_muerto := v_ped.estado in ('cancelado', 'expirado', 'reembolsado', 'contracargo');

  -- Canje: los puntos usados se descuentan mientras el pedido siga vivo; regresan si muere
  select coalesce(sum(delta), 0) into v_actual from public.puntos_movimientos
   where pedido_id = p_pedido and motivo in ('canje', 'canje_devuelto');
  v_deseado := case when v_muerto then 0 else -v_ped.puntos_usados end;
  if v_deseado <> v_actual then
    insert into public.puntos_movimientos (clienta_id, delta, motivo, pedido_id)
    values (v_cl, v_deseado - v_actual, case when v_deseado > v_actual then 'canje_devuelto' else 'canje' end, p_pedido);
  end if;

  -- Compra: se gana al pagarse; se revierte con reembolso o contracargo
  select coalesce(sum(delta), 0) into v_actual from public.puntos_movimientos
   where pedido_id = p_pedido and motivo in ('compra', 'compra_revertida');
  if v_pagado then
    -- Si ya se ganó alguna vez, vale lo que se ganó (no se recalcula si la dueña cambia la regla)
    select delta into v_deseado from public.puntos_movimientos
     where pedido_id = p_pedido and motivo = 'compra' order by creado_en desc limit 1;
    if v_deseado is null then
      v_deseado := case when c.puntos_activos
                        then floor(greatest(v_ped.subtotal - v_ped.descuento, 0) / c.puntos_pesos_por_punto)::integer
                        else 0 end;
    end if;
  else
    v_deseado := 0;
  end if;
  if v_deseado <> v_actual then
    insert into public.puntos_movimientos (clienta_id, delta, motivo, pedido_id)
    values (v_cl, v_deseado - v_actual, case when v_deseado > v_actual then 'compra' else 'compra_revertida' end, p_pedido);
  end if;

  if v_pagado then perform privado.otorgar_bono_perfil(v_cl); end if;
end
$$;

create function privado.puntos_por_estado() returns trigger
language plpgsql security definer set search_path = '' as
$$ begin perform privado.conciliar_puntos(new.id); return null; end $$;
create trigger puntos_por_estado after update of estado on public.pedidos
  for each row when (old.estado is distinct from new.estado and new.cuenta_id is not null)
  execute function privado.puntos_por_estado();

-- ---------------------------------------------------------------------------
-- Vincular la cuenta (al entrar): crea/adopta su fila de clientas y asocia los pedidos de
-- invitada con el MISMO correo verificado. Devuelve cuántos pedidos se asociaron.
-- ---------------------------------------------------------------------------
create function public.cuenta_vincular(p_user uuid)
returns jsonb
language plpgsql security definer set search_path = '' as
$$
declare
  v_cl     uuid := privado.asegurar_cuenta(p_user);
  v_correo text := (select lower(email) from auth.users where id = p_user);
  v_id     uuid;
  v_n      integer := 0;
begin
  for v_id in
    update public.pedidos set cuenta_id = p_user, cuenta_ligada_por = 'correo', actualizado_en = now()
     where cuenta_id is null and canal = 'web' and lower(contacto ->> 'correo') = v_correo
    returning id
  loop
    perform privado.conciliar_puntos(v_id);
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('clienta', v_cl, 'vinculados', v_n);
end
$$;

-- ---------------------------------------------------------------------------
-- Perfil (nombre, cumpleaños, teléfono). Completo → bono (si ya tiene una compra pagada).
-- ---------------------------------------------------------------------------
create function public.cuenta_guardar_perfil(p_user uuid, p_datos jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as
$$
declare
  v_cl     uuid := privado.asegurar_cuenta(p_user);
  v_nombre text := trim(coalesce(p_datos ->> 'nombre', ''));
  v_tel    text := regexp_replace(coalesce(p_datos ->> 'telefono', ''), '\D', '', 'g');
  v_cumple date;
begin
  if length(v_nombre) not between 2 and 120 then raise exception 'perfil_invalido' using errcode = 'P0001', detail = 'nombre'; end if;
  if v_tel <> '' and v_tel !~ '^[0-9]{10}$' then raise exception 'perfil_invalido' using errcode = 'P0001', detail = 'telefono'; end if;
  begin
    v_cumple := nullif(p_datos ->> 'cumpleanos', '')::date;
  exception when others then
    raise exception 'perfil_invalido' using errcode = 'P0001', detail = 'cumpleanos';
  end;
  if v_cumple is not null and (v_cumple < date '1900-01-01' or v_cumple > current_date - interval '10 years') then
    raise exception 'perfil_invalido' using errcode = 'P0001', detail = 'cumpleanos';
  end if;
  update public.clientas
     set nombre = v_nombre, telefono = coalesce(nullif(v_tel, ''), telefono),
         -- El cumpleaños se fija una vez (el bono depende de él); después solo lo cambia la dueña
         cumpleanos = coalesce(cumpleanos, v_cumple), actualizado_en = now()
   where id = v_cl;
  return jsonb_build_object('bono', privado.otorgar_bono_perfil(v_cl), 'saldo', privado.saldo_puntos(v_cl));
end
$$;

-- ---------------------------------------------------------------------------
-- Resumen de la cuenta (lo que ve la clienta en /cuenta). Solo sus datos.
-- De los pedidos ligados por correo NO se devuelven contacto ni dirección (§8).
-- ---------------------------------------------------------------------------
create function public.cuenta_resumen(p_user uuid)
returns jsonb
language plpgsql security definer set search_path = '' as
$$
declare
  v_id  uuid := privado.asegurar_cuenta(p_user);
  v_cl  public.clientas;
  c     public.config_tienda;
begin
  select * into v_cl from public.clientas where id = v_id;
  select * into c from public.config_tienda;
  return jsonb_build_object(
    'perfil', jsonb_build_object('nombre', v_cl.nombre, 'correo', (select lower(email) from auth.users where id = p_user),
                                 'telefono', v_cl.telefono, 'cumpleanos', v_cl.cumpleanos),
    'saldo', privado.saldo_puntos(v_cl.id),
    'reglas', jsonb_build_object('activos', c.puntos_activos, 'pesos_por_punto', c.puntos_pesos_por_punto,
                                 'valor', c.puntos_valor, 'max_pct', c.puntos_max_pct, 'bono_perfil', c.puntos_bono_perfil,
                                 'bono_recibido', exists (select 1 from public.puntos_movimientos where clienta_id = v_cl.id and motivo = 'bono_perfil')),
    'movimientos', coalesce((
      select jsonb_agg(jsonb_build_object('delta', m.delta, 'motivo', m.motivo, 'folio', p.folio, 'fecha', m.creado_en) order by m.creado_en desc)
      from (select * from public.puntos_movimientos where clienta_id = v_cl.id order by creado_en desc limit 50) m
      left join public.pedidos p on p.id = m.pedido_id), '[]'::jsonb),
    'pedidos', coalesce((
      select jsonb_agg(x.j order by x.creado_en desc) from (
        select p.creado_en, jsonb_build_object(
          'folio', p.folio, 'token', p.token_rastreo, 'estado', p.estado, 'fecha', p.creado_en,
          'subtotal', p.subtotal, 'descuento', p.descuento, 'puntos_usados', p.puntos_usados, 'envio', p.envio, 'total', p.total,
          'ligado_por', p.cuenta_ligada_por,
          'entrega', case when p.cuenta_ligada_por = 'sesion'
                          then jsonb_strip_nulls(jsonb_build_object('tipo', p.entrega ->> 'tipo', 'zona', p.entrega ->> 'zona',
                                                                    'direccion_envio', p.entrega -> 'direccion_envio'))
                          else jsonb_build_object('tipo', p.entrega ->> 'tipo') end,
          'guia', (select jsonb_build_object('paqueteria', e.servicio, 'guia', e.guia, 'url', e.url_rastreo)
                     from public.envios e where e.pedido_id = p.id and e.guia is not null order by e.creado_en desc limit 1),
          'items', (select jsonb_agg(jsonb_build_object(
                       'sku', v.sku, 'cantidad', i.cantidad, 'precio', i.precio_unitario, 'tipo', pr.tipo,
                       'producto', pr.nombre, 'tono', t.nombre, 'clave', coalesce(t.slug, pr.slug),
                       'duracion', v.duracion, 'graduacion', v.graduacion) order by pr.nombre, t.nombre)
                    from public.pedido_items i
                    join public.variantes v on v.id = i.variante_id
                    join public.productos pr on pr.id = v.producto_id
                    left join public.tonos t on t.id = v.tono_id
                    where i.pedido_id = p.id)) as j
        from public.pedidos p where p.cuenta_id = p_user
        order by p.creado_en desc limit 50) x), '[]'::jsonb)
  );
end
$$;

-- ---------------------------------------------------------------------------
-- crear_pedido: igual que en 20261115000000_envios.sql, salvo que
--   · `cuenta_id` (lo pone pedidos-crear SOLO desde un token de sesión verificado) liga el
--     pedido a la cuenta ('sesion') y a su fila de clientas;
--   · `puntos` canjea puntos: descuento = puntos × valor, tope = max_pct del subtotal,
--     saldo validado con la fila de la clienta bloqueada (después de apartar el stock, en el
--     mismo orden de bloqueo que confirmar_pago: variantes → clientas).
-- Errores nuevos: puntos_invalidos · puntos_sin_cuenta · puntos_inactivos ·
--   puntos_excedidos (detail = máximo de puntos) · puntos_insuficientes (detail = saldo) ·
--   cuenta_de_panel · correo_sin_verificar · cuenta_no_existe
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

-- ---------------------------------------------------------------------------
-- RLS: la clienta con sesión solo ve lo suyo (defensa en profundidad; la tienda usa la
-- Edge Function `cuenta`). La política restrictiva del panel (aal2) no le aplica porque no
-- tiene rol de panel. Pedidos ligados por correo: solo vía cuenta_resumen (§8).
-- ---------------------------------------------------------------------------
create policy clienta_lee_propia on public.clientas for select to authenticated
  using (auth_user_id = (select auth.uid()));
create policy clienta_lee_propios on public.pedidos for select to authenticated
  using (cuenta_id = (select auth.uid()) and cuenta_ligada_por = 'sesion');
create policy clienta_lee_propios on public.pedido_items for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and p.cuenta_id = (select auth.uid()) and p.cuenta_ligada_por = 'sesion'));
create policy clienta_lee_propios on public.puntos_movimientos for select to authenticated
  using (clienta_id in (select id from public.clientas where auth_user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Permisos: todo por Edge Functions (service_role). Lo privado, de nadie de la API.
-- ---------------------------------------------------------------------------
revoke execute on function public.cuenta_vincular(uuid), public.cuenta_guardar_perfil(uuid, jsonb),
  public.cuenta_resumen(uuid), public.crear_pedido(jsonb) from public, anon, authenticated;
grant execute on function public.cuenta_vincular(uuid), public.cuenta_guardar_perfil(uuid, jsonb),
  public.cuenta_resumen(uuid), public.crear_pedido(jsonb) to service_role;
revoke execute on function privado.asegurar_cuenta(uuid), privado.saldo_puntos(uuid), privado.otorgar_bono_perfil(uuid),
  privado.conciliar_puntos(uuid), privado.puntos_por_estado(), privado.puntos_inmutables()
  from public, anon, authenticated, service_role;
