// POST /functions/v1/panel-pedidos — acciones sobre pedidos desde el panel (Fase 3, ARQUITECTURA §6.2).
// Sesión con MFA. La dueña hace todo; la ayudante solo avanza la entrega y ve comprobantes.
//
//   { accion: "validar_transferencia", pedido, aprobar, nota? }   dueña
//   { accion: "estado", pedido, nuevo: preparando|enviado|entregado, nota? }   dueña o ayudante
//   { accion: "cancelar", pedido, nota? }                          dueña (solo pedidos sin pagar)
//   { accion: "reembolsar", pedido, nota? }                        dueña. MP: reembolso por la API.
//                                                                  Transferencia: se registra (la dueña devuelve a mano).
//   { accion: "comprobante", pedido }                              URL de 5 min al archivo privado en R2

import { clienteServicio, exigirPanel, type RolPanel } from '../_shared/auth.ts';
import { encabezadosCors, manejarCors } from '../_shared/cors.ts';
import { ErrorHttp, errorDeBd, json, respuestaDeError } from '../_shared/http.ts';
import { exigirLimite } from '../_shared/limite.ts';
import { clienteMP, configMP } from '../_shared/mercadopago.ts';
import { clienteR2, configR2 } from '../_shared/r2.ts';
import { leerJson, z } from '../_shared/validar.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

const Nota = z.string().trim().max(300).optional();
const Cuerpo = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('validar_transferencia'), pedido: z.string().uuid(), aprobar: z.boolean(), nota: Nota }),
  z.object({ accion: z.literal('estado'), pedido: z.string().uuid(), nuevo: z.enum(['preparando', 'enviado', 'entregado']), nota: Nota }),
  z.object({ accion: z.literal('cancelar'), pedido: z.string().uuid(), nota: Nota }),
  z.object({ accion: z.literal('reembolsar'), pedido: z.string().uuid(), nota: Nota }),
  z.object({ accion: z.literal('comprobante'), pedido: z.string().uuid() }),
]);
const ROLES: Record<z.infer<typeof Cuerpo>['accion'], RolPanel[]> = {
  validar_transferencia: ['duena'], estado: ['duena', 'ayudante'], cancelar: ['duena'], reembolsar: ['duena'], comprobante: ['duena', 'ayudante'],
};
const ERRORES: Record<string, [number, string]> = {
  pedido_no_existe: [404, 'No encontramos ese pedido.'],
  pedido_no_pendiente: [409, 'Este pedido ya no espera validación.'],
  pedido_no_cancelable: [409, 'Solo se cancelan pedidos que aún no se pagan. Si ya se pagó, reembolsa.'],
  transicion_invalida: [409, 'Ese cambio de estado no es posible desde el estado actual.'],
  sin_stock: [409, 'Ya no hay stock para confirmar este pedido.'],
};

export interface Dependencias {
  admin: SupabaseClient;
  mp: ReturnType<typeof clienteMP> | null;
  r2: ReturnType<typeof clienteR2> | null;
}
function dependencias(): Dependencias {
  const m = configMP(), r = configR2(undefined, 'COMPROBANTES');
  return { admin: clienteServicio(), mp: m ? clienteMP(m) : null, r2: r ? clienteR2(r) : null };
}

export async function manejar(req: Request, d: Dependencias = dependencias()): Promise<Response> {
  const cors = manejarCors(req); if (cors) return cors;
  const enc = encabezadosCors(req);
  try {
    if (req.method !== 'POST') throw new ErrorHttp(405, 'metodo_no_permitido');
    const usuario = await exigirPanel(req, ['duena', 'ayudante'], d.admin);
    await exigirLimite(d.admin, `usuario:${usuario.id}:panel-pedidos`, 60, 60);
    const c = await leerJson(req, Cuerpo, 4096);
    if (!ROLES[c.accion].includes(usuario.rol)) throw new ErrorHttp(403, 'rol_insuficiente', 'Esta acción solo la puede hacer la dueña.');

    const { data: ped, error: ep } = await d.admin.from('pedidos').select('id, folio, estado, metodo_pago, no_entregar, total').eq('id', c.pedido).maybeSingle();
    if (ep) throw new Error('pedidos: ' + ep.message);
    if (!ped) throw new ErrorHttp(404, 'pedido_no_existe', ERRORES.pedido_no_existe[1]);

    switch (c.accion) {
      case 'validar_transferencia': {
        const { data, error } = await d.admin.rpc('panel_validar_transferencia', { p_pedido: c.pedido, p_aprobar: c.aprobar, p_usuario: usuario.id, p_nota: c.nota ?? null });
        if (error) errorDeBd(error, ERRORES, 'panel_validar_transferencia');
        return json({ estado: data }, 200, enc);
      }
      case 'estado': {
        if (ped.no_entregar && c.nuevo !== 'preparando') throw new ErrorHttp(409, 'no_entregar', 'Este pedido está marcado "no entregar" (contracargo o alerta). Revísalo antes.');
        const { error } = await d.admin.rpc('cambiar_estado_pedido', { p_pedido: c.pedido, p_nuevo: c.nuevo, p_usuario: usuario.id, p_nota: c.nota ?? null });
        if (error) errorDeBd(error, ERRORES, 'cambiar_estado_pedido');
        return json({ estado: c.nuevo }, 200, enc);
      }
      case 'cancelar': {
        const { data, error } = await d.admin.rpc('cancelar_pedido', { p_pedido: c.pedido, p_usuario: usuario.id, p_nota: c.nota ?? null });
        if (error) errorDeBd(error, ERRORES, 'cancelar_pedido');
        return json({ estado: data }, 200, enc);
      }
      case 'reembolsar': {
        if (!['pagado', 'pagado_sin_stock', 'preparando', 'enviado', 'entregado'].includes(ped.estado)) {
          throw new ErrorHttp(409, 'no_reembolsable', 'Solo se reembolsan pedidos pagados.');
        }
        let idReembolso = 'manual';
        if (ped.metodo_pago === 'mercadopago') {
          if (!d.mp) throw new ErrorHttp(503, 'mp_sin_configurar');
          const { data: pago } = await d.admin.from('pagos').select('id_externo').eq('pedido_id', c.pedido)
            .eq('proveedor', 'mercadopago').eq('estado', 'approved').order('creado_en', { ascending: false }).limit(1).maybeSingle();
          if (!pago) throw new ErrorHttp(409, 'sin_pago_aprobado', 'No encontramos el pago aprobado de este pedido en Mercado Pago.');
          try {
            const r = await d.mp.reembolsar(pago.id_externo, `reembolso-${c.pedido}`);   // misma clave = no reembolsa dos veces
            idReembolso = String(r.id);
          } catch (e) {
            console.error('mp_reembolso', e instanceof Error ? e.message : String(e));
            throw new ErrorHttp(502, 'mp_no_disponible', 'Mercado Pago no aceptó el reembolso. Inténtalo en unos minutos o hazlo desde tu cuenta de MP.');
          }
        }
        const { data, error } = await d.admin.rpc('panel_registrar_reembolso', { p_pedido: c.pedido, p_usuario: usuario.id, p_id_reembolso: idReembolso, p_nota: c.nota ?? null });
        if (error) errorDeBd(error, ERRORES, 'panel_registrar_reembolso');
        return json({ estado: data, reembolso: idReembolso, manual: idReembolso === 'manual' }, 200, enc);
      }
      case 'comprobante': {
        const { data: pago } = await d.admin.from('pagos').select('comprobante_clave').eq('pedido_id', c.pedido)
          .eq('proveedor', 'transferencia').not('comprobante_clave', 'is', null).limit(1).maybeSingle();
        if (!pago?.comprobante_clave) throw new ErrorHttp(404, 'sin_comprobante', 'La clienta no subió archivo (puede que lo haya mandado por WhatsApp).');
        if (!d.r2) throw new ErrorHttp(503, 'r2_sin_configurar');
        return json({ url: await d.r2.firmarGet(pago.comprobante_clave, 300) }, 200, enc);
      }
    }
  } catch (e) {
    return respuestaDeError(e, enc);
  }
}
