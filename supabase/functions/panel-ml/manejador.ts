// POST /functions/v1/panel-ml — Mercado Libre desde el panel (Fase 5). Sesión con MFA; todo es de la dueña
// salvo "estado" (también la ayudante).
//   { accion: "estado" }                                → cuenta conectada, sincronización y vínculos
//   { accion: "conectar" }                              → URL de autorización de ML (con `state` de un solo uso)
//   { accion: "callback", code, state }                 → canjea el código por tokens (van a Vault)
//   { accion: "publicaciones", offset? }                → sus publicaciones en ML (con variaciones, SKU y Full)
//   { accion: "vincular", item, variacion?, sku, logistica }   → liga una publicación/variación a nuestra variante
//   { accion: "desvincular", publicacion }
//   { accion: "sincronizacion", activa }               → publicar nuestro stock en ML (nace apagada)
//   { accion: "desconectar" }

import { clienteServicio, exigirPanel, type RolPanel } from '../_shared/auth.ts';
import { encabezadosCors, manejarCors } from '../_shared/cors.ts';
import { ErrorHttp, errorDeBd, json, respuestaDeError } from '../_shared/http.ts';
import { exigirLimite } from '../_shared/limite.ts';
import { clienteML, configML, ErrorML, tokenVigente, type ClienteML } from '../_shared/ml.ts';
import { leerJson, z } from '../_shared/validar.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

const Item = z.string().regex(/^ML[A-Z][0-9]{4,20}$/);
const Cuerpo = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('estado') }),
  z.object({ accion: z.literal('conectar') }),
  z.object({ accion: z.literal('callback'), code: z.string().regex(/^[A-Za-z0-9_-]{4,200}$/), state: z.string().regex(/^[0-9a-f]{64}$/) }),
  z.object({ accion: z.literal('publicaciones'), offset: z.number().int().min(0).max(5000).optional() }),
  z.object({ accion: z.literal('vincular'), item: Item, variacion: z.string().regex(/^[0-9]{1,20}$/).nullable().optional(),
    sku: z.string().regex(/^[A-Z0-9]+(-[A-Z0-9]+)*$/).max(64), logistica: z.enum(['propia', 'full']), titulo: z.string().max(200).optional() }),
  z.object({ accion: z.literal('desvincular'), publicacion: z.string().uuid() }),
  z.object({ accion: z.literal('sincronizacion'), activa: z.boolean() }),
  z.object({ accion: z.literal('desconectar') }),
]);
const ROLES: Record<z.infer<typeof Cuerpo>['accion'], RolPanel[]> = {
  estado: ['duena', 'ayudante'], conectar: ['duena'], callback: ['duena'], publicaciones: ['duena'], vincular: ['duena'],
  desvincular: ['duena'], sincronizacion: ['duena'], desconectar: ['duena'],
};
const ERRORES: Record<string, [number, string]> = {
  sku_no_existe: [404, 'Ese SKU no existe en el catálogo.'],
  publicacion_invalida: [400, 'Publicación inválida.'],
  publicacion_no_existe: [404, 'No encontramos esa vinculación.'],
  ml_no_conectado: [409, 'Primero conecta la cuenta de Mercado Libre.'],
};

export interface Dependencias { admin: SupabaseClient; ml: ClienteML | null }
function dependencias(): Dependencias {
  const c = configML();
  return { admin: clienteServicio(), ml: c ? clienteML(c) : null };
}

const skuDe = (x: { seller_custom_field?: string | null; attributes?: { id: string; value_name?: string | null }[] }) =>
  x.seller_custom_field || x.attributes?.find((a) => a.id === 'SELLER_SKU')?.value_name || null;

export async function manejar(req: Request, d: Dependencias = dependencias()): Promise<Response> {
  const cors = manejarCors(req); if (cors) return cors;
  const enc = encabezadosCors(req);
  try {
    if (req.method !== 'POST') throw new ErrorHttp(405, 'metodo_no_permitido');
    const usuario = await exigirPanel(req, ['duena', 'ayudante'], d.admin);
    await exigirLimite(d.admin, `usuario:${usuario.id}:panel-ml`, 60, 60);
    const c = await leerJson(req, Cuerpo, 2048);
    if (!ROLES[c.accion].includes(usuario.rol)) throw new ErrorHttp(403, 'rol_insuficiente', 'Esta acción solo la puede hacer la dueña.');
    if (!d.ml) throw new ErrorHttp(503, 'ml_sin_configurar', 'Falta configurar la app de Mercado Libre (ML_APP_ID, ML_CLIENT_SECRET, ML_REDIRECT_URI).');
    const ml = d.ml;

    switch (c.accion) {
      case 'estado': {
        const { data: tk } = await d.admin.rpc('ml_leer_tokens');
        const t = tk as { cuenta: string; nombre: string | null; estado: string; expira: string } | null;
        const { data: cfg } = await d.admin.from('config_tienda').select('ml_sync_activo, ml_colchon').single();
        const { data: vinc } = await d.admin.from('publicaciones_canal')
          .select('id, id_externo_item, id_externo_variante, logistica, titulo, ultimo_sync, ultimo_publicado, ultimo_error, variante:variantes(sku)')
          .eq('canal', 'ml').eq('activo', true).order('creado_en', { ascending: false }).limit(500);
        return json({
          conectada: t?.estado === 'conectada', requiere_autorizar: t?.estado === 'requiere_autorizar',
          cuenta: t ? { id: t.cuenta, nombre: t.nombre } : null,
          sincronizacion: cfg?.ml_sync_activo ?? false, colchon: cfg?.ml_colchon ?? 0, vinculos: vinc ?? [],
        }, 200, enc);
      }
      case 'conectar': {
        const { data: estado, error } = await d.admin.rpc('oauth_crear_estado', { p_canal: 'ml', p_usuario: usuario.id });
        if (error) throw new Error('oauth_crear_estado: ' + error.message);
        return json({ url: ml.urlAutorizacion(String(estado)) }, 200, enc);
      }
      case 'callback': {
        const { data: valido } = await d.admin.rpc('oauth_consumir_estado', { p_canal: 'ml', p_estado: c.state, p_usuario: usuario.id });
        if (!valido) throw new ErrorHttp(400, 'estado_invalido', 'El enlace de autorización venció o no es tuyo. Vuelve a conectar.');
        let t;
        try { t = await ml.canjearCodigo(c.code); } catch (e) {
          console.error('ml_oauth', e instanceof Error ? e.message : String(e));
          throw new ErrorHttp(502, 'ml_oauth', 'Mercado Libre no aceptó la autorización. Vuelve a intentarlo.');
        }
        const yo = await ml.get('/users/me', t.access_token);
        if (String(yo.id) !== String(t.user_id)) throw new ErrorHttp(502, 'ml_oauth', 'La cuenta de Mercado Libre no coincide.');
        const { error } = await d.admin.rpc('ml_guardar_tokens', {
          p_cuenta: String(yo.id), p_nombre: String(yo.nickname ?? '').slice(0, 120) || null, p_access: t.access_token, p_refresh: t.refresh_token,
          p_expira: new Date(Date.now() + (Number(t.expires_in) || 21600) * 1000).toISOString(),
        });
        if (error) throw new Error('ml_guardar_tokens: ' + error.message);
        await d.admin.from('auditoria_panel').insert({ usuario: usuario.id, accion: 'ml_conectar', tabla: 'integraciones', registro: String(yo.id) });
        return json({ conectada: true, cuenta: { id: String(yo.id), nombre: yo.nickname ?? null } }, 200, enc);
      }
      case 'publicaciones': {
        const t = await tokenVigente(d.admin, ml);
        if (!t) throw new ErrorHttp(409, 'ml_no_conectado', ERRORES.ml_no_conectado[1]);
        const busq = await ml.get(`/users/${t.cuenta}/items/search?offset=${c.offset ?? 0}&limit=50`, t.token);
        const ids = ((busq.results ?? []) as string[]).filter((x) => /^ML[A-Z][0-9]+$/.test(x));
        const items: Record<string, unknown>[] = [];
        for (let i = 0; i < ids.length; i += 20) {
          const lote = await ml.get(`/items?ids=${ids.slice(i, i + 20).join(',')}&attributes=id,title,status,available_quantity,variations,shipping,seller_custom_field,attributes`, t.token);
          for (const x of (lote as unknown as { code: number; body: Record<string, unknown> }[])) if (x.code === 200) items.push(x.body);
        }
        const { data: vinc } = await d.admin.from('publicaciones_canal').select('id, id_externo_item, id_externo_variante, variante:variantes(sku)').eq('canal', 'ml').eq('activo', true);
        const vinculo = (item: string, v: string | null) => (vinc ?? []).find((x) => x.id_externo_item === item && (x.id_externo_variante ?? null) === v);
        interface Fila { item: string; titulo: string; estado: string; logistica: string; variacion: string | null; nombre_variacion: string | null;
          cantidad_ml: number; sku_ml: string | null; vinculo: { id: string; sku?: string } | null }
        const filas = items.flatMap((it): Fila[] => {
          const full = (it.shipping as { logistic_type?: string } | undefined)?.logistic_type === 'fulfillment';
          const vars = (it.variations ?? []) as { id: number; available_quantity?: number; seller_custom_field?: string; attributes?: { id: string; value_name?: string }[]; attribute_combinations?: { value_name?: string }[] }[];
          const base = { item: String(it.id), titulo: String(it.title ?? ''), estado: String(it.status ?? ''), logistica: full ? 'full' : 'propia' };
          if (!vars.length) {
            const v = vinculo(base.item, null);
            return [{ ...base, variacion: null, nombre_variacion: null, cantidad_ml: Number(it.available_quantity ?? 0), sku_ml: skuDe(it as never), vinculo: v ? { id: v.id, sku: (v.variante as { sku?: string } | null)?.sku } : null }];
          }
          return vars.map((x) => {
            const v = vinculo(base.item, String(x.id));
            return { ...base, variacion: String(x.id), nombre_variacion: (x.attribute_combinations ?? []).map((a) => a.value_name).filter(Boolean).join(' · ') || null,
              cantidad_ml: Number(x.available_quantity ?? 0), sku_ml: skuDe(x), vinculo: v ? { id: v.id, sku: (v.variante as { sku?: string } | null)?.sku } : null };
          });
        });
        return json({ filas, total: Number((busq.paging as { total?: number } | undefined)?.total ?? ids.length), offset: c.offset ?? 0 }, 200, enc);
      }
      case 'vincular': {
        const { data, error } = await d.admin.rpc('ml_vincular', {
          p_sku: c.sku, p_item: c.item, p_variacion: c.variacion ?? null, p_logistica: c.logistica, p_titulo: c.titulo ?? null, p_usuario: usuario.id,
        });
        if (error) errorDeBd(error, ERRORES, 'ml_vincular');
        return json({ publicacion: data }, 200, enc);
      }
      case 'desvincular': {
        const { error } = await d.admin.rpc('ml_desvincular', { p_publicacion: c.publicacion, p_usuario: usuario.id });
        if (error) errorDeBd(error, ERRORES, 'ml_desvincular');
        return json({ ok: true }, 200, enc);
      }
      case 'sincronizacion': {
        const { error } = await d.admin.rpc('ml_activar_sync', { p_activo: c.activa, p_usuario: usuario.id });
        if (error) errorDeBd(error, ERRORES, 'ml_activar_sync');
        return json({ sincronizacion: c.activa }, 200, enc);
      }
      case 'desconectar': {
        const { error } = await d.admin.rpc('ml_desconectar', { p_usuario: usuario.id });
        if (error) throw new Error('ml_desconectar: ' + error.message);
        return json({ conectada: false }, 200, enc);
      }
    }
  } catch (e) {
    if (e instanceof ErrorML) { console.error('ml_api', e.message); return respuestaDeError(new ErrorHttp(502, 'ml_no_disponible', 'Mercado Libre no respondió. Inténtalo en un momento.'), enc); }
    return respuestaDeError(e, enc);
  }
}
