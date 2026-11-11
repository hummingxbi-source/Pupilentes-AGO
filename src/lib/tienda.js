// Catálogo de la tienda desde la BD (Fase 1). Lee SOLO la vista `catalogo_publico`.
// Caché en el navegador: se muestra lo guardado al instante y se refresca en segundo plano
// (ARQUITECTURA §3.4). El disponible se vuelve a comprobar en el servidor al crear el pedido,
// así que la caché nunca causa sobreventa.
//
// Cada fila se convierte a la forma que ya usan los componentes de la demo
// (id, nombre, alias, familia, intensidad, filtro, foto, precio, stock por graduación…)
// para cambiar la fuente de datos sin reescribir las pantallas (FRONTEND.md §2).

import { create } from 'zustand';
import { supabase, supabaseConfigurado } from './supabase';

const CLAVE_CACHE = 'ago-catalogo-v1';
const VIGENCIA_MS = 5 * 60 * 1000;   // pasado esto, se refresca al abrir; siempre se muestra lo guardado mientras

export const NEUTRO = '0.00';
/** Graduación de la BD (número o null) → texto que usan los selectores ("0.00" = sin graduación). */
export const textoGrad = (g) => (g == null ? NEUTRO : Number(g).toFixed(2));
const ORDEN_DUR = { trimestral: 1, semestral: 2, anual: 3 };
export const NOMBRE_DUR = { trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' };

/** Una fila de catalogo_publico → producto con la forma de los componentes. Pura (se prueba en tests/unit). */
export function mapearFila(f) {
  const variantes = (f.variantes || []).map((v) => ({
    sku: v.sku, duracion: v.duracion ?? null, graduacion: textoGrad(v.graduacion),
    precio: Number(v.precio), disponible: Math.max(0, Number(v.disponible) || 0),
  }));
  const duraciones = [...new Set(variantes.map((v) => v.duracion))].sort((a, b) => (ORDEN_DUR[a] || 0) - (ORDEN_DUR[b] || 0));
  // stock por graduación = mejor disponible entre duraciones (para filtros y tarjetas)
  const stock = {};
  for (const v of variantes) stock[v.graduacion] = Math.max(stock[v.graduacion] ?? 0, v.disponible);
  const precios = (pred) => variantes.filter(pred).map((v) => v.precio);
  const min = (a) => (a.length ? Math.min(...a) : null);
  const fotos = (f.imagenes || []).map((i) => i.url).filter(Boolean);
  return {
    id: f.clave,
    tipo: f.tipo,
    marca: f.marca,
    linea: f.producto,
    nombre: f.nombre,
    alias: f.alias || '',
    familia: f.familia,
    intensidad: f.intensidad || 1,
    desc: f.descripcion || '',
    iris: f.iris_base || undefined,
    filtro: f.filtro_css || 'none',
    foto: fotos[0],
    fotos,
    top: !!f.destacado,
    orden: f.orden ?? 0,
    visible: true,
    variantes,
    duraciones,
    duracion: duraciones.length === 1 && duraciones[0] ? NOMBRE_DUR[duraciones[0]] : duraciones.filter(Boolean).map((d) => NOMBRE_DUR[d]).join(' · '),
    precio: min(precios((v) => v.graduacion === NEUTRO)) ?? min(precios(() => true)) ?? 0,
    precioGraduado: min(precios((v) => v.graduacion !== NEUTRO)) ?? min(precios(() => true)) ?? 0,
    stock,
  };
}

/** Variante exacta de un producto por duración y graduación. */
export const varianteDe = (p, duracion, graduacion) =>
  p?.variantes?.find((v) => v.duracion === (duracion ?? null) && v.graduacion === graduacion) || null;

/** srcset para fotos subidas por el importador (…-960.webp); las demás se usan tal cual. */
export function srcsetDe(url, A) {
  if (!url || !/-960\.webp$/.test(url)) return undefined;
  return [480, 960, 1600].map((w) => `${A(url.replace(/-960\.webp$/, `-${w}.webp`))} ${w}w`).join(', ');
}

function leerCache() {
  try { const c = JSON.parse(localStorage.getItem(CLAVE_CACHE)); return c && Array.isArray(c.filas) ? c : null; } catch { return null; }
}
function guardarCache(filas) {
  try { localStorage.setItem(CLAVE_CACHE, JSON.stringify({ en: Date.now(), filas })); } catch { /* sin storage */ }
}
const ordenar = (ps) => [...ps].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));

const cache0 = typeof window !== 'undefined' ? leerCache() : null;

export const useCatalogo = create((set, get) => ({
  productos: cache0 ? ordenar(cache0.filas.map(mapearFila)) : [],
  estado: cache0 ? 'listo' : 'cargando',   // cargando | listo | error
  error: null,
  actualizadoEn: cache0?.en ?? null,
  async cargar({ forzar = false } = {}) {
    const { actualizadoEn, estado } = get();
    if (!forzar && estado === 'listo' && actualizadoEn && Date.now() - actualizadoEn < VIGENCIA_MS) return;
    if (!supabaseConfigurado) { set({ estado: get().productos.length ? 'listo' : 'error', error: 'sin_configurar' }); return; }
    if (!get().productos.length) set({ estado: 'cargando', error: null });
    let data, error;
    try {
      // Tope de 8 s: supabase-js reintenta solo los errores de red y, sin tope, la tienda se quedaría en "Cargando…"
      ({ data, error } = await supabase.from('catalogo_publico').select('*').abortSignal(AbortSignal.timeout(8000)));
    } catch (e) { error = e; }
    if (error || !Array.isArray(data)) { set({ estado: get().productos.length ? 'listo' : 'error', error: error?.message || 'sin_datos' }); return; }
    guardarCache(data);
    set({ productos: ordenar(data.map(mapearFila)), estado: 'listo', error: null, actualizadoEn: Date.now() });
  },
}));

/** Tonos con fotos de lookbook en public/img/lookbook/ (Probador y test de tono). */
export const LOOKBOOK = new Set(['angeles-n-blue', 'angeles-n-gray', 'angeles-n-green', 'angeles-n-wave-gray', 'breeze-green', 'breeze-hazel', 'chelsea-blue', 'choco', 'cloud-gray', 'gemini-hazel', 'honey-brown', 'mint-green', 'ocean-blue', 'siri-blue', 'siri-green', 'storm-gray']);

/** Lista de productos visibles (lentes y accesorios) para las pantallas de la tienda. */
export const useProductos = () => useCatalogo((s) => s.productos);
