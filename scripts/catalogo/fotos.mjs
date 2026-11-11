// Fotos del catálogo: archivo original → WebP en 3 anchos → destino (carpeta local o Cloudflare R2).
// ARQUITECTURA §2.4 y §3.4: nombres con hash, caché inmutable, 2–3 anchos para srcset.
//
// Una foto en la plantilla puede ser:
//   · "img/…" o "https://…"  → ya está publicada; se usa tal cual (no se procesa).
//   · un nombre de archivo   → se busca en la carpeta --fotos, se convierte y se sube.
// La URL que se guarda es la del ancho medio (…-960.webp); el frontend arma el srcset
// reemplazando -960 por -480 y -1600.

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const ANCHOS = [480, 960, 1600];
const EXT_OK = /\.(jpe?g|png|webp|heic|heif|avif|tiff?)$/i;
const MAX_BYTES = 25 * 1024 * 1024;

export const yaPublicada = (ref) => /^(img\/|https:\/\/)/.test(ref);

/** Convierte una imagen a WebP en los 3 anchos (sin agrandar). Devuelve [{ ancho, datos }]. */
export async function aWebp(buffer) {
  const { default: sharp } = await import('sharp');
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height) throw new Error('no es una imagen válida');
  return Promise.all(ANCHOS.map(async (ancho) => ({
    ancho,
    datos: await sharp(buffer).rotate().resize({ width: Math.min(ancho, meta.width), withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 }).toBuffer(),
  })));
}

/** Destino local: public/img/catalogo/<hash>-<ancho>.webp (para desarrollo, mientras no hay R2). */
export function destinoLocal(raizPublic) {
  return {
    nombre: 'local',
    async subir(clave, datos) {
      const archivo = path.join(raizPublic, 'img', clave);
      await mkdir(path.dirname(archivo), { recursive: true });
      if (!existsSync(archivo)) await writeFile(archivo, datos);
      return `img/${clave}`;
    },
  };
}

/** Destino R2 (bucket público de fotos servido por dominio propio, §2.4). */
export async function destinoR2(env = process.env) {
  const faltan = ['R2_CUENTA_ID', 'R2_FOTOS_ACCESS_KEY_ID', 'R2_FOTOS_SECRET_ACCESS_KEY', 'R2_FOTOS_BUCKET', 'R2_FOTOS_URL_PUBLICA'].filter((k) => !env[k]);
  if (faltan.length) throw new Error(`Para --destino r2 faltan variables: ${faltan.join(', ')}`);
  const { AwsClient } = await import('aws4fetch');
  const cliente = new AwsClient({ accessKeyId: env.R2_FOTOS_ACCESS_KEY_ID, secretAccessKey: env.R2_FOTOS_SECRET_ACCESS_KEY, service: 's3', region: 'auto' });
  const base = `https://${env.R2_CUENTA_ID}.r2.cloudflarestorage.com/${env.R2_FOTOS_BUCKET}`;
  const publica = env.R2_FOTOS_URL_PUBLICA.replace(/\/$/, '');
  if (!publica.startsWith('https://')) throw new Error('R2_FOTOS_URL_PUBLICA debe empezar con https://');
  return {
    nombre: 'r2',
    async subir(clave, datos) {
      const r = await cliente.fetch(`${base}/${clave}`, {
        method: 'PUT', body: datos,
        headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' },
      });
      if (!r.ok) throw new Error(`R2 respondió ${r.status} al subir ${clave}`);
      return `${publica}/${clave}`;
    },
  };
}

/**
 * Resuelve la URL de cada foto del plan (muta plan.imagenes[i].url).
 * `carpetaFotos` = dónde buscar los archivos; `raizPublic` = carpeta public/ (para validar "img/…").
 */
export async function publicarFotos(plan, { carpetaFotos, raizPublic, destino, log = () => {} }) {
  const errores = [];
  const cache = new Map();
  for (const img of plan.imagenes) {
    const ref = img.origen;
    if (yaPublicada(ref)) {
      if (ref.startsWith('img/') && !existsSync(path.join(raizPublic, ref))) { errores.push(`foto "${ref}" no existe en public/`); continue; }
      img.url = ref; continue;
    }
    if (cache.has(ref)) { img.url = cache.get(ref); continue; }
    if (!carpetaFotos) { errores.push(`foto "${ref}": indica la carpeta con --fotos`); continue; }
    const archivo = path.resolve(carpetaFotos, ref);
    if (!archivo.startsWith(path.resolve(carpetaFotos) + path.sep)) { errores.push(`foto "${ref}": ruta no permitida`); continue; }
    if (!EXT_OK.test(archivo)) { errores.push(`foto "${ref}": formato no soportado`); continue; }
    if (!existsSync(archivo)) { errores.push(`foto "${ref}" no está en ${carpetaFotos}`); continue; }
    const buf = await readFile(archivo);
    if (buf.length > MAX_BYTES) { errores.push(`foto "${ref}" pesa más de 25 MB`); continue; }
    try {
      const hash = createHash('sha256').update(buf).digest('hex').slice(0, 16);
      let url960 = null;
      for (const { ancho, datos } of await aWebp(buf)) {
        const u = await destino.subir(`catalogo/${hash}-${ancho}.webp`, datos);
        if (ancho === 960) url960 = u;
      }
      cache.set(ref, url960);
      img.url = url960;
      log(`  foto ${ref} → ${url960}`);
    } catch (e) {
      errores.push(`foto "${ref}": ${e.message}`);
    }
  }
  return errores;
}
