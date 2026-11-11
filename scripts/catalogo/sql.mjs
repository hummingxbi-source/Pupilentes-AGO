// Plan de catálogo → SQL idempotente (se puede correr varias veces sin duplicar nada).
// · Catálogo: upsert por slug/sku. Si se vuelve a importar, se actualizan nombres, precios y fotos.
// · Stock: SOLO al crear la variante, con mover_stock(motivo 'inicial', ref 'inicial:<sku>').
//   Reimportar no toca el stock; los cambios posteriores se hacen desde el panel (Fase 2).

const lit = (v) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') { if (!Number.isFinite(v)) throw new Error('número inválido'); return String(v); }
  return "'" + String(v).replace(/'/g, "''") + "'";
};
const marcaId = (s) => `(select id from public.marcas where slug = ${lit(s)})`;
const prodId = (s) => `(select id from public.productos where slug = ${lit(s)})`;
const tonoId = (s) => (s ? `(select id from public.tonos where slug = ${lit(s)})` : 'null');
const grad = (g) => (g == null ? 'null' : g.toFixed(2));

export function generarSql(plan, { titulo = 'Importación de catálogo' } = {}) {
  const L = [];
  L.push(`-- ${titulo}`, '-- Generado por scripts/importar-catalogo.mjs. No editar a mano.', 'begin;', '');

  L.push('-- Marcas');
  for (const m of plan.marcas) {
    L.push(`insert into public.marcas (slug, nombre) values (${lit(m.slug)}, ${lit(m.nombre)})`,
      `  on conflict (slug) do update set nombre = excluded.nombre;`);
  }

  L.push('', '-- Productos');
  for (const p of plan.productos) {
    L.push(`insert into public.productos (marca_id, slug, nombre, tipo, alias, descripcion, destacado, orden, activo) values (${marcaId(p.marca)}, ${lit(p.slug)}, ${lit(p.nombre)}, ${lit(p.tipo)}, ${lit(p.alias)}, ${lit(p.descripcion)}, ${lit(p.destacado)}, ${lit(p.orden)}, ${lit(p.activo)})`,
      `  on conflict (slug) do update set nombre = excluded.nombre, alias = excluded.alias, descripcion = excluded.descripcion, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;`);
  }

  L.push('', '-- Tonos');
  for (const t of plan.tonos) {
    L.push(`insert into public.tonos (producto_id, slug, color, nombre, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, orden, activo) values (${prodId(t.producto)}, ${lit(t.slug)}, ${lit(t.color)}, ${lit(t.nombre)}, ${lit(t.alias)}, ${lit(t.familia)}, ${lit(t.intensidad)}, ${lit(t.descripcion)}, ${lit(t.iris)}, ${lit(t.filtro)}, ${lit(t.destacado)}, ${lit(t.orden)}, ${lit(t.activo)})`,
      `  on conflict (slug) do update set color = excluded.color, nombre = excluded.nombre, alias = excluded.alias, familia = excluded.familia, intensidad = excluded.intensidad, descripcion = excluded.descripcion, iris_base = excluded.iris_base, filtro_css = excluded.filtro_css, destacado = excluded.destacado, orden = excluded.orden, activo = excluded.activo;`);
  }

  L.push('', '-- Variantes (el stock no se toca aquí)');
  for (const v of plan.variantes) {
    L.push(`insert into public.variantes (producto_id, tono_id, sku, duracion, graduacion, precio, activo) values (${prodId(v.producto)}, ${tonoId(v.tono)}, ${lit(v.sku)}, ${lit(v.duracion)}, ${grad(v.graduacion)}, ${v.precio.toFixed(2)}, ${lit(v.activo)})`,
      `  on conflict (sku) do update set precio = excluded.precio, activo = excluded.activo;`);
  }

  const conStock = plan.variantes.filter((v) => v.stock > 0);
  if (conStock.length) {
    L.push('', "-- Stock inicial: una sola vez por variante (ref 'inicial:<sku>'); reimportar no lo duplica");
    for (const v of conStock) {
      L.push(`select public.mover_stock((select id from public.variantes where sku = ${lit(v.sku)}), ${v.stock}, 'inicial', ${lit('inicial:' + v.sku)}, 'importacion');`);
    }
  }

  if (plan.imagenes.length) {
    L.push('', '-- Fotos');
    for (const i of plan.imagenes) {
      if (!i.url) throw new Error(`la foto "${i.origen}" no tiene URL publicada`);
      L.push(`insert into public.imagenes (producto_id, tono_id, url, alt, orden) values (${prodId(i.producto)}, ${tonoId(i.tono)}, ${lit(i.url)}, ${lit(i.alt)}, ${i.orden})`,
        `  on conflict (producto_id, tono_id, url) do update set alt = excluded.alt, orden = excluded.orden;`);
    }
  }

  L.push('', 'commit;', '');
  return L.join('\n');
}
