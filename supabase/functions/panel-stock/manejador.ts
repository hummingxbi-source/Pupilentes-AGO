// POST /functions/v1/panel-stock — ajustes de inventario desde el panel (Fase 2).
// Solo la dueña, con MFA (aal2). ARQUITECTURA §6.2.
//
//   { accion: "previsualizar", filas: [{ sku, nuevo? , delta? }] }
//      → cómo quedaría cada SKU, sin tocar nada, + un `lote` para aplicar
//   { accion: "aplicar", lote, motivo, nota?, filas: [{ sku, nuevo?, delta?, esperado? }] }
//      → aplica todo o nada con panel_ajustar_stock (SQL). Si el stock cambió desde la
//        vista previa (`esperado`), responde 409 con la lista de problemas.

import { clienteServicio, exigirPanel } from '../_shared/auth.ts';
import { encabezadosCors, manejarCors } from '../_shared/cors.ts';
import { ErrorHttp, json, respuestaDeError } from '../_shared/http.ts';
import { exigirLimite } from '../_shared/limite.ts';
import { leerJson, z } from '../_shared/validar.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

const Sku = z.string().regex(/^[A-Z0-9]+(-[A-Z0-9]+)*$/).max(64);
const Fila = z.object({
  sku: Sku,
  nuevo: z.number().int().min(0).max(10000).optional(),
  delta: z.number().int().min(-10000).max(10000).refine((d) => d !== 0).optional(),
  esperado: z.number().int().min(0).max(10000).optional(),
}).refine((f) => (f.nuevo === undefined) !== (f.delta === undefined), 'indica nuevo o delta (uno)');
const Cuerpo = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('previsualizar'), filas: z.array(Fila).min(1).max(2000) }),
  z.object({
    accion: z.literal('aplicar'), filas: z.array(Fila).min(1).max(2000),
    lote: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/),
    motivo: z.enum(['ajuste', 'devolucion', 'conciliacion']),
    nota: z.string().max(300).optional(),
  }),
]);

export async function manejar(req: Request, admin: SupabaseClient = clienteServicio()): Promise<Response> {
  const cors = manejarCors(req); if (cors) return cors;
  const enc = encabezadosCors(req);
  try {
    if (req.method !== 'POST') throw new ErrorHttp(405, 'metodo_no_permitido');
    const usuario = await exigirPanel(req, ['duena'], admin);
    await exigirLimite(admin, `usuario:${usuario.id}:panel-stock`, 60, 60);
    const cuerpo = await leerJson(req, Cuerpo, 512_000);

    const skus = [...new Set(cuerpo.filas.map((f) => f.sku))];
    if (skus.length !== cuerpo.filas.length) throw new ErrorHttp(400, 'sku_repetido', 'Cada SKU debe aparecer una sola vez.');

    if (cuerpo.accion === 'previsualizar') {
      const actuales = new Map<string, { stock: number; stock_reservado: number }>();
      for (let i = 0; i < skus.length; i += 200) {
        const { data, error } = await admin.from('variantes').select('sku, stock, stock_reservado').in('sku', skus.slice(i, i + 200));
        if (error) throw new Error('variantes: ' + error.message);
        for (const v of data ?? []) actuales.set(v.sku, v);
      }
      const filas = cuerpo.filas.map((f) => {
        const a = actuales.get(f.sku);
        if (!a) return { sku: f.sku, error: 'sku_no_existe' };
        const nuevo = f.nuevo ?? a.stock + (f.delta ?? 0);
        const error = nuevo < 0 ? 'cantidad_invalida' : nuevo < a.stock_reservado ? 'debajo_de_apartado' : undefined;
        return { sku: f.sku, actual: a.stock, apartado: a.stock_reservado, nuevo, cambio: nuevo - a.stock, ...(error ? { error } : {}) };
      });
      return json({ lote: crypto.randomUUID(), filas, cambios: filas.filter((f) => 'cambio' in f && f.cambio && !('error' in f)).length, errores: filas.filter((f) => 'error' in f).length }, 200, enc);
    }

    const { data, error } = await admin.rpc('panel_ajustar_stock', {
      p_filas: cuerpo.filas, p_motivo: cuerpo.motivo, p_lote: cuerpo.lote, p_usuario: usuario.id, p_nota: cuerpo.nota ?? null,
    });
    if (error) {
      if (error.message === 'ajuste_con_problemas') {
        let problemas: unknown = [];
        try { problemas = JSON.parse(error.details ?? '[]'); } catch { /* detalle ilegible */ }
        return json({ error: 'conflicto', mensaje: 'No se aplicó nada: revisa estas filas y vuelve a previsualizar.', problemas }, 409, enc);
      }
      if (error.message === 'lote_ya_aplicado') return json({ error: 'lote_ya_aplicado', mensaje: 'Ese ajuste ya se había aplicado.' }, 409, enc);
      throw new Error('panel_ajustar_stock: ' + error.message);
    }
    return json(data, 200, enc);
  } catch (e) {
    return respuestaDeError(e, enc);
  }
}
