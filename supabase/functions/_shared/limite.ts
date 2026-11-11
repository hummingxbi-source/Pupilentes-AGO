// Límite de peticiones por ventana fija (ARQUITECTURA §6.1 regla 7).
// El conteo vive en privado.limites_tasa y lo suma public.consumir_limite (atómico).

import type { SupabaseClient } from './deps.ts';
import { ErrorHttp } from './http.ts';

/** IP de la clienta. Cloudflare y Supabase la pasan en estos encabezados. */
export function ipCliente(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'desconocida';
}

/**
 * Suma una petición a `clave`. Si pasa del máximo lanza 429.
 * Si la BD no responde, falla cerrado con 503 (no se deja pasar sin contar).
 */
export async function exigirLimite(
  admin: SupabaseClient, clave: string, ventanaSeg: number, maximo: number,
): Promise<void> {
  const { data, error } = await admin.rpc('consumir_limite', {
    p_clave: clave.slice(0, 200), p_ventana_seg: ventanaSeg, p_maximo: maximo,
  });
  if (error) throw new ErrorHttp(503, 'limite_no_disponible');
  if (data !== true) throw new ErrorHttp(429, 'demasiadas_peticiones', 'Espera un momento e inténtalo de nuevo.');
}
