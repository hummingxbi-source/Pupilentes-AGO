// Respuestas JSON y errores con código HTTP.

export class ErrorHttp extends Error {
  constructor(readonly estado: number, readonly codigo: string, mensaje?: string) {
    super(mensaje ?? codigo);
  }
}

export function json(datos: unknown, estado = 200, encabezados: HeadersInit = {}): Response {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...encabezados },
  });
}

/**
 * Convierte cualquier error en respuesta. Los ErrorHttp salen con su código;
 * todo lo demás se registra (sin datos personales) y sale como 500 genérico.
 */
export function respuestaDeError(e: unknown, encabezados: HeadersInit = {}): Response {
  if (e instanceof ErrorHttp) return json({ error: e.codigo, mensaje: e.message }, e.estado, encabezados);
  console.error('error_interno', e instanceof Error ? e.name + ': ' + e.message : String(e));
  return json({ error: 'error_interno' }, 500, encabezados);
}

/** Compara dos textos en tiempo constante (para secretos y firmas). */
export function igualesSeguro(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let dif = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) dif |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return dif === 0;
}
