// Cloudflare R2 (API compatible con S3) para las Edge Functions. ARQUITECTURA §2.4.
// · URL firmadas cortas para que el panel suba directo (PUT, 60 s, Content-Type firmado [28]).
// · Verificación después de subir: tamaño y primeros bytes reales; lo que no cumpla se borra.
// Mientras no existan los buckets (R2 pospuesto), configurado() es false y las funciones responden 503.

import { AwsClient } from './deps.ts';

export interface ConfigR2 { cuenta: string; llave: string; secreto: string; bucket: string; urlPublica: string }

/**
 * Lee la configuración de un bucket: R2_<BUCKET>_ACCESS_KEY_ID, _SECRET_ACCESS_KEY, _BUCKET y,
 * solo para buckets públicos (FOTOS), _URL_PUBLICA. COMPROBANTES es privado: sin URL pública.
 */
export function configR2(
  env: (k: string) => string | undefined = (k) => Deno.env.get(k), bucket: 'FOTOS' | 'COMPROBANTES' = 'FOTOS',
): ConfigR2 | null {
  const c = {
    cuenta: env('R2_CUENTA_ID'), llave: env(`R2_${bucket}_ACCESS_KEY_ID`), secreto: env(`R2_${bucket}_SECRET_ACCESS_KEY`),
    bucket: env(`R2_${bucket}_BUCKET`), urlPublica: bucket === 'FOTOS' ? env('R2_FOTOS_URL_PUBLICA')?.replace(/\/$/, '') : '-',
  };
  return Object.values(c).every(Boolean) ? (c as ConfigR2) : null;
}

export function clienteR2(c: ConfigR2) {
  const aws = new AwsClient({ accessKeyId: c.llave, secretAccessKey: c.secreto, service: 's3', region: 'auto' });
  const base = `https://${c.cuenta}.r2.cloudflarestorage.com/${c.bucket}`;
  const url = (clave: string) => `${base}/${clave.split('/').map(encodeURIComponent).join('/')}`;
  return {
    /** URL firmada de PUT: solo acepta ese Content-Type (R2 responde 403 si no coincide [28]). */
    async firmarPut(clave: string, contentType: string, segundos = 60): Promise<string> {
      const firmada = await aws.sign(`${url(clave)}?X-Amz-Expires=${segundos}`, {
        // allHeaders: aws4fetch NO firma Content-Type por defecto; sin esto R2 aceptaría cualquier tipo
        method: 'PUT', headers: { 'Content-Type': contentType }, aws: { signQuery: true, allHeaders: true },
      });
      return firmada.url;
    },
    /** URL firmada de GET corta (comprobantes privados que ve el panel). */
    async firmarGet(clave: string, segundos = 300): Promise<string> {
      return (await aws.sign(`${url(clave)}?X-Amz-Expires=${segundos}`, { method: 'GET', aws: { signQuery: true } })).url;
    },
    /** Tamaño real y primeros bytes del objeto subido. null si no existe. */
    async inspeccionar(clave: string): Promise<{ bytes: number; inicio: Uint8Array } | null> {
      const h = await aws.fetch(url(clave), { method: 'HEAD' });
      if (h.status === 404) return null;
      if (!h.ok) throw new Error(`R2 HEAD ${h.status}`);
      const g = await aws.fetch(url(clave), { headers: { Range: 'bytes=0-15' } });
      if (!g.ok) throw new Error(`R2 GET ${g.status}`);
      return { bytes: Number(h.headers.get('content-length') ?? 0), inicio: new Uint8Array(await g.arrayBuffer()) };
    },
    async borrar(clave: string): Promise<void> {
      const r = await aws.fetch(url(clave), { method: 'DELETE' });
      if (!r.ok && r.status !== 404) throw new Error(`R2 DELETE ${r.status}`);
    },
    urlPublica: (clave: string) => `${c.urlPublica}/${clave}`,
  };
}

/** ¿Los primeros bytes son de un WebP real? (RIFF····WEBP) */
export const esWebp = (b: Uint8Array) =>
  b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP';

/** Tipo real por los primeros bytes (comprobantes de transferencia). null si no es uno permitido. */
export function tipoComprobante(b: Uint8Array): 'jpg' | 'png' | 'webp' | 'pdf' | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)) return 'png';
  if (esWebp(b)) return 'webp';
  if (b.length >= 5 && String.fromCharCode(...b.slice(0, 5)) === '%PDF-') return 'pdf';
  return null;
}
