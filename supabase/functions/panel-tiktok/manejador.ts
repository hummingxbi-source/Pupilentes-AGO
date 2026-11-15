// POST /functions/v1/panel-tiktok — TikTok Shop desde el panel (Fase 6). Sesión con MFA; todo es de la dueña
// salvo "estado". Mismas acciones y misma forma de respuesta que panel-ml, para que el panel use una sola pantalla.
//   estado · conectar · callback {code, state} · publicaciones {pagina?} · vincular {item, variacion, sku, logistica}
//   desvincular {publicacion} · sincronizacion {activa} · desconectar

import { clienteServicio, exigirPanel, type RolPanel } from '../_shared/auth.ts';
import { encabezadosCors, manejarCors } from '../_shared/cors.ts';
import { ErrorHttp, errorDeBd, json, respuestaDeError } from '../_shared/http.ts';
import { exigirLimite } from '../_shared/limite.ts';
import { clienteTT, configTT, ErrorTT, tokenVigenteTT, type ClienteTT } from '../_shared/tiktok.ts';
import { leerJson, z } from '../_shared/validar.ts';
import type { SupabaseClient } from '../_shared/deps.ts';

const Id = z.string().regex(/^[0-9]{4,30}$/);
const Cuerpo = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('estado') }),
  z.object({ accion: z.literal('conectar') }),
  z.object({ accion: z.literal('callback'), code: z.string().regex(/^[A-Za-z0-9_.-]{4,300}$/), state: z.string().regex(/^[0-9a-f]{64}$/) }),
  z.object({ accion: z.literal('publicaciones'), pagina: z.string().max(200).optional() }),
  z.object({ accion: z.literal('vincular'), item: Id, variacion: Id, sku: z.string().regex(/^[A-Z0-9]+(-[A-Z0-9]+)*$/).max(64),
    logistica: z.enum(['propia', 'full']), titulo: z.string().max(200).optional() }),
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
  publicacion_invalida: [400, 'Producto o SKU de TikTok inválido.'],
  publicacion_no_existe: [404, 'No encontramos esa vinculación.'],
  tt_no_conectado: [409, 'Primero conecta la tienda de TikTok.'],
};

export interface Dependencias { admin: SupabaseClient; tt: ClienteTT | null }
function dependencias(): Dependencias {
  const c = configTT();
  return { admin: clienteServicio(), tt: c ? clienteTT(c) : null };
}

export async function manejar(req: Request, d: Dependencias = dependencias()): Promise<Response> {
  const cors = manejarCors(req); if (cors) return cors;
  const enc = encabezadosCors(req);
  try {
    if (req.method !== 'POST') throw new ErrorHttp(405, 'metodo_no_permitido');
    const usuario = await exigirPanel(req, ['duena', 'ayudante'], d.admin);
    await exigirLimite(d.admin, `usuario:${usuario.id}:panel-tiktok`, 60, 60);
    const c = await leerJson(req, Cuerpo, 2048);
    if (!ROLES[c.accion].includes(usuario.rol)) throw new ErrorHttp(403, 'rol_insuficiente', 'Esta acción solo la puede hacer la dueña.');
    if (!d.tt) throw new ErrorHttp(503, 'tiktok_sin_configurar', 'Falta configurar la app de TikTok Shop (TT_APP_KEY, TT_APP_SECRET, TT_SERVICE_ID).');
    const tt = d.tt;

    switch (c.accion) {
      case 'estado': {
        const { data: tk } = await d.admin.rpc('tt_leer_tokens');
        const t = tk as { cuenta: string; nombre: string | null; estado: string } | null;
        const { data: cfg } = await d.admin.from('config_tienda').select('tt_sync_activo, tt_colchon').single();
        const { data: vinc } = await d.admin.from('publicaciones_canal')
          .select('id, id_externo_item, id_externo_variante, logistica, titulo, ultimo_sync, ultimo_publicado, ultimo_error, variante:variantes(sku)')
          .eq('canal', 'tiktok').eq('activo', true).order('creado_en', { ascending: false }).limit(500);
        return json({
          conectada: t?.estado === 'conectada', requiere_autorizar: t?.estado === 'requiere_autorizar',
          cuenta: t ? { id: t.cuenta, nombre: t.nombre } : null,
          sincronizacion: cfg?.tt_sync_activo ?? false, colchon: cfg?.tt_colchon ?? 0, vinculos: vinc ?? [],
        }, 200, enc);
      }
      case 'conectar': {
        const { data: estado, error } = await d.admin.rpc('oauth_crear_estado', { p_canal: 'tiktok', p_usuario: usuario.id });
        if (error) throw new Error('oauth_crear_estado: ' + error.message);
        return json({ url: tt.urlAutorizacion(String(estado)) }, 200, enc);
      }
      case 'callback': {
        const { data: valido } = await d.admin.rpc('oauth_consumir_estado', { p_canal: 'tiktok', p_estado: c.state, p_usuario: usuario.id });
        if (!valido) throw new ErrorHttp(400, 'estado_invalido', 'El enlace de autorización venció o no es tuyo. Vuelve a conectar.');
        let t;
        try { t = await tt.canjearCodigo(c.code); } catch (e) {
          console.error('tt_oauth', e instanceof Error ? e.message : String(e));
          throw new ErrorHttp(502, 'tt_oauth', 'TikTok no aceptó la autorización. Vuelve a intentarlo.');
        }
        const tiendas = await tt.get('/authorization/202309/shops', t.access_token, null);
        const tienda = ((tiendas.shops ?? []) as { id: string; name?: string; cipher: string }[])[0];
        if (!tienda?.id || !tienda.cipher) throw new ErrorHttp(502, 'tt_oauth', 'La cuenta no tiene una tienda de TikTok Shop autorizada.');
        const { error } = await d.admin.rpc('tt_guardar_tokens', {
          p_cuenta: String(tienda.id), p_nombre: String(tienda.name ?? t.seller_name ?? '').slice(0, 120) || null,
          p_access: t.access_token, p_refresh: t.refresh_token, p_expira: new Date(Number(t.access_token_expire_in) * 1000).toISOString(), p_cipher: tienda.cipher,
        });
        if (error) throw new Error('tt_guardar_tokens: ' + error.message);
        await d.admin.from('auditoria_panel').insert({ usuario: usuario.id, accion: 'tt_conectar', tabla: 'integraciones', registro: String(tienda.id) });
        return json({ conectada: true, cuenta: { id: String(tienda.id), nombre: tienda.name ?? null } }, 200, enc);
      }
      case 'publicaciones': {
        const t = await tokenVigenteTT(d.admin, tt);
        if (!t) throw new ErrorHttp(409, 'tt_no_conectado', ERRORES.tt_no_conectado[1]);
        const r = await tt.post('/product/202309/products/search', t.token, t.cipher, {}, { page_size: '50', ...(c.pagina ? { page_token: c.pagina } : {}) });
        const { data: vinc } = await d.admin.from('publicaciones_canal').select('id, id_externo_item, id_externo_variante, variante:variantes(sku)').eq('canal', 'tiktok').eq('activo', true);
        const filas = ((r.products ?? []) as { id: string; title?: string; status?: string; skus?: { id: string; seller_sku?: string; inventory?: { quantity?: number }[]; sales_attributes?: { value_name?: string }[] }[] }[])
          .flatMap((p) => (p.skus ?? []).map((s) => {
            const v = (vinc ?? []).find((x) => x.id_externo_item === String(p.id) && x.id_externo_variante === String(s.id));
            return {
              item: String(p.id), variacion: String(s.id), titulo: String(p.title ?? ''), estado: String(p.status ?? ''), logistica: 'propia',
              nombre_variacion: (s.sales_attributes ?? []).map((a) => a.value_name).filter(Boolean).join(' · ') || null,
              cantidad_canal: (s.inventory ?? []).reduce((a, i) => a + Number(i.quantity ?? 0), 0), sku_canal: s.seller_sku || null,
              vinculo: v ? { id: v.id, sku: (v.variante as { sku?: string } | null)?.sku } : null,
            };
          }));
        return json({ filas, siguiente: r.next_page_token ?? null, total: Number(r.total_count ?? filas.length) }, 200, enc);
      }
      case 'vincular': {
        const { data, error } = await d.admin.rpc('tt_vincular', {
          p_sku: c.sku, p_item: c.item, p_variacion: c.variacion, p_logistica: c.logistica, p_titulo: c.titulo ?? null, p_usuario: usuario.id,
        });
        if (error) errorDeBd(error, ERRORES, 'tt_vincular');
        return json({ publicacion: data }, 200, enc);
      }
      case 'desvincular': {
        const { error } = await d.admin.rpc('tt_desvincular', { p_publicacion: c.publicacion, p_usuario: usuario.id });
        if (error) errorDeBd(error, ERRORES, 'tt_desvincular');
        return json({ ok: true }, 200, enc);
      }
      case 'sincronizacion': {
        const { error } = await d.admin.rpc('tt_activar_sync', { p_activo: c.activa, p_usuario: usuario.id });
        if (error) errorDeBd(error, ERRORES, 'tt_activar_sync');
        return json({ sincronizacion: c.activa }, 200, enc);
      }
      case 'desconectar': {
        const { error } = await d.admin.rpc('tt_desconectar', { p_usuario: usuario.id });
        if (error) throw new Error('tt_desconectar: ' + error.message);
        return json({ conectada: false }, 200, enc);
      }
    }
  } catch (e) {
    if (e instanceof ErrorTT) { console.error('tt_api', e.message); return respuestaDeError(new ErrorHttp(502, 'tt_no_disponible', 'TikTok Shop no respondió. Inténtalo en un momento.'), enc); }
    return respuestaDeError(e, enc);
  }
}
