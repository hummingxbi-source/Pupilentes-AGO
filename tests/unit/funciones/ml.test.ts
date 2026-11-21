// Pruebas unitarias · Fase 5 · Mercado Libre (API de ML simulada con fetch falso).
import assert from 'node:assert/strict';
import { clienteML, cuerpoStock, publicarStock, resumenOrden, tokenVigente, type ConfigML } from '../../../supabase/functions/_shared/ml.ts';
import { manejar as webhook, procesar, type Dependencias as DepWebhook } from '../../../supabase/functions/webhook-mercadolibre/manejador.ts';
import { manejar as panelML } from '../../../supabase/functions/panel-ml/manejador.ts';
import type { SupabaseClient } from '../../../supabase/functions/_shared/deps.ts';

type Rpc = Record<string, (args: Record<string, unknown>) => unknown>;
const CFG: ConfigML = { appId: '123', secreto: 's', redirect: 'https://tienda/panel/canales', api: 'https://ml.simulado', auth: 'https://auth.simulado' };
function bd({ rpc = {} as Rpc, rol = 'duena' as string | null } = {}) {
  const llamadas: { rpc: string; args: Record<string, unknown> }[] = [];
  const admin = {
    auth: { getClaims: async (t: string) => t === 'jwt-valido' ? { data: { claims: { sub: 'u-1', role: 'authenticated', session_id: 's-1', aal: 'aal2' } }, error: null } : { data: null, error: { message: 'x' } } },
    from: (tabla: string) => {
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'order', 'limit', 'insert']) q[m] = () => q;
      q.maybeSingle = async () => ({ data: tabla === 'perfiles_panel' ? (rol ? { rol } : null) : null, error: null });
      q.single = async () => ({ data: null, error: null });
      q.then = (ok: (v: unknown) => unknown) => ok({ data: [], error: null });
      return q;
    },
    rpc: async (nombre: string, args: Record<string, unknown>) => {
      if (nombre === 'sesion_vigente') return { data: true, error: null };   // H16: sesión viva
      llamadas.push({ rpc: nombre, args });
      if (nombre === 'consumir_limite') return { data: true, error: null };
      const r = rpc[nombre]?.(args);
      return r && typeof r === 'object' && 'error' in (r as object) ? r : { data: r ?? null, error: null };
    },
  } as unknown as SupabaseClient;
  return { admin, hizo: (n: string) => llamadas.filter((l) => l.rpc === n) };
}
function mlFalso(rutas: Record<string, (init: RequestInit) => Response>) {
  const vistos: { metodo: string; ruta: string; cuerpo: unknown }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    const u = new URL(url); const ruta = u.pathname + u.search; const metodo = init.method ?? 'GET';
    const cuerpo = typeof init.body === 'string' ? JSON.parse(init.body) : init.body ? String(init.body) : null;
    vistos.push({ metodo, ruta, cuerpo });
    const k = Object.keys(rutas).find((r) => `${metodo} ${ruta}`.startsWith(r));
    return k ? rutas[k](init) : Response.json({ message: 'not found' }, { status: 404 });
  }) as typeof fetch;
  return { ml: clienteML(CFG, f), vistos };
}
const TOKENS = (minutos: number) => ({ cuenta: '777', nombre: 'T', estado: 'conectada', access: 'A1', refresh: 'R1', expira: new Date(Date.now() + minutos * 60_000).toISOString() });
const post = (cuerpo: unknown, enc: Record<string, string> = {}) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(cuerpo), headers: { 'content-type': 'application/json', ...enc } });

// ------------------------------------------------------------------------------------ utilidades
Deno.test('cuerpoStock: con variaciones manda TODAS (las ajenas solo con su id, para que ML no las borre)', () => {
  assert.deepEqual(cuerpoStock([1, 2, 3], new Map([['2', 7]])), { variations: [{ id: 1 }, { id: 2, available_quantity: 7 }, { id: 3 }] });
  assert.deepEqual(cuerpoStock(null, new Map(), 4), { available_quantity: 4 });
});

Deno.test('resumenOrden: toma ítem, variación y cantidad; descarta lo raro', () => {
  const r = resumenOrden({ id: 55, status: 'paid', order_items: [
    { item: { id: 'MLM123', variation_id: 9 }, quantity: 2 }, { item: { id: 'MLM124', variation_id: null }, quantity: 1 }, { item: { id: '<script>' }, quantity: 1 }] });
  assert.deepEqual(r, { id: '55', status: 'paid', items: [{ item_id: 'MLM123', variation_id: '9', cantidad: 2 }, { item_id: 'MLM124', variation_id: '', cantidad: 1 }] });
});

// ------------------------------------------------------------------------------------ tokenVigente
Deno.test('tokenVigente: usa el vigente; cerca de vencer refresca UNA vez y guarda el nuevo; si ML rechaza, pide reautorizar', async () => {
  const { ml, vistos } = mlFalso({ 'POST /oauth/token': () => Response.json({ access_token: 'A2', refresh_token: 'R2', expires_in: 21600, user_id: 777 }) });
  const vigente = bd({ rpc: { ml_leer_tokens: () => TOKENS(120) } });
  assert.equal((await tokenVigente(vigente.admin, ml))?.token, 'A1');
  assert.equal(vistos.length, 0, 'no refresca si le quedan horas');

  const casi = bd({ rpc: { ml_leer_tokens: () => TOKENS(3), ml_tomar_refresco: () => true } });
  assert.equal((await tokenVigente(casi.admin, ml))?.token, 'A2');
  assert.equal(String(vistos[0].cuerpo).includes('refresh_token=R1'), true, 'usa el último refresh token');
  assert.equal(casi.hizo('ml_guardar_tokens')[0].args.p_refresh, 'R2', 'guarda el refresh nuevo (el viejo ya no sirve)');

  const { ml: rechaza } = mlFalso({ 'POST /oauth/token': () => Response.json({ error: 'invalid_grant' }, { status: 400 }) });
  const muerto = bd({ rpc: { ml_leer_tokens: () => TOKENS(3), ml_tomar_refresco: () => true } });
  assert.equal(await tokenVigente(muerto.admin, rechaza), null);
  assert.equal(muerto.hizo('ml_requiere_autorizar').length, 1);
});

// ------------------------------------------------------------------------------------ webhook
Deno.test('webhook-mercadolibre: responde 200 de inmediato; avisos de otra app o de otro tópico se descartan sin procesar', async () => {
  const b = bd();
  const tareas: Promise<unknown>[] = [];
  const d: DepWebhook = { admin: b.admin, config: CFG, ml: mlFalso({}).ml, enSegundoPlano: (p) => tareas.push(p) };
  const otra = await webhook(post({ resource: '/orders/1', user_id: 777, topic: 'orders_v2', application_id: 999 }), d);
  assert.equal(otra.status, 200);
  const tema = await webhook(post({ resource: '/items/MLM1', user_id: 777, topic: 'items', application_id: 123 }), d);
  assert.equal(tema.status, 200);
  assert.equal(tareas.length, 0);
  assert.equal((await webhook(new Request('http://x', { method: 'POST', body: '{no es json' }), d)).status, 200);
  const nuestro = await webhook(post({ _id: 'n1', resource: '/orders/1', user_id: 777, topic: 'orders_v2', application_id: 123 }), d);
  assert.equal(nuestro.status, 200);
  assert.equal(tareas.length, 1, 'el trabajo va en segundo plano (ML exige < 500 ms)');
  await Promise.allSettled(tareas);
});

Deno.test('procesar: consulta la orden con nuestro token; cuenta ajena o aviso repetido no mueven stock', async () => {
  const orden = { id: 1, status: 'paid', order_items: [{ item: { id: 'MLM100', variation_id: null }, quantity: 1 }] };
  const { ml, vistos } = mlFalso({ 'GET /orders/1': () => Response.json(orden) });
  const b = bd({ rpc: { registrar_evento: () => true, ml_leer_tokens: () => TOKENS(120), ml_registrar_orden: () => ({ movimientos: 1 }) } });
  const d: DepWebhook = { admin: b.admin, config: CFG, ml, enSegundoPlano: () => {} };
  assert.equal(await procesar(d, { _id: 'n1', resource: '/orders/1', user_id: 777 }), 'movimientos:1');
  assert.equal(vistos[0].ruta, '/orders/1');
  assert.equal((b.hizo('ml_registrar_orden')[0].args.p_orden as { items: unknown[] }).items.length, 1);
  assert.equal(b.hizo('registrar_evento')[0].args.p_id_evento, 'n1', 'idempotencia por _id del aviso');

  const ajena = bd({ rpc: { registrar_evento: () => true, ml_leer_tokens: () => TOKENS(120) } });
  assert.equal(await procesar({ ...d, admin: ajena.admin }, { _id: 'n2', resource: '/orders/1', user_id: 1 }), 'cuenta_ajena');
  assert.equal(ajena.hizo('ml_registrar_orden').length, 0);
  const rep = bd({ rpc: { registrar_evento: () => false } });
  assert.equal(await procesar({ ...d, admin: rep.admin }, { _id: 'n1', resource: '/orders/1', user_id: 777 }), 'repetido');
});

// ------------------------------------------------------------------------------------ publicarStock
Deno.test('publicarStock: con variaciones lee el ítem y manda todas; sin variaciones manda available_quantity', async () => {
  const { ml, vistos } = mlFalso({
    'GET /items/MLM200': () => Response.json({ id: 'MLM200', variations: [{ id: 1 }, { id: 2 }] }),
    'PUT /items/': () => Response.json({}),
  });
  const b = bd({ rpc: { ml_tomar_cola: () => [
    { variante_id: 'v1', disponible: 3, item: 'MLM200', variacion: '2' }, { variante_id: 'v2', disponible: 0, item: 'MLM100', variacion: null }] } });
  const r = await publicarStock(b.admin, ml, 'A1');
  assert.deepEqual(r, { publicadas: 2, fallidas: 0 });
  const put200 = vistos.find((v) => v.metodo === 'PUT' && v.ruta === '/items/MLM200');
  assert.deepEqual(put200?.cuerpo, { variations: [{ id: 1 }, { id: 2, available_quantity: 3 }] });
  assert.deepEqual(vistos.find((v) => v.metodo === 'PUT' && v.ruta === '/items/MLM100')?.cuerpo, { available_quantity: 0 });
  assert.equal((b.hizo('ml_cola_resultados')[0].args.p_resultados as unknown[]).length, 2);
});

// ------------------------------------------------------------------------------------ panel-ml
Deno.test('panel-ml: la ayudante solo ve el estado; un callback con state ajeno o vencido se rechaza', async () => {
  const auth = { Authorization: 'Bearer jwt-valido' };
  const ay = bd({ rol: 'ayudante' });
  assert.equal((await panelML(post({ accion: 'conectar' }, auth), { admin: ay.admin, ml: mlFalso({}).ml })).status, 403);
  assert.equal((await panelML(post({ accion: 'conectar' }), { admin: ay.admin, ml: mlFalso({}).ml })).status, 401);
  const du = bd({ rpc: { oauth_consumir_estado: () => false } });
  const r = await panelML(post({ accion: 'callback', code: 'TG-abc', state: 'a'.repeat(64) }, auth), { admin: du.admin, ml: mlFalso({}).ml });
  assert.equal(r.status, 400);
  const c = bd({ rpc: { oauth_crear_estado: () => 'b'.repeat(64) } });
  const url = (await (await panelML(post({ accion: 'conectar' }, auth), { admin: c.admin, ml: mlFalso({}).ml })).json()).url as string;
  assert.ok(url.startsWith('https://auth.simulado/authorization?response_type=code&client_id=123'));
  assert.ok(url.includes(`state=${'b'.repeat(64)}`));
});
