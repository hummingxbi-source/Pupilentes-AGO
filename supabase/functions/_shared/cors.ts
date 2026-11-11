// CORS: las funciones que llama el navegador solo aceptan el origen de la tienda
// (ARQUITECTURA §6.1 regla 8). Los webhooks no usan este módulo.
//
// ORIGENES_PERMITIDOS = lista separada por comas, p. ej.
//   http://localhost:5173,https://pupilentesago.mx

const PREDETERMINADO = 'http://localhost:5173,http://127.0.0.1:5173';

export function origenesPermitidos(): string[] {
  return (Deno.env.get('ORIGENES_PERMITIDOS') ?? PREDETERMINADO)
    .split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
}

/** Encabezados CORS para esta petición; vacíos si el origen no está permitido. */
export function encabezadosCors(req: Request, permitidos = origenesPermitidos()): Record<string, string> {
  const origen = req.headers.get('Origin');
  if (!origen || !permitidos.includes(origen)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origen,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

/**
 * Si la petición trae Origin y no está permitido → 403.
 * Si es OPTIONS (preflight) → 204 con los encabezados.
 * Si no, devuelve null y la función sigue.
 * Peticiones sin Origin (curl, servidores) pasan: CORS protege navegadores, no autentica.
 */
export function manejarCors(req: Request, permitidos = origenesPermitidos()): Response | null {
  const origen = req.headers.get('Origin');
  const enc = encabezadosCors(req, permitidos);
  if (origen && !permitidos.includes(origen)) {
    return new Response(JSON.stringify({ error: 'origen_no_permitido' }), {
      status: 403, headers: { 'Content-Type': 'application/json', Vary: 'Origin' },
    });
  }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: enc });
  return null;
}
