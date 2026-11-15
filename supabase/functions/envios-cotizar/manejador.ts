// POST /functions/v1/envios-cotizar — opciones de paquetería para la caja (ARQUITECTURA §5, Fase 4).
//   { items: [{ sku, cantidad }], destino: { cp, ciudad, estado, colonia? }, turnstile }
//   → { opciones: [{ id, carrier, servicio, descripcion, entrega, precio, expira }] }
// El peso y el valor declarado salen de la BD (piezas y precios), nunca del navegador.
// Cada opción queda guardada en el servidor; pedidos-crear solo acepta su `id` (cotización vigente,
// mismo CP, mismas piezas). Envia cotiza una paquetería por petición: se piden en paralelo.

import { clienteServicio } from '../_shared/auth.ts';
import { encabezadosCors, manejarCors } from '../_shared/cors.ts';
import { clienteEnvia, configEnvia, ErrorEnvia, type Direccion, type Tarifa } from '../_shared/envia.ts';
import { ErrorHttp, json, respuestaDeError } from '../_shared/http.ts';
import { exigirLimite, ipCliente } from '../_shared/limite.ts';
import { verificarTurnstile } from '../_shared/turnstile.ts';
import { leerJson, z } from '../_shared/validar.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

const texto = (min: number, max: number) => z.string().trim().min(min).max(max);
const Cuerpo = z.object({
  items: z.array(z.object({ sku: z.string().regex(/^[A-Z0-9]+(-[A-Z0-9]+)*$/).max(64), cantidad: z.number().int().min(1).max(50) }).strict()).min(1).max(10),
  destino: z.object({ cp: z.string().regex(/^[0-9]{5}$/), ciudad: texto(2, 60), estado: texto(2, 40), colonia: texto(0, 80).optional() }).strict(),
  turnstile: z.string().max(2048),
}).strict();

export interface Dependencias {
  admin: SupabaseClient;
  envia: ReturnType<typeof clienteEnvia> | null;
  turnstile: typeof verificarTurnstile;
}
function dependencias(): Dependencias {
  const c = configEnvia();
  return { admin: clienteServicio(), envia: c ? clienteEnvia(c) : null, turnstile: verificarTurnstile };
}

export async function manejar(req: Request, d: Dependencias = dependencias()): Promise<Response> {
  const cors = manejarCors(req); if (cors) return cors;
  const enc = encabezadosCors(req);
  try {
    if (req.method !== 'POST') throw new ErrorHttp(405, 'metodo_no_permitido');
    const ip = ipCliente(req);
    await exigirLimite(d.admin, `ip:${ip}:envios-cotizar`, 600, 20);
    const c = await leerJson(req, Cuerpo, 4096);
    const t = await d.turnstile(c.turnstile, ip);
    if (!t.ok) throw new ErrorHttp(403, 'verificacion_fallida', 'No pudimos verificar que eres una persona. Recarga la página.');
    if (!d.envia) throw new ErrorHttp(503, 'envia_sin_configurar', 'El envío por paquetería no está disponible por ahora. Elige otra forma de entrega.');

    // Piezas y valor desde la BD
    const skus = [...new Set(c.items.map((i) => i.sku))];
    const { data: vs, error: ev } = await d.admin.from('variantes').select('sku, precio, activo').in('sku', skus);
    if (ev) throw new Error('variantes: ' + ev.message);
    const precio = new Map((vs ?? []).filter((v) => v.activo).map((v) => [v.sku as string, Number(v.precio)]));
    if (skus.some((s) => !precio.has(s))) throw new ErrorHttp(409, 'sku_no_disponible', 'Uno de tus pupilentes ya no está disponible.');
    const piezas = c.items.reduce((a, i) => a + i.cantidad, 0);
    const valor = c.items.reduce((a, i) => a + i.cantidad * precio.get(i.sku)!, 0);

    const { data: cfg, error: ec } = await d.admin.from('config_tienda')
      .select('envio_origen, envio_peso_par_kg, envio_caja_cm, envio_paqueterias, max_piezas_pedido').single();
    if (ec || !cfg) throw new Error('config_tienda: ' + ec?.message);
    if (piezas > cfg.max_piezas_pedido) throw new ErrorHttp(400, 'demasiadas_piezas', `Puedes llevar hasta ${cfg.max_piezas_pedido} pares por pedido.`);

    const destino: Direccion = {
      name: 'Clienta', phone: '0000000000', street: 'Por definir', district: c.destino.colonia || undefined,
      city: c.destino.ciudad, state: c.destino.estado, postalCode: c.destino.cp, country: 'MX',
    };
    const paquete = { piezas, pesoParKg: Number(cfg.envio_peso_par_kg), caja: cfg.envio_caja_cm, valorDeclarado: valor };
    const resultados = await Promise.allSettled((cfg.envio_paqueterias as string[]).map((p) => d.envia!.cotizar(p, cfg.envio_origen as Direccion, destino, paquete)));
    const tarifas: Tarifa[] = resultados.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    const fallas = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    for (const f of fallas) console.error('envia_cotizar', f.reason instanceof Error ? f.reason.message : String(f.reason));

    if (!tarifas.length) {
      const todasDeDatos = fallas.length > 0 && fallas.every((f) => f.reason instanceof ErrorEnvia && f.reason.estado >= 400 && f.reason.estado < 500);
      if (fallas.length === 0 || todasDeDatos) throw new ErrorHttp(400, 'sin_cobertura', 'No encontramos envíos a ese código postal. Revisa tu CP, ciudad y estado.');
      throw new ErrorHttp(502, 'envia_no_disponible', 'No pudimos cotizar el envío en este momento. Inténtalo en un minuto o elige otra forma de entrega.');
    }
    const mejores = tarifas.sort((a, b) => a.costo - b.costo).slice(0, 8);
    const { data, error } = await d.admin.rpc('guardar_cotizaciones', {
      p_cp: c.destino.cp, p_piezas: piezas,
      p_opciones: mejores.map((t) => ({ carrier: t.carrier, servicio: t.servicio, descripcion: t.descripcion, entrega: t.entrega, costo: t.costo })),
    });
    if (error) throw new Error('guardar_cotizaciones: ' + error.message);
    return json({ opciones: data }, 200, enc);
  } catch (e) {
    return respuestaDeError(e, enc);
  }
}
