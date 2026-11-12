// Datos del panel desde Supabase, con la sesión de la dueña/ayudante (RLS + MFA aplican).
// Lecturas directas; todo lo que mueve stock pasa por Edge Functions (panel-stock, panel-catalogo).

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { llamarFuncion } from '../lib/api';
import { textoGrad, NEUTRO } from '../lib/tienda';

/** Hook genérico: carga, error y recarga. */
export function useConsulta(fn, deps = []) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });
  const cargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try { setEstado({ datos: await fn(), cargando: false, error: null }); }
    catch (e) { setEstado({ datos: null, cargando: false, error: e.message || String(e) }); }
  }, deps);
  useEffect(() => { cargar(); }, [cargar]);
  return { ...estado, recargar: cargar };
}

const exigir = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

/** Todas las variantes con su tono y producto (inventario y catálogo). */
export async function cargarVariantes() {
  const filas = exigir(await supabase.from('variantes')
    .select('id, sku, duracion, graduacion, precio, stock, stock_reservado, activo, tono:tonos(id, slug, nombre, color, alias, familia, intensidad, descripcion, iris_base, filtro_css, destacado, activo, orden), producto:productos(id, slug, nombre, tipo, alias, descripcion, activo, orden, marca:marcas(nombre))')
    .order('sku').limit(5000));
  return filas.map((v) => ({ ...v, grad: textoGrad(v.graduacion), disponible: Math.max(0, v.stock - v.stock_reservado) }));
}

/** Agrupa variantes por tono (lentes) o producto (accesorios). */
export function agrupar(variantes) {
  const m = new Map();
  for (const v of variantes) {
    const clave = v.tono?.id || v.producto.id;
    if (!m.has(clave)) {
      const t = v.tono;
      m.set(clave, {
        clave, tipo: v.producto.tipo, tono: t, producto: v.producto,
        id: t?.slug || v.producto.slug, nombre: t?.nombre || v.producto.nombre, alias: t?.alias || v.producto.alias || '',
        familia: t?.familia || null, intensidad: t?.intensidad || 1, iris: t?.iris_base || undefined, filtro: t?.filtro_css || 'none',
        activo: (t ? t.activo : true) && v.producto.activo, orden: t?.orden ?? v.producto.orden ?? 0, variantes: [],
      });
    }
    m.get(clave).variantes.push(v);
  }
  return [...m.values()].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
}

export const GRADS_ORDEN = (variantes) => [...new Set(variantes.map((v) => v.grad))].sort((a, b) => (a === NEUTRO ? -1 : b === NEUTRO ? 1 : b - a));

export async function historial(varianteId) {
  return exigir(await supabase.from('movimientos_stock')
    .select('delta, motivo, canal, ref_externa, detalle, creado_en').eq('variante_id', varianteId)
    .order('creado_en', { ascending: false }).limit(30));
}

export async function cargarPedidos() {
  return exigir(await supabase.from('pedidos')
    .select('id, folio, estado, pago_estado, metodo_pago, no_entregar, canal, contacto, subtotal, envio, total, entrega, creado_en, expira_reserva_en, clienta_id, pagos(proveedor, estado, estado_detalle, id_externo, comprobante_clave, creado_en), pedido_items(cantidad, precio_unitario, variante:variantes(sku, graduacion, duracion, tono:tonos(nombre), producto:productos(nombre)))')
    .order('creado_en', { ascending: false }).limit(300));
}

export async function cargarClientas() {
  return exigir(await supabase.from('clientas')
    .select('id, nombre, telefono, correo, creado_en, pedidos(total, pago_estado, creado_en)')
    .order('creado_en', { ascending: false }).limit(500));
}

// --- Acciones (Edge Functions) ---------------------------------------------------
export const previsualizarStock = (filas) => llamarFuncion('panel-stock', { cuerpo: { accion: 'previsualizar', filas } });
export const aplicarStock = (lote, filas, motivo, nota) => llamarFuncion('panel-stock', { cuerpo: { accion: 'aplicar', lote, filas, motivo, nota: nota || undefined } });
export const revisarCatalogo = (filas) => llamarFuncion('panel-catalogo', { cuerpo: { accion: 'revisar', filas } });
export const aplicarCatalogo = (filas) => llamarFuncion('panel-catalogo', { cuerpo: { accion: 'aplicar', filas } });

// --- Pedidos y alertas (Fase 3) ----------------------------------------------------
/** Acciones sobre un pedido: validar_transferencia, estado, cancelar, reembolsar, comprobante (panel-pedidos). */
export const accionPedido = (cuerpo) => llamarFuncion('panel-pedidos', { cuerpo });
export async function cargarAlertas() { return exigir(await supabase.rpc('panel_alertas')); }
export async function atenderAlerta(id) { return exigir(await supabase.rpc('panel_atender_alerta', { p_id: id })); }
export const ALERTAS = {
  pagado_sin_stock: 'Pagó pero ya no hay stock: reembolsa o cambia el tono',
  monto_distinto: 'Pago con monto distinto al pedido: revisa en Mercado Pago',
  contracargo: 'Contracargo: no entregues este pedido',
  reembolso: 'Mercado Pago registró un reembolso',
  pago_sin_pedido: 'Llegó un pago que no corresponde a ningún pedido',
  webhook_fallido: 'Un aviso de pago no se pudo procesar (se reintenta solo)',
  cron_sin_correr: 'Las tareas automáticas no corren desde hace más de 30 min',
};

// --- Estados de pedido (ARQUITECTURA §3.3) ---------------------------------------
export const ESTADOS_PEDIDO = {
  pendiente_pago: { label: 'Esperando pago', clase: 'revision' },
  pendiente_validacion: { label: 'Pago por validar', clase: 'revision' },
  pagado: { label: 'Pagado · por enviar', clase: 'pagado' },
  preparando: { label: 'Preparando', clase: 'pagado' },
  enviado: { label: 'En camino', clase: 'enviado' },
  entregado: { label: 'Entregado', clase: 'entregado' },
  cancelado: { label: 'Cancelado', clase: '' },
  expirado: { label: 'Expirado', clase: '' },
  pagado_sin_stock: { label: 'Pagado sin stock', clase: 'revision' },
  reembolsado: { label: 'Reembolsado', clase: '' },
  contracargo: { label: 'Contracargo', clase: 'revision' },
};

export const MOTIVOS = { ajuste: 'Ajuste / conteo', devolucion: 'Devolución vendible', conciliacion: 'Conciliación' };
export const ERRORES_STOCK = {
  sku_no_existe: 'Ese SKU no existe',
  debajo_de_apartado: 'Hay pares apartados por pedidos en curso',
  cantidad_invalida: 'Cantidad inválida',
  cambio_mientras_tanto: 'Cambió mientras revisabas (hubo una venta o ajuste)',
  indica_nuevo_o_delta: 'Fila incompleta',
};
