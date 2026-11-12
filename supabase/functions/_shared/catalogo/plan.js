// Núcleo del importador de catálogo. Funciones puras: filas → plan validado.
// Lo usan la terminal (scripts/importar-catalogo.mjs), el panel (Edge Function panel-catalogo) y las pruebas.
// El formato de la plantilla está documentado en plantillas/LEEME.md.

export const COLUMNAS = [
  'marca', 'linea', 'tipo', 'color', 'clave', 'alias', 'familia', 'intensidad', 'descripcion',
  'duracion', 'graduaciones', 'precio', 'stock', 'fotos', 'destacado', 'iris', 'filtro', 'orden', 'activo',
];
const OBLIGATORIAS = ['marca', 'linea', 'tipo', 'precio'];
const FAMILIAS = ['azul', 'verde', 'cafe', 'gris', 'otro'];
const DURACIONES = { trimestral: 'trimestral', semestral: 'semestral', anual: 'anual', '3 meses': 'trimestral', '6 meses': 'semestral', '1 año': 'anual', '12 meses': 'anual' };
const IRIS = ['aqua', 'avellana', 'azul', 'cafe', 'gris', 'miel', 'verde', 'violeta'];
const COD_DUR = { trimestral: 'TRI', semestral: 'SEM', anual: 'ANU' };

/**
 * Escala estándar de graduaciones para los rangos "A a B": pasos de 0.25 hasta −4.00 y de 0.50 después.
 * ⚠️ Es la escala de la demo; confirmar con la clienta la que maneja su proveedor.
 */
export const ESCALA = (() => {
  const out = [];
  for (let g = -50; g >= -400; g -= 25) out.push(g / 100);
  for (let g = -450; g >= -2000; g -= 50) out.push(g / 100);
  return out;
})();

export const slug = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const cod = (s) => slug(s).toUpperCase();
const txt = (v) => (v == null ? '' : String(v).trim());
const sinAcentos = (s) => txt(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Código corto de marca para el SKU: iniciales si son 2+ palabras ("Urban Layer" → UL), si no las primeras 4 letras. */
export function codigoMarca(marca) {
  const p = slug(marca).split('-').filter(Boolean);
  return (p.length >= 2 ? p.map((x) => x[0]).join('') : (p[0] || 'X').slice(0, 4)).toUpperCase();
}

/** "−1.00" → "M100"; null → "N" */
export const codigoGrad = (g) => (g == null ? 'N' : 'M' + String(Math.round(Math.abs(g) * 100)).padStart(3, '0'));

export function generarSku({ marca, linea, color, duracion, graduacion, tipo }) {
  const partes = [codigoMarca(marca), cod(linea)];
  if (tipo === 'lente') { partes.push(cod(color)); if (duracion) partes.push(COD_DUR[duracion]); partes.push(codigoGrad(graduacion)); }
  return partes.filter(Boolean).join('-');
}

/** Lee "neutro, -0.50 a -4.00, -5.00" → [null, -0.5, -0.75, …, -4, -5]. Lanza Error con mensaje claro. */
export function parsearGraduaciones(valor) {
  const t = sinAcentos(valor).replace(/−/g, '-');
  if (!t) return [null];
  const out = [];
  for (const parte of t.split(/[,;]/).map((x) => x.trim()).filter(Boolean)) {
    if (/^(neutro|sin( graduacion)?|0|0\.00|n)$/.test(parte)) { out.push(null); continue; }
    const r = parte.match(/^(-?\d+(?:\.\d+)?)\s*(?:a|\.\.|hasta)\s*(-?\d+(?:\.\d+)?)$/);
    if (r) {
      const [a, b] = [Number(r[1]), Number(r[2])].map((x) => -Math.abs(x));
      const [alto, bajo] = a >= b ? [a, b] : [b, a];
      const tramo = ESCALA.filter((g) => g <= alto + 1e-9 && g >= bajo - 1e-9);
      if (!tramo.length || !ESCALA.some((g) => Math.abs(g - alto) < 1e-9) || !ESCALA.some((g) => Math.abs(g - bajo) < 1e-9)) {
        throw new Error(`rango "${parte}" fuera de la escala (−0.50 a −20.00)`);
      }
      out.push(...tramo); continue;
    }
    const n = Number(parte);
    if (!Number.isFinite(n) || n === 0) throw new Error(`graduación "${parte}" no se entiende`);
    const g = -Math.abs(n);
    if (Math.round(g * 100) % 25 !== 0 || g < -20) throw new Error(`graduación "${parte}" debe ir en pasos de 0.25`);
    out.push(g);
  }
  const vistos = new Set();
  return out.filter((g) => { const k = String(g); if (vistos.has(k)) return false; vistos.add(k); return true; });
}

const siNo = (v, def) => { const t = sinAcentos(v); if (!t) return def; if (['si', 's', 'x', '1', 'true', 'verdadero'].includes(t)) return true; if (['no', 'n', '0', 'false', 'falso'].includes(t)) return false; return null; };

/** Normaliza encabezados ("Línea" → "linea") y convierte filas en objetos. */
export function filasAObjetos(filas) {
  if (!filas.length) return { encabezados: [], objetos: [] };
  const encabezados = filas[0].map((h) => sinAcentos(h).replace(/\s+/g, '_'));
  const objetos = filas.slice(1).map((f, i) => {
    const o = { __fila: i + 2 };
    encabezados.forEach((h, j) => { if (h) o[h] = f[j]; });
    return o;
  }).filter((o) => COLUMNAS.some((c) => txt(o[c]) !== ''));
  return { encabezados, objetos };
}

/**
 * Valida y agrupa. Devuelve { errores: string[], plan } donde plan = { marcas, productos, tonos, variantes, imagenes }.
 * Varias filas pueden describir el mismo tono (p. ej. distinta duración o rango de graduación).
 * Los datos del tono (alias, familia, fotos…) se toman de la primera fila que los traiga.
 */
export function construirPlan(filas) {
  const { encabezados, objetos } = filasAObjetos(filas);
  const errores = [];
  const faltan = OBLIGATORIAS.filter((c) => !encabezados.includes(c));
  if (faltan.length) return { errores: [`Faltan columnas: ${faltan.join(', ')}`], plan: null };

  const marcas = new Map(), productos = new Map(), tonos = new Map(), variantes = new Map(), imagenes = [];
  for (const o of objetos) {
    const f = `fila ${o.__fila}`;
    const err = (m) => errores.push(`${f}: ${m}`);
    const marca = txt(o.marca), linea = txt(o.linea), color = txt(o.color);
    const tipo = sinAcentos(o.tipo);
    if (!marca) { err('falta la marca'); continue; }
    if (!linea) { err('falta la línea/producto'); continue; }
    if (!['lente', 'accesorio'].includes(tipo)) { err(`tipo "${txt(o.tipo)}" debe ser lente o accesorio`); continue; }
    const precio = Number(String(o.precio ?? '').replace(/[$,\s]/g, ''));
    if (!(precio > 0) || precio > 100000) { err(`precio "${txt(o.precio)}" inválido`); continue; }
    const stock = txt(o.stock) === '' ? 0 : Number(o.stock);
    if (!Number.isInteger(stock) || stock < 0 || stock > 10000) { err(`stock "${txt(o.stock)}" debe ser un entero ≥ 0`); continue; }
    const activo = siNo(o.activo, true), destacado = siNo(o.destacado, false);
    if (activo === null) { err('activo debe ser sí/no'); continue; }
    if (destacado === null) { err('destacado debe ser sí/no'); continue; }
    const orden = txt(o.orden) === '' ? 0 : Number(o.orden);
    if (!Number.isInteger(orden)) { err('orden debe ser entero'); continue; }

    const ms = slug(marca);
    if (!marcas.has(ms)) marcas.set(ms, { slug: ms, nombre: marca });
    const ps = slug(`${marca} ${linea}`);
    const prod = productos.get(ps) ?? { slug: ps, marca: ms, nombre: linea, tipo, alias: null, descripcion: null, destacado: false, orden: 0, activo: true };
    if (prod.tipo !== tipo) { err(`"${linea}" aparece como ${prod.tipo} y como ${tipo}`); continue; }
    productos.set(ps, prod);

    let tono = null, duracion = null, grads = [null];
    if (tipo === 'lente') {
      if (!color) { err('un lente necesita color/diseño'); continue; }
      const familia = sinAcentos(o.familia);
      const ts = txt(o.clave) ? slug(o.clave) : slug(`${linea} ${color}`);
      if (!ts) { err('clave inválida'); continue; }
      tono = tonos.get(ts);
      if (tono && (tono.producto !== ps || tono.color !== color)) { err(`la clave "${ts}" ya se usa para otro tono`); continue; }
      if (!tono) {
        if (!FAMILIAS.includes(familia)) { err(`familia "${txt(o.familia)}" debe ser: ${FAMILIAS.join(', ')}`); continue; }
        tono = { slug: ts, producto: ps, color, nombre: `${linea} ${color}`, alias: null, familia, intensidad: null, descripcion: null, iris: null, filtro: null, destacado, orden, activo };
        tonos.set(ts, tono);
      }
      const intensidad = txt(o.intensidad) === '' ? null : Number(o.intensidad);
      if (intensidad !== null && ![1, 2, 3].includes(intensidad)) { err('intensidad debe ser 1, 2 o 3'); continue; }
      const iris = sinAcentos(o.iris) || null;
      if (iris && !IRIS.includes(iris)) { err(`iris "${o.iris}" debe ser: ${IRIS.join(', ')}`); continue; }
      const filtro = txt(o.filtro) || null;
      if (filtro && !/^[a-z0-9 ().,%-]{0,200}$/.test(filtro)) { err('filtro con caracteres no permitidos'); continue; }
      tono.alias ??= txt(o.alias) || null;
      tono.intensidad ??= intensidad;
      tono.descripcion ??= txt(o.descripcion) || null;
      tono.iris ??= iris;
      tono.filtro ??= filtro;

      const d = sinAcentos(o.duracion);
      if (d) { duracion = DURACIONES[d]; if (!duracion) { err(`duración "${txt(o.duracion)}" debe ser trimestral, semestral o anual`); continue; } }
      try { grads = parsearGraduaciones(o.graduaciones); } catch (e) { err(e.message); continue; }
    } else {
      if (color || txt(o.duracion) || txt(o.graduaciones)) { err('un accesorio no lleva color, duración ni graduaciones'); continue; }
      prod.alias ??= txt(o.alias) || null;
      prod.descripcion ??= txt(o.descripcion) || null;
      prod.destacado ||= destacado;
      prod.orden = prod.orden || orden;
      prod.activo = activo;
    }

    for (const g of grads) {
      const sku = generarSku({ marca, linea, color, duracion, graduacion: g, tipo });
      if (variantes.has(sku)) { err(`la variante ${sku} se repite (revisa duraciones y rangos)`); continue; }
      variantes.set(sku, { sku, producto: ps, tono: tono?.slug ?? null, duracion, graduacion: g, precio, stock, activo });
    }

    for (const ref of txt(o.fotos).split(/[|,]/).map((x) => x.trim()).filter(Boolean)) {
      const dueño = tono?.slug ?? null;
      if (!imagenes.some((i) => i.producto === ps && i.tono === dueño && i.origen === ref)) {
        imagenes.push({ producto: ps, tono: dueño, origen: ref, url: null, alt: tono ? tono.nombre : prod.nombre, orden: imagenes.filter((i) => i.producto === ps && i.tono === dueño).length });
      }
    }
  }
  return { errores, plan: { marcas: [...marcas.values()], productos: [...productos.values()], tonos: [...tonos.values()], variantes: [...variantes.values()], imagenes } };
}

/** Resumen legible del plan para la consola. */
export function resumen(plan) {
  const lentes = plan.variantes.filter((v) => v.tono);
  return `${plan.marcas.length} marcas · ${plan.productos.length} productos · ${plan.tonos.length} tonos · ` +
    `${plan.variantes.length} variantes (${lentes.length} de lentes) · ${plan.imagenes.length} fotos · ` +
    `${plan.variantes.reduce((a, v) => a + v.stock, 0)} pares de stock inicial`;
}

/** Plan → lo que recibe public.aplicar_catalogo (sin `origen` de fotos). Exige que cada foto tenga URL publicada. */
export function planParaBd(plan) {
  for (const i of plan.imagenes) if (!i.url) throw new Error(`la foto "${i.origen}" no tiene URL publicada`);
  return {
    marcas: plan.marcas,
    productos: plan.productos,
    tonos: plan.tonos,
    variantes: plan.variantes,
    imagenes: plan.imagenes.map(({ producto, tono, url, alt, orden }) => ({ producto, tono, url, alt, orden })),
  };
}
