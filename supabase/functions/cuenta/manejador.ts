// POST /functions/v1/cuenta — la cuenta de la clienta (ARQUITECTURA Fase 7).
// Exige la sesión que da el código por correo (Supabase Auth OTP). El correo verificado y el
// usuario salen del token, nunca del cuerpo. Las cuentas del panel no son cuentas de clienta.
//
//   { accion: "resumen" }                                   → vincula la cuenta (pedidos de invitada con el
//                                                              mismo correo) y devuelve perfil, saldo, reglas,
//                                                              movimientos y pedidos
//   { accion: "perfil", nombre, cumpleanos?, telefono? }   → guarda el perfil (bono si está completo)

import { clienteServicio, exigirUsuario } from '../_shared/auth.ts';
import { encabezadosCors, manejarCors } from '../_shared/cors.ts';
import { ErrorHttp, errorDeBd, json, respuestaDeError } from '../_shared/http.ts';
import { exigirLimite } from '../_shared/limite.ts';
import { leerJson, z } from '../_shared/validar.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

const Cuerpo = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('resumen') }).strict(),
  z.object({
    accion: z.literal('perfil'),
    nombre: z.string().trim().min(2).max(120),
    cumpleanos: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
    telefono: z.string().regex(/^[0-9 +()-]{10,20}$/).optional().or(z.literal('')),
  }).strict(),
]);

export const ERRORES_CUENTA: Record<string, [number, string]> = {
  correo_sin_verificar: [403, 'Confirma tu correo con el código que te mandamos.'],
  cuenta_de_panel: [403, 'Esta es una cuenta del panel. Para comprar, entra con otro correo.'],
  cuenta_no_existe: [401, 'Tu sesión ya no es válida. Vuelve a entrar.'],
  perfil_invalido: [400, 'Revisa tu nombre, tu teléfono (10 dígitos) y tu fecha de cumpleaños.'],
};

export async function manejar(req: Request, admin: SupabaseClient = clienteServicio()): Promise<Response> {
  const cors = manejarCors(req); if (cors) return cors;
  const enc = encabezadosCors(req);
  try {
    if (req.method !== 'POST') throw new ErrorHttp(405, 'metodo_no_permitido');
    const usuario = await exigirUsuario(req, admin);
    await exigirLimite(admin, `cuenta:${usuario.id}`, 600, 60);
    const cuerpo = await leerJson(req, Cuerpo, 4096);

    if (cuerpo.accion === 'perfil') {
      const { data, error } = await admin.rpc('cuenta_guardar_perfil', {
        p_user: usuario.id,
        p_datos: { nombre: cuerpo.nombre, cumpleanos: cuerpo.cumpleanos || null, telefono: cuerpo.telefono || null },
      });
      if (error) errorDeBd(error, ERRORES_CUENTA, 'cuenta_guardar_perfil');
      return json(data, 200, enc);
    }

    const v = await admin.rpc('cuenta_vincular', { p_user: usuario.id });
    if (v.error) errorDeBd(v.error, ERRORES_CUENTA, 'cuenta_vincular');
    const { data, error } = await admin.rpc('cuenta_resumen', { p_user: usuario.id });
    if (error) errorDeBd(error, ERRORES_CUENTA, 'cuenta_resumen');
    return json({ ...(data as Record<string, unknown>), vinculados: (v.data as { vinculados?: number })?.vinculados ?? 0 }, 200, enc);
  } catch (e) {
    return respuestaDeError(e, enc);
  }
}
