// GET /functions/v1/salud — comprueba que las Edge Functions responden.
// Pública y sin datos: la usa el frontend local para verificar la conexión (Fase 0).

import { encabezadosCors, manejarCors } from '../_shared/cors.ts';
import { json } from '../_shared/http.ts';

export function manejar(req: Request): Response {
  const cors = manejarCors(req);
  if (cors) return cors;
  const enc = encabezadosCors(req);
  if (req.method !== 'GET') return json({ error: 'metodo_no_permitido' }, 405, { ...enc, Allow: 'GET, OPTIONS' });
  return json({ ok: true, servicio: 'pupilentes-ago', hora: new Date().toISOString() }, 200, enc);
}

