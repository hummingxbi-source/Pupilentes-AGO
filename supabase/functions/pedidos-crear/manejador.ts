// POST /functions/v1/pedidos-crear — la caja de la tienda (ARQUITECTURA §3.3 A, Fase 3).
// Compra como invitada (D5). Turnstile + límite por IP. El total lo calcula la BD (crear_pedido):
// el navegador solo manda lo que vio (`total_visto`) y, si cambió, recibe 409 con el total nuevo.
//
//   { clave_idempotencia, metodo_pago: "mercadopago"|"transferencia", items: [{ sku, cantidad }],
//     entrega: { tipo, zona, cita?, direccion? }, contacto: { nombre, telefono, correo? },
//     total_visto, turnstile }
//   → { folio, token, total, envio, expira, metodo_pago, url_pago? }
//
// Mercado Pago: se crea la preferencia de Checkout Pro con el total de la BD y caducidad = la reserva.
// Si MP no responde, el pedido se cancela (libera el stock) y se responde 502.

import { clienteServicio } from '../_shared/auth.ts';
import { encabezadosCors, manejarCors } from '../_shared/cors.ts';
import { ErrorHttp, errorDeBd, json, respuestaDeError } from '../_shared/http.ts';
import { exigirLimite, ipCliente } from '../_shared/limite.ts';
import { clienteMP, configMP } from '../_shared/mercadopago.ts';
import { verificarTurnstile } from '../_shared/turnstile.ts';
import { leerJson, z } from '../_shared/validar.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

const texto = (max: number) => z.string().trim().max(max);
const Cuerpo = z.object({
  clave_idempotencia: z.string().regex(/^[a-zA-Z0-9-]{16,100}$/),
  metodo_pago: z.enum(['mercadopago', 'transferencia']),
  items: z.array(z.object({ sku: z.string().regex(/^[A-Z0-9]+(-[A-Z0-9]+)*$/).max(64), cantidad: z.number().int().min(1).max(50) })).min(1).max(10),
  entrega: z.object({
    tipo: z.enum(['metro', 'metro_otra', 'didi', 'paqueteria']),
    zona: texto(80).min(1),
    cita: texto(120).optional(),          // "sábado 3 pm", estación, etc. (lo coordina WhatsApp)
    direccion: texto(300).optional(),     // DiDi y paquetería
    referencias: texto(200).optional(),
  }).strict(),
  contacto: z.object({ nombre: texto(120).min(2), telefono: z.string().regex(/^[0-9 +()-]{10,20}$/), correo: z.string().email().max(254).optional().or(z.literal('')) }).strict(),
  total_visto: z.number().min(0).max(1_000_000),
  turnstile: z.string().max(2048),
});

const ERRORES: Record<string, [number, string]> = {
  total_cambio: [409, 'El total cambió. Revisa el nuevo total antes de pagar.'],
  sin_stock: [409, 'Uno de tus pupilentes se acaba de agotar.'],
  sku_no_disponible: [409, 'Uno de tus pupilentes ya no está disponible.'],
  demasiadas_piezas: [400, 'Puedes llevar hasta 5 pares de cada uno y 10 en total por pedido.'],
  demasiados_pendientes: [429, 'Ya tienes pedidos sin pagar con este teléfono. Págalos o espera a que venzan.'],
  entrega_invalida: [400, 'Elige una forma de entrega de la lista.'],
  contacto_invalido: [400, 'Revisa tu nombre, teléfono (10 dígitos) y correo.'],
  metodo_invalido: [400, 'Elige cómo pagar.'],
  sin_items: [400, 'Tu bolsa está vacía.'],
  idempotencia_invalida: [400, 'Vuelve a intentarlo.'],
};

export interface Dependencias {
  admin: SupabaseClient;
  mp: ReturnType<typeof clienteMP> | null;
  turnstile: typeof verificarTurnstile;
  sitio: string;
  urlAviso: string | undefined;
  simulado?: boolean;   // MP_API_URL apunta al simulador local (scripts/mp-simulado.mjs): acepta http
}

function dependencias(): Dependencias {
  const c = configMP();
  return {
    admin: clienteServicio(), mp: c ? clienteMP(c) : null, turnstile: verificarTurnstile,
    sitio: (Deno.env.get('SITIO_URL') ?? 'http://localhost:5173').replace(/\/$/, ''),
    urlAviso: Deno.env.get('MP_NOTIFICATION_URL'),
    simulado: Boolean(Deno.env.get('MP_API_URL')),
  };
}

export async function manejar(req: Request, d: Dependencias = dependencias()): Promise<Response> {
  const cors = manejarCors(req); if (cors) return cors;
  const enc = encabezadosCors(req);
  try {
    if (req.method !== 'POST') throw new ErrorHttp(405, 'metodo_no_permitido');
    const ip = ipCliente(req);
    await exigirLimite(d.admin, `ip:${ip}:pedidos-crear`, 600, 15);
    const cuerpo = await leerJson(req, Cuerpo);
    const t = await d.turnstile(cuerpo.turnstile, ip);
    if (!t.ok) throw new ErrorHttp(403, 'verificacion_fallida', 'No pudimos verificar que eres una persona. Recarga la página.');
    if (cuerpo.metodo_pago === 'mercadopago' && (!d.mp || !d.urlAviso)) {
      throw new ErrorHttp(503, 'mp_sin_configurar', 'El pago con tarjeta no está disponible por ahora. Puedes pagar por transferencia.');
    }

    const { turnstile: _t, ...datos } = cuerpo;
    const { data, error } = await d.admin.rpc('crear_pedido', { p_datos: datos });
    if (error) {
      if (error.message === 'total_cambio') {
        return json({ error: 'total_cambio', mensaje: ERRORES.total_cambio[1], total: Number(error.details) }, 409, enc);
      }
      errorDeBd(error, ERRORES, 'crear_pedido');
    }
    const p = data as { id: string; folio: string; token: string; total: number; envio?: number; expira: string; metodo_pago: string; repetido: boolean; estado: string };
    const resp = { folio: p.folio, token: p.token, total: Number(p.total), envio: p.envio, expira: p.expira, metodo_pago: p.metodo_pago };
    // Transferencia, o un doble toque sobre un pedido que ya no espera pago: no se crea otro cobro.
    if (p.metodo_pago !== 'mercadopago' || p.estado !== 'pendiente_pago') return json({ ...resp, estado: p.estado }, 200, enc);

    // Checkout Pro. La misma clave de idempotencia en MP hace que un reintento devuelva la misma preferencia.
    try {
      const pref = await d.mp!.crearPreferencia({
        pedidoId: p.id, folio: p.folio, total: Number(p.total), expira: p.expira, correo: cuerpo.contacto.correo || null,
        urlRegreso: `${d.sitio}/pedido/${p.token}`, urlAviso: d.urlAviso!,
      });
      if (!pref?.init_point || !(pref.init_point.startsWith('https://') || (d.simulado && pref.init_point.startsWith('http://')))) {
        throw new Error('preferencia sin init_point');
      }
      await d.admin.rpc('guardar_preferencia_mp', { p_pedido: p.id, p_preferencia: String(pref.id).slice(0, 80) });
      return json({ ...resp, url_pago: pref.init_point }, 200, enc);
    } catch (e) {
      console.error('mp_preferencia', e instanceof Error ? e.message : String(e));
      if (!p.repetido) await d.admin.rpc('cancelar_pedido', { p_pedido: p.id, p_usuario: null, p_nota: 'Mercado Pago no respondió al crear el cobro' });
      throw new ErrorHttp(502, 'mp_no_disponible', 'Mercado Pago no respondió. No se te cobró nada; inténtalo otra vez o paga por transferencia.');
    }
  } catch (e) {
    return respuestaDeError(e, enc);
  }
}
