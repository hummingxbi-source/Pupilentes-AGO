// Pedidos de la tienda (Fase 3). Todo pasa por Edge Functions; el navegador nunca fija precios ni stock.
import { llamarFuncion } from './api';
import { supabase } from './supabase';

/** Tarifas de entrega públicas (vista `entregas_publicas`). El costo real lo vuelve a calcular el servidor. */
export async function cargarEntregas() {
  const { data, error } = await supabase.from('entregas_publicas').select('tipo, zona, costo, detalle, orden').order('orden').abortSignal(AbortSignal.timeout(8000));
  if (error) throw error;
  return data.map((t) => ({ ...t, costo: Number(t.costo) }));
}

export const crearPedido = (datos) => llamarFuncion('pedidos-crear', { cuerpo: datos, señal: AbortSignal.timeout(25000) });
export const rastrearPorToken = (token) => llamarFuncion('pedidos-rastrear', { cuerpo: { token }, señal: AbortSignal.timeout(10000) });
export const rastrearPorFolio = (folio, tel4, turnstile) => llamarFuncion('pedidos-rastrear', { cuerpo: { folio, tel4, turnstile }, señal: AbortSignal.timeout(10000) });
export const avisarPorWhatsapp = (token) => llamarFuncion('comprobantes-subir', { cuerpo: { modo: 'whatsapp', token } });

/** Sube el comprobante directo a R2 con una URL firmada y luego el servidor revisa el archivo. */
export async function subirComprobante(token, archivo) {
  const tipo = archivo.type === 'image/jpg' ? 'image/jpeg' : archivo.type;
  if (archivo.size > 5 * 1024 * 1024) throw new Error('El archivo pesa más de 5 MB.');
  const { clave, url } = await llamarFuncion('comprobantes-subir', { cuerpo: { modo: 'firmar', token, tipo } });
  const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': tipo }, body: archivo });
  if (!r.ok) throw new Error('No se pudo subir el archivo. Inténtalo otra vez.');
  return llamarFuncion('comprobantes-subir', { cuerpo: { modo: 'confirmar', token, clave } });
}

export const esToken = (t) => /^[0-9a-f]{64}$/.test(t || '');

// Lo que ve la clienta de cada estado del pedido (máquina de estados en SQL, §3.3)
export const ESTADO_CLIENTA = {
  pendiente_pago: { titulo: 'Esperando tu pago', paso: 0 },
  pendiente_validacion: { titulo: 'Revisando tu transferencia', paso: 0 },
  pagado: { titulo: 'Pago confirmado', paso: 1 },
  preparando: { titulo: 'Preparando tu pedido', paso: 2 },
  enviado: { titulo: 'En camino', paso: 3 },
  entregado: { titulo: 'Entregado', paso: 4 },
  expirado: { titulo: 'El apartado venció', fin: true },
  cancelado: { titulo: 'Pedido cancelado', fin: true },
  pagado_sin_stock: { titulo: 'Recibimos tu pago, pero se agotó', fin: true },
  reembolsado: { titulo: 'Te devolvimos tu dinero', fin: true },
  contracargo: { titulo: 'Pago en aclaración', fin: true },
};
export const PASOS_CLIENTA = ['Pago', 'Confirmado', 'Preparando', 'En camino', 'Entregado'];
