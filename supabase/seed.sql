-- Semilla LOCAL (supabase db reset). No se aplica a proyectos en la nube.
-- GENERADO con `npm run semilla` desde plantillas/catalogo-semilla.csv. No editar a mano.

-- Secretos de Vault para que el cron local llame a `cron-conciliar` (ver migración *_cron.sql).
-- host.docker.internal llega a tu máquina desde el contenedor de Postgres en Docker Desktop (Mac/Windows).
-- El secreto debe ser igual a CRON_SECRET de supabase/functions/.env.
select vault.create_secret('http://host.docker.internal:55321', 'url_proyecto');
select vault.create_secret('cron-local-solo-desarrollo', 'secreto_cron');

-- Catálogo semilla (Fase 1). Catálogo de TRABAJO, no el real:
--   · Urban Layer a $799 y Freshlady a $299 / accesorios: precios vistos en Mercado Libre (8 nov 2026).
--   · Freshlady anual a $590: precio visto en TikTok Shop (8 nov 2026); que sea de esa marca es un supuesto.
--   · Tonos, alias y descripciones: los de la demo. Stock: inventado para probar agotados.
--   El catálogo real se carga con scripts/importar-catalogo.mjs cuando llegue el Drive (tarea C).

-- Catálogo semilla
-- Generado por scripts/importar-catalogo.mjs. No editar a mano.
begin;

-- Marcas
insert into public.marcas (slug, nombre) values ('urban-layer', 'Urban Layer')
  on conflict (slug) do update set nombre = excluded.nombre;
insert into public.marcas (slug, nombre) values ('freshlady', 'Freshlady')
  on conflict (slug) do update set nombre = excluded.nombre;
insert into public.marcas (slug, nombre) values ('renu', 'Renu')
  on conflict (slug) do update set nombre = excluded.nombre;
insert into public.marcas (slug, nombre) values ('ago', 'AGO')
  on conflict (slug) do update set nombre = excluded.nombre;

-- Productos
insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values ((select id from public.marcas where slug = 'urban-layer'), 'urban-layer-angeles-n', 'Angeles N', 'lente', null, null, false, 0, true)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values ((select id from public.marcas where slug = 'urban-layer'), 'urban-layer-chelsea', 'Chelsea', 'lente', null, null, false, 0, true)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values ((select id from public.marcas where slug = 'urban-layer'), 'urban-layer-siri', 'Siri', 'lente', null, null, false, 0, true)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values ((select id from public.marcas where slug = 'urban-layer'), 'urban-layer-ocean', 'Ocean', 'lente', null, null, false, 0, true)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values ((select id from public.marcas where slug = 'urban-layer'), 'urban-layer-breeze', 'Breeze', 'lente', null, null, false, 0, true)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values ((select id from public.marcas where slug = 'urban-layer'), 'urban-layer-mint', 'Mint', 'lente', null, null, false, 0, true)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values ((select id from public.marcas where slug = 'urban-layer'), 'urban-layer-gemini', 'Gemini', 'lente', null, null, false, 0, true)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values ((select id from public.marcas where slug = 'urban-layer'), 'urban-layer-honey', 'Honey', 'lente', null, null, false, 0, true)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values ((select id from public.marcas where slug = 'urban-layer'), 'urban-layer-choco', 'Choco', 'lente', null, null, false, 0, true)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values ((select id from public.marcas where slug = 'urban-layer'), 'urban-layer-cloud', 'Cloud', 'lente', null, null, false, 0, true)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values ((select id from public.marcas where slug = 'urban-layer'), 'urban-layer-storm', 'Storm', 'lente', null, null, false, 0, true)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values ((select id from public.marcas where slug = 'freshlady'), 'freshlady-freshlady', 'Freshlady', 'lente', null, null, false, 0, true)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values ((select id from public.marcas where slug = 'renu'), 'renu-solucion-multiproposito-renu', 'Solución multipropósito Renu', 'accesorio', 'Limpia, enjuaga y conserva tus lentes', null, false, 1, true)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values ((select id from public.marcas where slug = 'ago'), 'ago-estuche-para-lentes', 'Estuche para lentes', 'accesorio', 'Estuche doble para guardar tu par', null, false, 2, true)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values ((select id from public.marcas where slug = 'ago'), 'ago-estuche-con-espejo-y-pinzas', 'Estuche con espejo y pinzas', 'accesorio', 'Para llevar en la bolsa', null, false, 3, true)
  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;

-- Tonos
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), 'angeles-n-blue', 'Blue', 'Angeles N Blue', 'Azul cielo con contorno', 'azul', 3, 'Azul brillante con anillo oscuro que define la mirada. Se nota aun en ojos muy oscuros.', null, 'saturate(1.15)', true, 1, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), 'chelsea-blue', 'Blue', 'Chelsea Blue', 'Azul suave y luminoso', 'azul', 2, 'Azul claro con centro cálido; ilumina sin verse artificial.', null, 'brightness(1.22) saturate(.7) hue-rotate(-12deg)', false, 2, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), 'siri-blue', 'Blue', 'Siri Blue', 'Azul hielo', 'azul', 2, 'Azul casi gris con destellos plateados. Elegante para el día.', null, 'saturate(.45) brightness(1.35)', false, 3, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), 'ocean-blue', 'Blue', 'Ocean Blue', 'Azul profundo', 'azul', 3, 'Azul marino intenso, ideal para fotos y eventos.', null, 'saturate(1.6) brightness(.68) hue-rotate(10deg)', false, 4, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), 'breeze-green', 'Green', 'Breeze Green', 'Verde oliva natural', 'verde', 1, 'Verde con centro miel. El favorito para un cambio que parece de nacimiento.', null, 'saturate(.85) sepia(.15)', true, 5, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), 'siri-green', 'Green', 'Siri Green', 'Verde jade', 'verde', 2, 'Verde limpio con reflejos dorados alrededor de la pupila.', null, 'saturate(1.2) hue-rotate(-22deg) brightness(1.05)', false, 6, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), 'angeles-n-green', 'Green', 'Angeles N Green', 'Verde con contorno', 'verde', 3, 'Verde vivo con aro definido para una mirada marcada.', null, 'saturate(1.6) brightness(.85)', false, 7, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), 'mint-green', 'Green', 'Mint Green', 'Verde menta claro', 'verde', 2, 'Verde aqua muy luminoso, para un look notorio.', 'aqua', 'brightness(1.12)', false, 8, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), 'gemini-hazel', 'Hazel', 'Gemini Hazel', 'Avellana dorado', 'cafe', 1, 'Avellana cálido con destellos verdes. Cambio sutil y muy natural.', null, 'none', true, 9, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), 'breeze-hazel', 'Hazel', 'Breeze Hazel', 'Miel claro', 'cafe', 2, 'Miel brillante que aclara ojos oscuros sin perder calidez.', 'miel', 'brightness(1.08)', false, 10, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), 'honey-brown', 'Brown', 'Honey Brown', 'Café caramelo', 'cafe', 1, 'Café caramelo, el tono más discreto del catálogo.', 'miel', 'brightness(.78) saturate(.9)', false, 11, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), 'choco', 'Chocolate', 'Choco Chocolate', 'Chocolate', 'cafe', 1, 'Chocolate profundo: unifica el color y da profundidad.', 'cafe', 'brightness(.85)', false, 12, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), 'cloud-gray', 'Gray', 'Cloud Gray', 'Gris nube', 'gris', 2, 'Gris claro con textura suave; luminoso y elegante.', null, 'brightness(1.18) contrast(.95)', true, 13, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), 'angeles-n-gray', 'Gray', 'Angeles N Gray', 'Gris con contorno', 'gris', 3, 'Gris con anillo oscuro; contraste alto que se nota de lejos.', null, 'contrast(1.2)', false, 14, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), 'angeles-n-wave-gray', 'Wave Gray', 'Angeles N Wave Gray', 'Gris ondulado', 'gris', 2, 'Gris con fibras onduladas y centro avellana; muy natural.', null, 'sepia(.25) brightness(.98)', false, 15, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), 'storm-gray', 'Gray', 'Storm Gray', 'Gris humo', 'gris', 3, 'Gris carbón para una mirada misteriosa.', null, 'brightness(.6) contrast(1.15)', false, 16, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), 'freshlady-azul', 'Azul', 'Freshlady Azul', 'Azul brillante', 'azul', 3, 'Línea económica para probar un cambio de color.', 'azul', null, false, 20, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), 'freshlady-verde', 'Verde', 'Freshlady Verde', 'Verde intenso', 'verde', 3, 'Línea económica para probar un cambio de color.', 'verde', null, false, 21, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), 'freshlady-gris', 'Gris', 'Freshlady Gris', 'Gris perla', 'gris', 2, 'Línea económica para probar un cambio de color.', 'gris', null, false, 22, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;
insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), 'freshlady-miel', 'Miel', 'Freshlady Miel', 'Miel suave', 'cafe', 1, 'Línea económica para probar un cambio de color.', 'miel', null, false, 23, true)
  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;

-- Variantes (el stock no se toca aquí)
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'UL-ANGELES-N-BLUE-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'UL-CHELSEA-BLUE-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-blue'), 'UL-SIRI-BLUE-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-ocean'), (select id from public.tonos where slug = 'ocean-blue'), 'UL-OCEAN-BLUE-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'UL-BREEZE-GREEN-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-siri'), (select id from public.tonos where slug = 'siri-green'), 'UL-SIRI-GREEN-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-green'), 'UL-ANGELES-N-GREEN-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-mint'), (select id from public.tonos where slug = 'mint-green'), 'UL-MINT-GREEN-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'UL-GEMINI-HAZEL-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-hazel'), 'UL-BREEZE-HAZEL-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-honey'), (select id from public.tonos where slug = 'honey-brown'), 'UL-HONEY-BROWN-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-choco'), (select id from public.tonos where slug = 'choco'), 'UL-CHOCO-CHOCOLATE-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'UL-CLOUD-GRAY-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'UL-ANGELES-N-GRAY-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'UL-ANGELES-N-WAVE-GRAY-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-N', 'anual', null, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M050', 'anual', -0.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M075', 'anual', -0.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M100', 'anual', -1.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M125', 'anual', -1.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M150', 'anual', -1.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M175', 'anual', -1.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M200', 'anual', -2.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M225', 'anual', -2.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M250', 'anual', -2.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M275', 'anual', -2.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M300', 'anual', -3.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M325', 'anual', -3.25, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M350', 'anual', -3.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M375', 'anual', -3.75, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M400', 'anual', -4.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M450', 'anual', -4.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M500', 'anual', -5.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M550', 'anual', -5.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M600', 'anual', -6.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M650', 'anual', -6.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M700', 'anual', -7.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M750', 'anual', -7.50, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'urban-layer-storm'), (select id from public.tonos where slug = 'storm-gray'), 'UL-STORM-GRAY-ANU-M800', 'anual', -8.00, 799.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-TRI-N', 'trimestral', null, 299.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-N', 'anual', null, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M050', 'anual', -0.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M075', 'anual', -0.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M100', 'anual', -1.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M125', 'anual', -1.25, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M150', 'anual', -1.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M175', 'anual', -1.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M200', 'anual', -2.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M225', 'anual', -2.25, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M250', 'anual', -2.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M275', 'anual', -2.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M300', 'anual', -3.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M325', 'anual', -3.25, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M350', 'anual', -3.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M375', 'anual', -3.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M400', 'anual', -4.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M450', 'anual', -4.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M500', 'anual', -5.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M550', 'anual', -5.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-azul'), 'FRES-FRESHLADY-AZUL-ANU-M600', 'anual', -6.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-TRI-N', 'trimestral', null, 299.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-N', 'anual', null, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M050', 'anual', -0.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M075', 'anual', -0.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M100', 'anual', -1.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M125', 'anual', -1.25, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M150', 'anual', -1.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M175', 'anual', -1.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M200', 'anual', -2.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M225', 'anual', -2.25, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M250', 'anual', -2.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M275', 'anual', -2.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M300', 'anual', -3.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M325', 'anual', -3.25, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M350', 'anual', -3.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M375', 'anual', -3.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M400', 'anual', -4.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M450', 'anual', -4.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M500', 'anual', -5.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M550', 'anual', -5.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-verde'), 'FRES-FRESHLADY-VERDE-ANU-M600', 'anual', -6.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-TRI-N', 'trimestral', null, 299.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-N', 'anual', null, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M050', 'anual', -0.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M075', 'anual', -0.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M100', 'anual', -1.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M125', 'anual', -1.25, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M150', 'anual', -1.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M175', 'anual', -1.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M200', 'anual', -2.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M225', 'anual', -2.25, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M250', 'anual', -2.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M275', 'anual', -2.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M300', 'anual', -3.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M325', 'anual', -3.25, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M350', 'anual', -3.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M375', 'anual', -3.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M400', 'anual', -4.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M450', 'anual', -4.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M500', 'anual', -5.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M550', 'anual', -5.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-gris'), 'FRES-FRESHLADY-GRIS-ANU-M600', 'anual', -6.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-TRI-N', 'trimestral', null, 299.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-N', 'anual', null, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M050', 'anual', -0.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M075', 'anual', -0.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M100', 'anual', -1.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M125', 'anual', -1.25, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M150', 'anual', -1.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M175', 'anual', -1.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M200', 'anual', -2.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M225', 'anual', -2.25, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M250', 'anual', -2.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M275', 'anual', -2.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M300', 'anual', -3.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M325', 'anual', -3.25, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M350', 'anual', -3.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M375', 'anual', -3.75, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M400', 'anual', -4.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M450', 'anual', -4.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M500', 'anual', -5.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M550', 'anual', -5.50, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'freshlady-freshlady'), (select id from public.tonos where slug = 'freshlady-miel'), 'FRES-FRESHLADY-MIEL-ANU-M600', 'anual', -6.00, 590.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'renu-solucion-multiproposito-renu'), null, 'RENU-SOLUCION-MULTIPROPOSITO-RENU', null, null, 129.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'ago-estuche-para-lentes'), null, 'AGO-ESTUCHE-PARA-LENTES', null, null, 139.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;
insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values ((select id from public.productos where slug = 'ago-estuche-con-espejo-y-pinzas'), null, 'AGO-ESTUCHE-CON-ESPEJO-Y-PINZAS', null, null, 179.00, true)
  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;

-- Stock inicial: una sola vez por variante (ref 'inicial:<sku>'); reimportar no lo duplica
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-N'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M050'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M075'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M100'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M125'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M150'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M175'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M200'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M225'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M250'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M275'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M300'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M325'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M350'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M375'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M400'), 6, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M450'), 3, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M500'), 3, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M550'), 3, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M600'), 3, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M650'), 3, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M650', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M700'), 3, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M700', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M750'), 3, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M750', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-BLUE-ANU-M800'), 3, 'inicial', 'inicial:UL-ANGELES-N-BLUE-ANU-M800', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-N'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M050'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M075'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M100'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M125'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M150'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M175'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M200'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M225'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M250'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M275'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M300'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M325'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M350'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M375'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M400'), 5, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M450'), 2, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M500'), 2, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M550'), 2, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M600'), 2, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M650'), 2, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M650', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M700'), 2, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M700', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M750'), 2, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M750', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHELSEA-BLUE-ANU-M800'), 2, 'inicial', 'inicial:UL-CHELSEA-BLUE-ANU-M800', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-N'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M050'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M075'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M100'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M125'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M150'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M175'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M200'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M225'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M250'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M275'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M300'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M325'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M350'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M375'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M400'), 4, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M450'), 2, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M500'), 2, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M550'), 2, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M600'), 2, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M650'), 2, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M650', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M700'), 2, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M700', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M750'), 2, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M750', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-BLUE-ANU-M800'), 2, 'inicial', 'inicial:UL-SIRI-BLUE-ANU-M800', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-N'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-M050'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-M075'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-M100'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-M125'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-M150'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-M175'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-M200'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-M225'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-M250'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-M275'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-M300'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-M325'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-M350'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-M375'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-OCEAN-BLUE-ANU-M400'), 3, 'inicial', 'inicial:UL-OCEAN-BLUE-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-N'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M050'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M075'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M100'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M125'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M150'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M175'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M200'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M225'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M250'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M275'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M300'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M325'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M350'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M375'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M400'), 6, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M450'), 3, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M500'), 3, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M550'), 3, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M600'), 3, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M650'), 3, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M650', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M700'), 3, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M700', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M750'), 3, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M750', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-GREEN-ANU-M800'), 3, 'inicial', 'inicial:UL-BREEZE-GREEN-ANU-M800', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-N'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M050'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M075'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M100'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M125'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M150'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M175'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M200'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M225'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M250'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M275'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M300'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M325'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M350'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M375'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M400'), 4, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M450'), 1, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M500'), 1, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M550'), 1, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M600'), 1, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M650'), 1, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M650', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M700'), 1, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M700', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M750'), 1, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M750', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-SIRI-GREEN-ANU-M800'), 1, 'inicial', 'inicial:UL-SIRI-GREEN-ANU-M800', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-N'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M050'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M075'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M100'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M125'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M150'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M175'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M200'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M225'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M250'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M275'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M300'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M325'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M350'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M375'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M400'), 4, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M450'), 2, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M500'), 2, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M550'), 2, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M600'), 2, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M650'), 2, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M650', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M700'), 2, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M700', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M750'), 2, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M750', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GREEN-ANU-M800'), 2, 'inicial', 'inicial:UL-ANGELES-N-GREEN-ANU-M800', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-N'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-M050'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-M075'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-M100'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-M125'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-M150'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-M175'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-M200'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-M225'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-M250'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-M275'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-M300'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-M325'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-M350'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-M375'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-MINT-GREEN-ANU-M400'), 3, 'inicial', 'inicial:UL-MINT-GREEN-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-N'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M050'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M075'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M100'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M125'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M150'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M175'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M200'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M225'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M250'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M275'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M300'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M325'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M350'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M375'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M400'), 6, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M450'), 3, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M500'), 3, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M550'), 3, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M600'), 3, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M650'), 3, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M650', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M700'), 3, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M700', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M750'), 3, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M750', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-GEMINI-HAZEL-ANU-M800'), 3, 'inicial', 'inicial:UL-GEMINI-HAZEL-ANU-M800', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-N'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M050'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M075'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M100'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M125'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M150'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M175'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M200'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M225'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M250'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M275'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M300'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M325'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M350'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M375'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M400'), 4, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M450'), 2, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M500'), 2, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M550'), 2, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M600'), 2, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M650'), 2, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M650', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M700'), 2, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M700', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M750'), 2, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M750', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-BREEZE-HAZEL-ANU-M800'), 2, 'inicial', 'inicial:UL-BREEZE-HAZEL-ANU-M800', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-N'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M050'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M075'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M100'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M125'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M150'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M175'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M200'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M225'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M250'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M275'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M300'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M325'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M350'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M375'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M400'), 4, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M450'), 1, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M500'), 1, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M550'), 1, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M600'), 1, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M650'), 1, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M650', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M700'), 1, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M700', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M750'), 1, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M750', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-HONEY-BROWN-ANU-M800'), 1, 'inicial', 'inicial:UL-HONEY-BROWN-ANU-M800', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-N'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M050'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M075'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M100'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M125'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M150'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M175'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M200'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M225'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M250'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M275'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M300'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M325'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M350'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M375'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M400'), 5, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M450'), 2, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M500'), 2, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M550'), 2, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M600'), 2, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M650'), 2, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M650', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M700'), 2, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M700', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M750'), 2, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M750', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CHOCO-CHOCOLATE-ANU-M800'), 2, 'inicial', 'inicial:UL-CHOCO-CHOCOLATE-ANU-M800', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-N'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M050'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M075'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M100'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M125'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M150'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M175'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M200'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M225'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M250'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M275'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M300'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M325'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M350'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M375'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M400'), 6, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M450'), 3, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M500'), 3, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M550'), 3, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M600'), 3, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M650'), 3, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M650', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M700'), 3, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M700', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M750'), 3, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M750', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-CLOUD-GRAY-ANU-M800'), 3, 'inicial', 'inicial:UL-CLOUD-GRAY-ANU-M800', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-N'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M050'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M075'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M100'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M125'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M150'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M175'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M200'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M225'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M250'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M275'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M300'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M325'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M350'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M375'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M400'), 5, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M450'), 2, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M500'), 2, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M550'), 2, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M600'), 2, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M650'), 2, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M650', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M700'), 2, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M700', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M750'), 2, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M750', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-GRAY-ANU-M800'), 2, 'inicial', 'inicial:UL-ANGELES-N-GRAY-ANU-M800', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-N'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M050'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M075'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M100'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M125'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M150'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M175'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M200'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M225'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M250'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M275'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M300'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M325'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M350'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M375'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M400'), 4, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M450'), 2, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M500'), 2, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M550'), 2, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M600'), 2, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M650'), 2, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M650', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M700'), 2, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M700', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M750'), 2, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M750', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-ANGELES-N-WAVE-GRAY-ANU-M800'), 2, 'inicial', 'inicial:UL-ANGELES-N-WAVE-GRAY-ANU-M800', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-N'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-M050'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-M075'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-M100'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-M125'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-M150'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-M175'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-M200'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-M225'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-M250'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-M275'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-M300'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-M325'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-M350'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-M375'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'UL-STORM-GRAY-ANU-M400'), 2, 'inicial', 'inicial:UL-STORM-GRAY-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-TRI-N'), 8, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-TRI-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-N'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M050'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M075'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M100'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M125'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M150'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M175'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M200'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M225'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M250'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M275'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M300'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M325'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M350'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M375'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M400'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M450'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M500'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M550'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-AZUL-ANU-M600'), 2, 'inicial', 'inicial:FRES-FRESHLADY-AZUL-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-TRI-N'), 8, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-TRI-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-N'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M050'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M075'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M100'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M125'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M150'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M175'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M200'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M225'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M250'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M275'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M300'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M325'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M350'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M375'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M400'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M450'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M500'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M550'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-VERDE-ANU-M600'), 2, 'inicial', 'inicial:FRES-FRESHLADY-VERDE-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-TRI-N'), 8, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-TRI-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-N'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M050'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M075'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M100'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M125'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M150'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M175'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M200'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M225'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M250'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M275'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M300'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M325'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M350'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M375'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M400'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M450'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M500'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M550'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-GRIS-ANU-M600'), 2, 'inicial', 'inicial:FRES-FRESHLADY-GRIS-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-TRI-N'), 8, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-TRI-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-N'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-N', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M050'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M050', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M075'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M075', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M100'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M100', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M125'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M125', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M150'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M150', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M175'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M175', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M200'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M200', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M225'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M225', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M250'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M250', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M275'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M275', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M300'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M300', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M325'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M325', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M350'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M350', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M375'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M375', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M400'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M400', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M450'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M450', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M500'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M500', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M550'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M550', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'FRES-FRESHLADY-MIEL-ANU-M600'), 2, 'inicial', 'inicial:FRES-FRESHLADY-MIEL-ANU-M600', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'RENU-SOLUCION-MULTIPROPOSITO-RENU'), 20, 'inicial', 'inicial:RENU-SOLUCION-MULTIPROPOSITO-RENU', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'AGO-ESTUCHE-PARA-LENTES'), 15, 'inicial', 'inicial:AGO-ESTUCHE-PARA-LENTES', 'importacion');
select public.mover_stock((select id from public.variantes where sku = 'AGO-ESTUCHE-CON-ESPEJO-Y-PINZAS'), 10, 'inicial', 'inicial:AGO-ESTUCHE-CON-ESPEJO-Y-PINZAS', 'importacion');

-- Fotos
insert into public.imagenes (producto_id, tono_id, url, alt, orden) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-blue'), 'img/fotos/clientes/angeles-n-blue.webp', 'Angeles N Blue', 0)
  on conflict (producto_id, tono_id, url) do update set alt = excluded.alt, orden = excluded.orden;
insert into public.imagenes (producto_id, tono_id, url, alt, orden) values ((select id from public.productos where slug = 'urban-layer-chelsea'), (select id from public.tonos where slug = 'chelsea-blue'), 'img/fotos/clientes/chelsea-blue.webp', 'Chelsea Blue', 0)
  on conflict (producto_id, tono_id, url) do update set alt = excluded.alt, orden = excluded.orden;
insert into public.imagenes (producto_id, tono_id, url, alt, orden) values ((select id from public.productos where slug = 'urban-layer-breeze'), (select id from public.tonos where slug = 'breeze-green'), 'img/fotos/clientes/02-verde-breeze-green.jpg', 'Breeze Green', 0)
  on conflict (producto_id, tono_id, url) do update set alt = excluded.alt, orden = excluded.orden;
insert into public.imagenes (producto_id, tono_id, url, alt, orden) values ((select id from public.productos where slug = 'urban-layer-gemini'), (select id from public.tonos where slug = 'gemini-hazel'), 'img/fotos/clientes/03-cafe-gemini-hazel.jpg', 'Gemini Hazel', 0)
  on conflict (producto_id, tono_id, url) do update set alt = excluded.alt, orden = excluded.orden;
insert into public.imagenes (producto_id, tono_id, url, alt, orden) values ((select id from public.productos where slug = 'urban-layer-cloud'), (select id from public.tonos where slug = 'cloud-gray'), 'img/fotos/clientes/04-gris-cloud-gray.jpg', 'Cloud Gray', 0)
  on conflict (producto_id, tono_id, url) do update set alt = excluded.alt, orden = excluded.orden;
insert into public.imagenes (producto_id, tono_id, url, alt, orden) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-gray'), 'img/fotos/clientes/angeles-n-gray.webp', 'Angeles N Gray', 0)
  on conflict (producto_id, tono_id, url) do update set alt = excluded.alt, orden = excluded.orden;
insert into public.imagenes (producto_id, tono_id, url, alt, orden) values ((select id from public.productos where slug = 'urban-layer-angeles-n'), (select id from public.tonos where slug = 'angeles-n-wave-gray'), 'img/fotos/clientes/angeles-n-wave-gray.webp', 'Angeles N Wave Gray', 0)
  on conflict (producto_id, tono_id, url) do update set alt = excluded.alt, orden = excluded.orden;

commit;
