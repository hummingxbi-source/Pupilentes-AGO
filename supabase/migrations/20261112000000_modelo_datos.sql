-- =============================================================================
-- Fase 1 · Modelo de datos (ARQUITECTURA §3.2)
--
-- Convenciones: dinero numeric(10,2); fechas timestamptz; llaves uuid.
-- Valores cerrados con CHECK (no enums): se cambian con una migración simple.
--
-- Permisos:
--   · RLS activo en TODAS las tablas de public (prueba pgTAP 01_modelo).
--   · anon y authenticated no tienen ningún permiso directo sobre las tablas:
--     el público solo lee la vista `catalogo_publico`; el panel (Fase 2) y las
--     clientas (Fase 7) reciben permisos y políticas en sus propias migraciones.
--   · `stock` y `stock_reservado` solo cambian con las funciones de
--     20261112000100_stock.sql.
--
-- Cambio respecto a §3.2: se agrega `tonos` (color/diseño de una línea). Familia,
-- alias, intensidad, descripción y fotos son del color, no de cada graduación;
-- sin esta tabla se repetirían en ~24 variantes por color.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------
create table public.marcas (
  id        uuid primary key default gen_random_uuid(),
  slug      text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre    text not null check (length(nombre) between 1 and 80),
  activo    boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.productos (
  id          uuid primary key default gen_random_uuid(),
  marca_id    uuid not null references public.marcas(id),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre      text not null check (length(nombre) between 1 and 120),   -- línea/modelo: "Angeles N"
  tipo        text not null check (tipo in ('lente', 'accesorio')),
  alias       text check (length(alias) <= 120),                        -- subtítulo (accesorios)
  descripcion text check (length(descripcion) <= 2000),
  destacado   boolean not null default false,
  orden       integer not null default 0,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);
create index productos_marca_idx on public.productos (marca_id);

create table public.tonos (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),   -- "angeles-n-blue"
  color       text not null check (length(color) between 1 and 60),             -- "Blue", "Halloween Gato"
  nombre      text not null check (length(nombre) between 1 and 140),           -- "Angeles N Blue"
  alias       text check (length(alias) <= 120),                                -- "Azul cielo con contorno"
  familia     text not null check (familia in ('azul', 'verde', 'cafe', 'gris', 'otro')),
  intensidad  smallint check (intensidad between 1 and 3),                      -- 1 natural · 2 notorio · 3 intenso
  descripcion text check (length(descripcion) <= 2000),
  iris_base   text check (iris_base in ('aqua', 'avellana', 'azul', 'cafe', 'gris', 'miel', 'verde', 'violeta')),
  filtro_css  text check (filtro_css ~ '^[a-z0-9 ().,%-]{0,200}$'),             -- solo para la ilustración del iris
  destacado   boolean not null default false,
  orden       integer not null default 0,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now(),
  unique (producto_id, color)
);
create index tonos_producto_idx on public.tonos (producto_id);

create table public.variantes (
  id              uuid primary key default gen_random_uuid(),
  producto_id     uuid not null references public.productos(id),
  tono_id         uuid references public.tonos(id),                 -- null en accesorios
  sku             text not null unique check (sku ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$' and length(sku) <= 64),
  duracion        text check (duracion in ('trimestral', 'semestral', 'anual')),
  graduacion      numeric(4,2) check (graduacion between -20 and 0 and graduacion <> 0 and mod(graduacion * 100, 25) = 0),  -- null = sin graduación
  precio          numeric(10,2) not null check (precio > 0),
  stock           integer not null default 0 check (stock >= 0),            -- pares físicos
  stock_reservado integer not null default 0 check (stock_reservado >= 0),
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  unique nulls not distinct (producto_id, tono_id, duracion, graduacion)
);
create index variantes_tono_idx on public.variantes (tono_id);
-- Un lente siempre tiene tono (del mismo producto); un accesorio nunca tiene tono,
-- duración ni graduación. Trigger y no CHECK porque necesita leer otras tablas.
create function privado.validar_variante() returns trigger
language plpgsql security definer set search_path = '' as
$$
declare v_tipo text;
begin
  select tipo into v_tipo from public.productos where id = new.producto_id;
  if v_tipo = 'lente' then
    if new.tono_id is null or not exists (select 1 from public.tonos where id = new.tono_id and producto_id = new.producto_id) then
      raise exception 'variante de lente sin tono válido (sku %)', new.sku using errcode = '23514';
    end if;
  elsif v_tipo = 'accesorio' then
    if new.tono_id is not null or new.duracion is not null or new.graduacion is not null then
      raise exception 'un accesorio no lleva tono, duración ni graduación (sku %)', new.sku using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;
create trigger variantes_coherentes before insert or update of producto_id, tono_id, duracion, graduacion
  on public.variantes for each row execute function privado.validar_variante();

create table public.imagenes (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id),
  tono_id     uuid references public.tonos(id),          -- null = foto general del producto
  graduacion  numeric(4,2),                               -- opcional: foto de esa graduación
  url         text not null check (url ~ '^(https://|img/)' and length(url) <= 500),
  alt         text check (length(alt) <= 200),
  orden       integer not null default 0,
  creado_en   timestamptz not null default now(),
  unique nulls not distinct (producto_id, tono_id, url)   -- accesorios (tono null) tampoco se duplican
);
create index imagenes_tono_idx on public.imagenes (tono_id);

create table public.publicaciones_canal (
  id                  uuid primary key default gen_random_uuid(),
  variante_id         uuid not null references public.variantes(id),
  canal               text not null check (canal in ('ml', 'tiktok')),
  id_externo_item     text not null check (length(id_externo_item) <= 80),
  id_externo_variante text check (length(id_externo_variante) <= 80),
  activo              boolean not null default true,
  ultimo_sync         timestamptz,
  creado_en           timestamptz not null default now(),
  unique nulls not distinct (canal, id_externo_item, id_externo_variante)
);
create index publicaciones_variante_idx on public.publicaciones_canal (variante_id);

-- ---------------------------------------------------------------------------
-- Personas
-- ---------------------------------------------------------------------------
create table public.clientas (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,   -- null hasta que crea cuenta (Fase 7)
  nombre       text check (length(nombre) <= 120),
  telefono     text check (telefono ~ '^[0-9]{10}$'),
  correo       text check (length(correo) <= 254 and correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  creado_en    timestamptz not null default now()
);
create unique index clientas_correo_idx on public.clientas (lower(correo)) where correo is not null;

create table public.perfiles_panel (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  rol       text not null check (rol in ('duena', 'ayudante')),
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Pedidos y pagos
-- ---------------------------------------------------------------------------
create sequence public.pedidos_folio_seq start 1001;
revoke all on sequence public.pedidos_folio_seq from public, anon, authenticated;

create table public.pedidos (
  id                 uuid primary key default gen_random_uuid(),
  folio              text not null unique default ('AGO-' || nextval('public.pedidos_folio_seq')),
  token_rastreo      text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  clave_idempotencia text unique check (length(clave_idempotencia) between 16 and 100),
  canal              text not null default 'web' check (canal in ('web', 'ml', 'tiktok', 'whatsapp')),
  id_externo         text check (length(id_externo) <= 80),
  estado             text not null default 'pendiente_pago' check (estado in (
                       'pendiente_pago', 'pendiente_validacion', 'pagado', 'preparando', 'enviado', 'entregado',
                       'cancelado', 'expirado', 'pagado_sin_stock', 'reembolsado', 'contracargo')),
  pago_estado        text not null default 'pendiente' check (pago_estado in ('pendiente', 'aprobado', 'rechazado', 'reembolsado', 'contracargo')),
  clienta_id         uuid references public.clientas(id),                 -- null = compra como invitada
  contacto           jsonb not null default '{}'::jsonb,                  -- nombre, teléfono, correo
  subtotal           numeric(10,2) not null default 0 check (subtotal >= 0),
  descuento          numeric(10,2) not null default 0 check (descuento >= 0),
  puntos_usados      integer not null default 0 check (puntos_usados >= 0),
  envio              numeric(10,2) not null default 0 check (envio >= 0),
  total              numeric(10,2) not null default 0 check (total >= 0),
  entrega            jsonb not null default '{}'::jsonb,
  expira_reserva_en  timestamptz,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  unique (canal, id_externo)                 -- web sin id externo: los null no chocan
);
create index pedidos_clienta_idx on public.pedidos (clienta_id);
create index pedidos_estado_idx on public.pedidos (estado);

create table public.pedido_items (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references public.pedidos(id) on delete cascade,
  variante_id     uuid not null references public.variantes(id),
  cantidad        integer not null check (cantidad between 1 and 50),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),    -- congelado al crear el pedido
  unique (pedido_id, variante_id)
);
create index pedido_items_variante_idx on public.pedido_items (variante_id);

create table public.pagos (
  id                uuid primary key default gen_random_uuid(),
  pedido_id         uuid not null references public.pedidos(id),
  proveedor         text not null check (proveedor in ('mercadopago', 'transferencia')),
  id_externo        text check (length(id_externo) <= 80),
  estado            text not null check (length(estado) <= 40),
  estado_detalle    text check (length(estado_detalle) <= 200),
  monto             numeric(10,2) not null check (monto >= 0),
  moneda            text not null default 'MXN' check (moneda ~ '^[A-Z]{3}$'),
  comprobante_clave text check (length(comprobante_clave) <= 300),       -- nombre en R2 privado, no URL
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  unique (proveedor, id_externo)
);
create index pagos_pedido_idx on public.pagos (pedido_id);

create table public.envios (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references public.pedidos(id),
  proveedor      text not null check (proveedor in ('envia', 'metro', 'didi')),
  servicio       text check (length(servicio) <= 80),
  guia           text check (length(guia) <= 80),
  url_rastreo    text check (url_rastreo ~ '^https://'),
  estado         text not null default 'pendiente' check (length(estado) <= 40),
  costo          numeric(10,2) check (costo >= 0),
  etiqueta_clave text check (length(etiqueta_clave) <= 300),
  creado_en      timestamptz not null default now()
);
create index envios_pedido_idx on public.envios (pedido_id);

create table public.puntos_movimientos (
  id         uuid primary key default gen_random_uuid(),
  clienta_id uuid not null references public.clientas(id),
  delta      integer not null check (delta <> 0),
  motivo     text not null check (motivo in ('compra', 'canje', 'ajuste', 'reverso')),
  pedido_id  uuid references public.pedidos(id),
  creado_en  timestamptz not null default now()
);
create index puntos_clienta_idx on public.puntos_movimientos (clienta_id);

-- ---------------------------------------------------------------------------
-- Stock: bitácora y reservas
-- ---------------------------------------------------------------------------
create table public.movimientos_stock (
  id          uuid primary key default gen_random_uuid(),
  variante_id uuid not null references public.variantes(id),
  delta       integer not null,
  motivo      text not null check (motivo in ('venta', 'ajuste', 'devolucion', 'reserva', 'liberacion', 'conciliacion', 'inicial')),
  canal       text check (canal in ('web', 'ml', 'tiktok', 'panel', 'importacion')),
  pedido_id   uuid references public.pedidos(id),
  ref_externa text not null unique check (length(ref_externa) between 1 and 200),
  usuario     uuid,
  detalle     jsonb,
  creado_en   timestamptz not null default now()
);
create index movimientos_variante_idx on public.movimientos_stock (variante_id, creado_en desc);

-- La bitácora nunca se edita ni se borra (ni siquiera con la llave de servicio).
create function privado.bitacora_inmutable() returns trigger
language plpgsql set search_path = '' as
$$ begin raise exception 'movimientos_stock es una bitácora: no se edita ni se borra' using errcode = '42501'; end $$;
create trigger movimientos_inmutables before update or delete on public.movimientos_stock
  for each row execute function privado.bitacora_inmutable();

create table public.reservas_stock (
  pedido_id   uuid not null references public.pedidos(id),
  variante_id uuid not null references public.variantes(id),
  cantidad    integer not null check (cantidad > 0),
  expira_en   timestamptz not null,
  estado      text not null default 'activa' check (estado in ('activa', 'confirmada', 'liberada')),
  creado_en   timestamptz not null default now(),
  primary key (pedido_id, variante_id)
);
create index reservas_expira_idx on public.reservas_stock (expira_en) where estado = 'activa';

create table public.auditoria_panel (
  id        uuid primary key default gen_random_uuid(),
  usuario   uuid,
  accion    text not null check (length(accion) <= 60),
  tabla     text not null check (length(tabla) <= 60),
  registro  text check (length(registro) <= 100),
  antes     jsonb,
  despues   jsonb,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Esquema privado (no expuesto por la API)
-- ---------------------------------------------------------------------------
create table privado.eventos_webhook (
  proveedor    text not null check (proveedor in ('mercadopago', 'ml', 'tiktok', 'envia')),
  id_evento    text not null check (length(id_evento) <= 200),
  payload      jsonb,                                   -- se borra a los 90 días
  recibido_en  timestamptz not null default now(),
  procesado_en timestamptz,
  intentos     integer not null default 0,
  error        text,
  primary key (proveedor, id_evento)
);

create table privado.cola_sync (
  variante_id     uuid not null references public.variantes(id),
  canal           text not null check (canal in ('ml', 'tiktok')),
  intentos        integer not null default 0,
  proximo_intento timestamptz not null default now(),
  error           text,
  primary key (variante_id, canal)
);

create table privado.integraciones (
  canal          text primary key check (canal in ('ml', 'tiktok', 'mercadopago', 'envia')),
  cuenta_externa text,
  expira_en      timestamptz,
  secreto_vault  uuid                                    -- id del secreto en Vault (tokens OAuth), nunca el token
);

create table privado.alertas (
  id        uuid primary key default gen_random_uuid(),
  tipo      text not null check (length(tipo) <= 60),
  detalle   jsonb,
  creado_en timestamptz not null default now(),
  atendida  boolean not null default false
);

alter table privado.eventos_webhook enable row level security;
alter table privado.cola_sync       enable row level security;
alter table privado.integraciones   enable row level security;
alter table privado.alertas         enable row level security;

-- ---------------------------------------------------------------------------
-- RLS y permisos de tablas
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'marcas', 'productos', 'tonos', 'variantes', 'imagenes', 'publicaciones_canal',
    'clientas', 'perfiles_panel', 'pedidos', 'pedido_items', 'pagos', 'envios',
    'puntos_movimientos', 'movimientos_stock', 'reservas_stock', 'auditoria_panel'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    -- Supabase concede por defecto todo a anon/authenticated en public; aquí se quita.
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Tablas futuras en public: tampoco se abren solas.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Vista pública del catálogo (ARQUITECTURA §3.2 y §3.4)
-- ---------------------------------------------------------------------------
-- Es la ÚNICA lectura del público. Corre con los permisos de su dueño (como
-- security definer) a propósito: anon no tiene acceso a las tablas, y la vista
-- solo expone columnas públicas de filas activas. `disponible` se topa en 10
-- para no revelar el inventario exacto; la tienda solo necesita saber si hay
-- y si quedan pocas. Una fila por tono (lentes) o por producto (accesorios).
create view public.catalogo_publico as
with var as (
  select v.producto_id, v.tono_id,
         jsonb_agg(jsonb_build_object(
           'sku', v.sku,
           'duracion', v.duracion,
           'graduacion', v.graduacion,
           'precio', v.precio,
           'disponible', least(greatest(v.stock - v.stock_reservado, 0), 10)
         ) order by v.duracion nulls first, v.graduacion desc nulls first) as variantes,
         min(v.precio) as precio_desde
  from public.variantes v
  where v.activo
  group by v.producto_id, v.tono_id
),
img as (
  select i.producto_id, i.tono_id,
         jsonb_agg(jsonb_build_object('url', i.url, 'alt', i.alt, 'graduacion', i.graduacion) order by i.orden, i.url) as imagenes
  from public.imagenes i
  group by i.producto_id, i.tono_id
)
select
  coalesce(t.slug, p.slug)            as clave,
  p.tipo,
  m.nombre                            as marca,
  p.nombre                            as producto,
  p.slug                              as producto_slug,
  t.slug                              as tono_slug,
  coalesce(t.nombre, p.nombre)        as nombre,
  coalesce(t.alias, p.alias)          as alias,
  t.familia,
  t.intensidad,
  coalesce(t.descripcion, p.descripcion) as descripcion,
  t.iris_base,
  t.filtro_css,
  coalesce(t.destacado, p.destacado)  as destacado,
  coalesce(t.orden, p.orden)          as orden,
  coalesce(img.imagenes, '[]'::jsonb) as imagenes,
  var.variantes,
  var.precio_desde
from public.productos p
join public.marcas m on m.id = p.marca_id and m.activo
left join public.tonos t on t.producto_id = p.id and t.activo
join var on var.producto_id = p.id and var.tono_id is not distinct from t.id
left join img on img.producto_id = p.id and img.tono_id is not distinct from t.id
where p.activo
  and ((p.tipo = 'lente' and t.id is not null) or (p.tipo = 'accesorio' and t.id is null));

revoke all on public.catalogo_publico from anon, authenticated;
grant select on public.catalogo_publico to anon, authenticated;
