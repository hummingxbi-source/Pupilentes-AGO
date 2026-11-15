// Envia.com (ARQUITECTURA §5, Fase 4). Sin SDK: REST con el token Bearer de la cuenta.
// Fuente: docs.envia.com (Quickstart, Webhooks Guide) [16]:
//   POST /ship/rate/         una paquetería por petición; data[] = { carrier, service, serviceDescription, deliveryEstimate, totalPrice, currency }
//   POST /ship/generate/     igual que rate + shipment.service; data[0] = { shipmentId, trackingNumber, trackUrl, label (PDF), totalPrice }
//   POST /ship/generaltrack/ { trackingNumbers: [...] } → data[] = { trackingNumber, status, events }
// Sandbox: https://api-test.envia.com · Producción: https://api.envia.com
// ⚠️ Los valores exactos de `status` no están documentados (el ejemplo dice "In transit"): `categoriaEstado`
//    los clasifica por palabras clave y hay que confirmarlos con el sandbox.

export interface ConfigEnvia { token: string; api: string }

export function configEnvia(env: (k: string) => string | undefined = (k) => Deno.env.get(k)): ConfigEnvia | null {
  const token = env('ENVIA_TOKEN');
  if (!token) return null;
  return { token, api: (env('ENVIA_API_URL') || 'https://api-test.envia.com').replace(/\/$/, '') };
}

export interface Direccion {
  name: string; phone: string; street: string; number?: string; district?: string;
  city: string; state: string; postalCode: string; country: string; company?: string; email?: string; reference?: string;
}
export interface Paquete { piezas: number; pesoParKg: number; caja: { length: number; width: number; height: number }; valorDeclarado: number }
export interface Tarifa { carrier: string; servicio: string; descripcion: string | null; entrega: string | null; costo: number }
export interface Guia { guia: string; urlRastreo: string | null; etiqueta: string | null; costo: number; idExterno: string | null }

export class ErrorEnvia extends Error { constructor(readonly estado: number, mensaje: string) { super(mensaje); } }

const paquetes = (p: Paquete) => [{
  type: 'box', content: 'Lentes de contacto cosméticos', amount: 1,
  declaredValue: Math.round(p.valorDeclarado),
  weight: Math.max(0.1, Math.round(p.piezas * p.pesoParKg * 1000) / 1000), weightUnit: 'KG', lengthUnit: 'CM',
  dimensions: p.caja,
}];

export function clienteEnvia(c: ConfigEnvia, fetchFn: typeof fetch = fetch) {
  const llamar = async (ruta: string, cuerpo: unknown, ms = 9000) => {
    const r = await fetchFn(`${c.api}${ruta}`, {
      method: 'POST', body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(ms),
      headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' },
    });
    const datos = await r.json().catch(() => ({})) as { meta?: string; data?: unknown; error?: { message?: string; description?: string } };
    if (!r.ok || datos.meta === 'error' || datos.error) {
      throw new ErrorEnvia(r.status, `Envia ${r.status}: ${datos.error?.message ?? datos.error?.description ?? 'error'}`);
    }
    return Array.isArray(datos.data) ? datos.data as Record<string, unknown>[] : [];
  };
  return {
    /** Cotiza UNA paquetería (Envia no acepta varias por petición). */
    async cotizar(carrier: string, origen: Direccion, destino: Direccion, p: Paquete): Promise<Tarifa[]> {
      const filas = await llamar('/ship/rate/', {
        origin: origen, destination: destino, packages: paquetes(p),
        shipment: { type: 1, carrier }, settings: { currency: 'MXN' },
      }, 8000);
      return filas
        .filter((f) => (f.currency ?? 'MXN') === 'MXN' && Number.isFinite(Number(f.totalPrice)) && Number(f.totalPrice) > 0)
        .map((f) => ({
          carrier: String(f.carrier ?? carrier).toLowerCase(), servicio: String(f.service ?? ''),
          descripcion: f.serviceDescription ? String(f.serviceDescription).slice(0, 120) : null,
          entrega: f.deliveryEstimate ? String(f.deliveryEstimate).slice(0, 80) : null,
          costo: Math.round(Number(f.totalPrice) * 100) / 100,
        }))
        .filter((t) => t.servicio);
    },
    async generar(carrier: string, servicio: string, origen: Direccion, destino: Direccion, p: Paquete): Promise<Guia> {
      const [g] = await llamar('/ship/generate/', {
        origin: origen, destination: destino, packages: paquetes(p),
        shipment: { type: 1, carrier, service: servicio }, settings: { currency: 'MXN', printFormat: 'PDF', printSize: 'STOCK_4X6' },
      }, 20000);
      if (!g?.trackingNumber) throw new ErrorEnvia(502, 'Envia no devolvió número de guía');
      const https = (u: unknown) => (typeof u === 'string' && u.startsWith('https://') ? u : null);
      return {
        guia: String(g.trackingNumber).slice(0, 80), urlRastreo: https(g.trackUrl), etiqueta: https(g.label),
        costo: Number(g.totalPrice) || 0, idExterno: g.shipmentId != null ? String(g.shipmentId).slice(0, 80) : null,
      };
    },
    async rastrear(guia: string): Promise<{ estado: string } | null> {
      const filas = await llamar('/ship/generaltrack/', { trackingNumbers: [guia] }, 4000);
      const f = filas.find((x) => String(x.trackingNumber) === guia) ?? filas[0];
      return f?.status ? { estado: String(f.status).slice(0, 80) } : null;
    },
  };
}

/** Traduce el estado de la paquetería a lo que entiende el pedido (el orden de las reglas importa). */
export function categoriaEstado(estado: string): 'en_camino' | 'entregado' | 'incidencia' | 'sin_cambio' {
  const e = estado.toLowerCase();
  if (/(return|devuel|devoluc|exception|excepci|incid|cancel|lost|perdid|damag|dañad|attempt|intento|undeliver|no entregad|not delivered)/.test(e)) return 'incidencia';
  if (/(out for delivery|en reparto|en ruta de entrega)/.test(e)) return 'en_camino';
  if (/(\bdelivered\b|entregad)/.test(e)) return 'entregado';
  if (/(created|creada|pending|pendiente|label|generad|information|informaci|registr)/.test(e)) return 'sin_cambio';
  if (/(transit|tránsito|transito|camino|picked|recolect|recogid|ruta|shipped|enviado|reparto)/.test(e)) return 'en_camino';
  return 'sin_cambio';
}
