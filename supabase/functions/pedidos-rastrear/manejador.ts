// POST /functions/v1/pedidos-rastrear — "¿cómo va mi pedido?" (ARQUITECTURA §3.3 F).
//   { token }                     → el enlace que recibe la clienta (64 hex, imposible de adivinar)
//   { folio, tel4, turnstile }    → sin enlace: folio + últimos 4 del teléfono, con Turnstile
//                                   y máximo 5 intentos por hora por folio (y 20 por IP)
// Nunca devuelve el teléfono, correo ni dirección: solo lo necesario para seguir el pedido.

import { clienteServicio } from '../_shared/auth.ts';
import { encabezadosCors, manejarCors } from '../_shared/cors.ts';
import { ErrorHttp, json, respuestaDeError } from '../_shared/http.ts';
import { exigirLimite, ipCliente } from '../_shared/limite.ts';
import { verificarTurnstile } from '../_shared/turnstile.ts';
import { leerJson, z } from '../_shared/validar.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

const Cuerpo = z.union([
  z.object({ token: z.string().regex(/^[0-9a-f]{64}$/) }).strict(),
  z.object({ folio: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{4,20}$/), tel4: z.string().regex(/^[0-9]{4}$/), turnstile: z.string().max(2048) }).strict(),
]);

export async function manejar(req: Request, admin: SupabaseClient = clienteServicio(), turnstile = verificarTurnstile): Promise<Response> {
  const cors = manejarCors(req); if (cors) return cors;
  const enc = encabezadosCors(req);
  try {
    if (req.method !== 'POST') throw new ErrorHttp(405, 'metodo_no_permitido');
    const ip = ipCliente(req);
    await exigirLimite(admin, `ip:${ip}:pedidos-rastrear`, 3600, 120);
    const cuerpo = await leerJson(req, Cuerpo, 4096);

    let r;
    if ('token' in cuerpo) {
      r = await admin.rpc('rastrear_por_token', { p_token: cuerpo.token });
    } else {
      await exigirLimite(admin, `ip:${ip}:rastrear-folio`, 3600, 20);
      await exigirLimite(admin, `folio:${cuerpo.folio}:rastrear`, 3600, 5);
      const t = await turnstile(cuerpo.turnstile, ip);
      if (!t.ok) throw new ErrorHttp(403, 'verificacion_fallida', 'No pudimos verificar que eres una persona. Recarga la página.');
      r = await admin.rpc('rastrear_por_folio', { p_folio: cuerpo.folio, p_tel4: cuerpo.tel4 });
    }
    if (r.error) throw new Error('rastrear: ' + r.error.message);
    if (!r.data) throw new ErrorHttp(404, 'no_encontrado', 'No encontramos ese pedido. Revisa el folio y los últimos 4 dígitos de tu teléfono.');
    return json(r.data, 200, enc);
  } catch (e) {
    return respuestaDeError(e, enc);
  }
}
