// POST /functions/v1/envios-guia — guía de paquetería desde el panel (ARQUITECTURA §5, Fase 4; §6.2).
// Sesión con MFA; dueña o ayudante.
//   { accion: "generar", pedido }   compra la guía en Envia con la paquetería y el servicio que eligió la clienta.
//                                   Una sola guía activa por pedido (doble clic → 409, no compra dos).
//                                   El PDF va al bucket privado de R2; sin bucket se guarda el enlace de Envia.
//   { accion: "etiqueta", pedido }  URL para descargar la guía (R2: firmada de 5 min).

import { clienteServicio, exigirPanel } from '../_shared/auth.ts';
import { encabezadosCors, manejarCors } from '../_shared/cors.ts';
import { clienteEnvia, configEnvia, type Direccion } from '../_shared/envia.ts';
import { ErrorHttp, errorDeBd, json, respuestaDeError } from '../_shared/http.ts';
import { exigirLimite } from '../_shared/limite.ts';
import { clienteR2, configR2 } from '../_shared/r2.ts';
import { leerJson, z } from '../_shared/validar.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

const Cuerpo = z.object({ accion: z.enum(['generar', 'etiqueta']), pedido: z.string().uuid() }).strict();
const ERRORES: Record<string, [number, string]> = {
  pedido_no_existe: [404, 'No encontramos ese pedido.'],
  no_es_paqueteria: [409, 'Este pedido no va por paquetería.'],
  no_entregar: [409, 'Este pedido está marcado "no entregar" (contracargo o alerta). Revísalo antes.'],
  pedido_no_listo: [409, 'Solo se genera la guía de un pedido pagado.'],
  guia_existente: [409, 'Este pedido ya tiene una guía (o se está generando).'],
};

export interface Dependencias {
  admin: SupabaseClient;
  envia: ReturnType<typeof clienteEnvia> | null;
  r2: ReturnType<typeof clienteR2> | null;
  fetchFn: typeof fetch;
}
function dependencias(): Dependencias {
  const e = configEnvia(), r = configR2(undefined, 'COMPROBANTES');
  return { admin: clienteServicio(), envia: e ? clienteEnvia(e) : null, r2: r ? clienteR2(r) : null, fetchFn: fetch };
}

interface Reserva {
  envio: string; folio: string; piezas: number; subtotal: number;
  contacto: { nombre: string; telefono: string; correo?: string | null };
  entrega: { carrier: string; servicio: string; referencias?: string; direccion_envio: { calle: string; numero?: string; colonia: string; ciudad: string; estado: string; cp: string } };
}

export async function manejar(req: Request, d: Dependencias = dependencias()): Promise<Response> {
  const cors = manejarCors(req); if (cors) return cors;
  const enc = encabezadosCors(req);
  try {
    if (req.method !== 'POST') throw new ErrorHttp(405, 'metodo_no_permitido');
    const usuario = await exigirPanel(req, ['duena', 'ayudante'], d.admin);
    await exigirLimite(d.admin, `usuario:${usuario.id}:envios-guia`, 60, 20);
    const c = await leerJson(req, Cuerpo, 1024);

    if (c.accion === 'etiqueta') {
      const { data: env } = await d.admin.from('envios').select('etiqueta_clave, etiqueta_url')
        .eq('pedido_id', c.pedido).eq('proveedor', 'envia').eq('estado', 'guia_generada').limit(1).maybeSingle();
      if (!env) {
        // La guía pudo avanzar de estado (en camino, entregado): se busca la más reciente con etiqueta
        const { data: otra } = await d.admin.from('envios').select('etiqueta_clave, etiqueta_url')
          .eq('pedido_id', c.pedido).eq('proveedor', 'envia').not('guia', 'is', null).order('creado_en', { ascending: false }).limit(1).maybeSingle();
        if (!otra) throw new ErrorHttp(404, 'sin_guia', 'Este pedido todavía no tiene guía.');
        return json({ url: otra.etiqueta_clave && d.r2 ? await d.r2.firmarGet(otra.etiqueta_clave, 300) : otra.etiqueta_url }, 200, enc);
      }
      return json({ url: env.etiqueta_clave && d.r2 ? await d.r2.firmarGet(env.etiqueta_clave, 300) : env.etiqueta_url }, 200, enc);
    }

    if (!d.envia) throw new ErrorHttp(503, 'envia_sin_configurar', 'Falta conectar Envia.com.');
    const { data: res, error: er } = await d.admin.rpc('envio_reservar_guia', { p_pedido: c.pedido, p_usuario: usuario.id });
    if (er) errorDeBd(er, ERRORES, 'envio_reservar_guia');
    const r = res as Reserva;

    try {
      const { data: cfg, error: ec } = await d.admin.from('config_tienda').select('envio_origen, envio_peso_par_kg, envio_caja_cm').single();
      if (ec || !cfg) throw new Error('config_tienda: ' + ec?.message);
      const dir = r.entrega.direccion_envio;
      const destino: Direccion = {
        name: r.contacto.nombre, phone: r.contacto.telefono, email: r.contacto.correo || undefined,
        street: dir.calle, number: dir.numero || 'S/N', district: dir.colonia, city: dir.ciudad, state: dir.estado,
        postalCode: dir.cp, country: 'MX', reference: r.entrega.referencias,
      };
      const guia = await d.envia.generar(r.entrega.carrier, r.entrega.servicio, cfg.envio_origen as Direccion, destino,
        { piezas: r.piezas, pesoParKg: Number(cfg.envio_peso_par_kg), caja: cfg.envio_caja_cm, valorDeclarado: Number(r.subtotal) });

      // El PDF trae nombre y domicilio: va al bucket PRIVADO. Si falla, se conserva el enlace de Envia.
      let clave: string | null = null;
      if (d.r2 && guia.etiqueta) {
        try {
          const pdf = new Uint8Array(await (await d.fetchFn(guia.etiqueta, { signal: AbortSignal.timeout(10_000) })).arrayBuffer());
          if (pdf.length > 0 && pdf.length < 5_000_000 && new TextDecoder().decode(pdf.slice(0, 5)) === '%PDF-') {
            clave = `guias/${r.folio}-${crypto.randomUUID()}.pdf`;
            await d.r2.subir(clave, pdf, 'application/pdf');
          }
        } catch (e) { console.error('guia_r2', e instanceof Error ? e.message : String(e)); clave = null; }
      }
      const { error: eg } = await d.admin.rpc('envio_guardar_guia', {
        p_envio: r.envio, p_usuario: usuario.id,
        p_datos: { guia: guia.guia, url_rastreo: guia.urlRastreo, costo: guia.costo, id_externo: guia.idExterno, etiqueta_clave: clave, etiqueta_url: guia.etiqueta },
      });
      if (eg) throw new Error('envio_guardar_guia: ' + eg.message);
      const url = clave && d.r2 ? await d.r2.firmarGet(clave, 300) : guia.etiqueta;
      return json({ guia: guia.guia, url_rastreo: guia.urlRastreo, etiqueta: url, costo: guia.costo }, 200, enc);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('envia_guia', msg);
      await d.admin.rpc('envio_marcar_error', { p_envio: r.envio, p_error: msg });
      // Ojo: si Envia sí compró la guía y falló guardar, queda registrado el error para revisarlo en Envia.
      throw new ErrorHttp(502, 'envia_no_disponible', 'Envia.com no generó la guía. Revisa tu saldo en Envia o inténtalo en unos minutos.');
    }
  } catch (e) {
    return respuestaDeError(e, enc);
  }
}
