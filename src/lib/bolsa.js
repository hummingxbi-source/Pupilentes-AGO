// La bolsa guarda el precio de cuando se agregó cada pieza. Al llegar el catálogo de la BD se pone al día
// (hallazgo H5): precio de hoy y cantidad que todavía hay. El total real lo vuelve a calcular el servidor.

/**
 * Pura: devuelve la bolsa al día con el catálogo y qué cambió.
 * - precio distinto → se usa el de hoy (cuenta las piezas para el aviso)
 * - menos disponible que lo pedido → se baja la cantidad a lo que hay
 * - agotada o ya no está a la venta → se quita
 * Los renglones sin SKU (versión vieja de la tienda) se dejan igual: la caja ya pide quitarlos.
 */
export function ajustarBolsa(bolsa, productos) {
  const variantes = new Map();
  for (const p of productos || []) for (const v of p.variantes || []) variantes.set(v.sku, v);
  let piezasConPrecioNuevo = 0, ajustadas = 0;
  const quitadas = [];
  const nueva = [];
  for (const b of bolsa) {
    if (!b.sku) { nueva.push(b); continue; }
    const v = variantes.get(b.sku);
    if (!v || !(v.disponible > 0)) { quitadas.push(b.nombre); continue; }
    let item = b;
    if (Number(v.precio) !== Number(b.precio)) { item = { ...item, precio: Number(v.precio) }; piezasConPrecioNuevo += Math.min(b.cant, v.disponible); }
    if (v.disponible < b.cant) { item = { ...item, cant: v.disponible }; ajustadas += 1; }
    nueva.push(item);
  }
  const cambio = piezasConPrecioNuevo > 0 || ajustadas > 0 || quitadas.length > 0;
  return { bolsa: cambio ? nueva : bolsa, piezasConPrecioNuevo, ajustadas, quitadas, cambio };
}

/** Texto del aviso para la clienta (o null si no cambió nada que deba saber). */
export function avisoBolsa({ piezasConPrecioNuevo, ajustadas, quitadas }) {
  const partes = [];
  if (piezasConPrecioNuevo) partes.push(`Actualizamos el precio de ${piezasConPrecioNuevo} ${piezasConPrecioNuevo === 1 ? 'pieza' : 'piezas'}`);
  if (ajustadas) partes.push(`ajustamos la cantidad de ${ajustadas} ${ajustadas === 1 ? 'tono' : 'tonos'} a lo que hay`);
  if (quitadas.length) partes.push(`quitamos lo agotado: ${quitadas.join(', ')}`);
  if (!partes.length) return null;
  const t = partes.join('; ');
  return t.charAt(0).toUpperCase() + t.slice(1) + '.';
}
