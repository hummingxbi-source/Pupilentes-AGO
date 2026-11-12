// Fotos en el navegador → WebP en 3 anchos antes de subir (ARQUITECTURA §2.2 punto 2, §3.4).
export const ANCHOS = [480, 960, 1600];
const MAX_BYTES = 25 * 1024 * 1024;

export async function comprimirWebp(archivo, { calidad = 0.8 } = {}) {
  if (!/^image\//.test(archivo.type)) throw new Error('El archivo no es una imagen.');
  if (archivo.size > MAX_BYTES) throw new Error('La imagen pesa más de 25 MB.');
  const bmp = await createImageBitmap(archivo).catch(() => { throw new Error('No se pudo leer la imagen.'); });
  const salida = [];
  for (const ancho of ANCHOS) {
    const w = Math.min(ancho, bmp.width);
    const h = Math.round((bmp.height / bmp.width) * w);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/webp', calidad));
    if (!blob || blob.type !== 'image/webp') throw new Error('Tu navegador no pudo convertir a WebP.');
    salida.push({ ancho, blob });
  }
  bmp.close?.();
  return salida;
}
