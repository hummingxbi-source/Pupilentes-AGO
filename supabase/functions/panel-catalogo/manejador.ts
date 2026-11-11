// POST /functions/v1/panel-catalogo — alta/actualización de catálogo desde el panel (Fase 2).
// Usa EXACTAMENTE el mismo importador que la terminal (_shared/catalogo/plan.js) y la misma
// función SQL (aplicar_catalogo): una sola implementación. Solo la dueña, con MFA.
//
//   { accion: "revisar", filas: [[encabezados…], [fila…], …] }  → errores por fila o resumen
//   { accion: "aplicar", filas }                                 → guarda todo o nada
//
// Las fotos por archivo se suben desde la ficha del tono (r2-firmar); aquí solo se aceptan
// fotos ya publicadas ("img/…" o "https://…").

import { clienteServicio, exigirPanel } from '../_shared/auth.ts';
import { encabezadosCors, manejarCors } from '../_shared/cors.ts';
import { ErrorHttp, json, respuestaDeError } from '../_shared/http.ts';
import { exigirLimite } from '../_shared/limite.ts';
import { leerJson, z } from '../_shared/validar.ts';
import { construirPlan, planParaBd, resumen } from '../_shared/catalogo/plan.js';
import type { SupabaseClient } from '../_shared/deps.ts';

// El importador es JS sin tipos: se describe aquí lo que este archivo usa del plan.
type Plan = { imagenes: { origen: string; url: string | null }[] };

const Celda = z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]);
const Cuerpo = z.object({
  accion: z.enum(['revisar', 'aplicar']),
  filas: z.array(z.array(Celda).max(40)).min(2).max(3000),
});

export async function manejar(req: Request, admin: SupabaseClient = clienteServicio()): Promise<Response> {
  const cors = manejarCors(req); if (cors) return cors;
  const enc = encabezadosCors(req);
  try {
    if (req.method !== 'POST') throw new ErrorHttp(405, 'metodo_no_permitido');
    const usuario = await exigirPanel(req, ['duena'], admin);
    await exigirLimite(admin, `usuario:${usuario.id}:panel-catalogo`, 60, 20);
    const { accion, filas } = await leerJson(req, Cuerpo, 2_000_000);

    const { errores, plan: p } = construirPlan(filas) as { errores: string[]; plan: Plan | null };
    if (errores.length || !p) return json({ error: 'plantilla_con_errores', errores }, 400, enc);
    const plan = p;
    const sinPublicar = plan.imagenes.filter((i) => !/^(img\/|https:\/\/)/.test(i.origen));
    if (sinPublicar.length) {
      return json({ error: 'plantilla_con_errores', errores: sinPublicar.map((i) => `foto "${i.origen}": súbela desde la ficha del tono`) }, 400, enc);
    }
    for (const i of plan.imagenes) i.url = i.origen;
    if (accion === 'revisar') return json({ resumen: resumen(plan) }, 200, enc);

    const { data, error } = await admin.rpc('aplicar_catalogo', { p_plan: planParaBd(plan), p_usuario: usuario.id });
    if (error) throw new ErrorHttp(422, 'bd_rechazo', 'La base de datos rechazó el catálogo; no se aplicó nada.');
    return json({ resumen: resumen(plan), aplicado: data }, 200, enc);
  } catch (e) {
    return respuestaDeError(e, enc);
  }
}
