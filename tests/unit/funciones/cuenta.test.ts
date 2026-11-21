// Pruebas de la Fase 7: Edge Function `cuenta` y la sesión/puntos en `pedidos-crear`.
// BD, Mercado Pago y Turnstile se simulan (la lógica de puntos se prueba en pgTAP 09_cuenta).
import assert from 'node:assert/strict';
import { manejar as cuenta } from '../../../supabase/functions/cuenta/manejador.ts';
import { manejar as crear, type Dependencias } from '../../../supabase/functions/pedidos-crear/manejador.ts';
import { clienteMP } from '../../../supabase/functions/_shared/mercadopago.ts';
import type { SupabaseClient } from '../../../supabase/functions/_shared/deps.ts';

type Rpc = Record<string, (a: Record<string, unknown>) => unknown>;
function bd({ rpc = {} as Rpc, limite = true } = {}) {
  const llamadas: { rpc: string; args: Record<string, unknown> }[] = [];
  const admin = {
    auth: {
      getClaims: async (t: string) => t === 'jwt-clienta'
        ? { data: { claims: { sub: 'u-clienta', email: 'ana@cuenta.mx', role: 'authenticated', aal: 'aal1' } }, error: null }
        : { data: null, error: { message: 'jwt inválido' } },
    },
    rpc: async (nombre: string, args: Record<string, unknown>) => {
      if (nombre === 'sesion_vigente') return { data: true, error: null };   // H16: sesión viva
      llamadas.push({ rpc: nombre, args });
      if (nombre === 'consumir_limite') return { data: limite, error: null };
      const r = rpc[nombre]?.(args);
      return r && typeof r === 'object' && 'error' in (r as object) ? r : { data: r ?? null, error: null };
    },
  } as unknown as SupabaseClient;
  return { admin, llamadas, hizo: (n: string) => llamadas.filter((l) => l.rpc === n) };
}
const post = (cuerpo: unknown, token?: string) => new Request('http://x', {
  method: 'POST', body: JSON.stringify(cuerpo),
  headers: { 'content-type': 'application/json', apikey: 'sb_publishable_x', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
});

// ---------------------------------------------------------------------------- cuenta
Deno.test('cuenta: sin sesión 401; con la llave publicable como "token" 401; sesión inválida 401', async () => {
  const b = bd();
  assert.equal((await cuenta(post({ accion: 'resumen' }), b.admin)).status, 401);
  assert.equal((await cuenta(post({ accion: 'resumen' }, 'sb_publishable_x'), b.admin)).status, 401);
  assert.equal((await cuenta(post({ accion: 'resumen' }, 'otro'), b.admin)).status, 401);
  assert.equal(b.hizo('cuenta_resumen').length, 0);
});

Deno.test('cuenta: resumen vincula con el usuario del TOKEN (no del cuerpo) y devuelve lo suyo', async () => {
  const b = bd({ rpc: { cuenta_vincular: () => ({ vinculados: 2 }), cuenta_resumen: () => ({ saldo: 79, pedidos: [] }) } });
  const r = await cuenta(post({ accion: 'resumen' }, 'jwt-clienta'), b.admin);
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.saldo, 79); assert.equal(d.vinculados, 2);
  assert.equal(b.hizo('cuenta_vincular')[0].args.p_user, 'u-clienta');
  assert.equal(b.hizo('cuenta_resumen')[0].args.p_user, 'u-clienta');
  // Un campo extra para pedir datos de otra persona hace inválido el cuerpo
  assert.equal((await cuenta(post({ accion: 'resumen', p_user: 'u-otra' }, 'jwt-clienta'), b.admin)).status, 400);
});

Deno.test('cuenta: cuenta del panel o correo sin verificar → 403; límite → 429', async () => {
  for (const codigo of ['cuenta_de_panel', 'correo_sin_verificar']) {
    const b = bd({ rpc: { cuenta_vincular: () => ({ data: null, error: { message: codigo } }) } });
    const r = await cuenta(post({ accion: 'resumen' }, 'jwt-clienta'), b.admin);
    assert.equal(r.status, 403); assert.equal((await r.json()).error, codigo);
  }
  assert.equal((await cuenta(post({ accion: 'resumen' }, 'jwt-clienta'), bd({ limite: false }).admin)).status, 429);
});

Deno.test('cuenta: perfil valida datos y los manda a la BD con el usuario del token', async () => {
  const b = bd({ rpc: { cuenta_guardar_perfil: () => ({ bono: true, saldo: 129 }) } });
  const r = await cuenta(post({ accion: 'perfil', nombre: 'Ana Cuenta', cumpleanos: '1995-04-12', telefono: '55 1234 5678' }, 'jwt-clienta'), b.admin);
  assert.equal(r.status, 200); assert.equal((await r.json()).bono, true);
  const a = b.hizo('cuenta_guardar_perfil')[0].args;
  assert.equal(a.p_user, 'u-clienta');
  assert.deepEqual(a.p_datos, { nombre: 'Ana Cuenta', cumpleanos: '1995-04-12', telefono: '55 1234 5678' });
  for (const malo of [{ accion: 'perfil', nombre: 'A' }, { accion: 'perfil', nombre: 'Ana', cumpleanos: '12/04/1995' }, { accion: 'borrar' }]) {
    assert.equal((await cuenta(post(malo, 'jwt-clienta'), b.admin)).status, 400, JSON.stringify(malo));
  }
});

// ---------------------------------------------------------------------------- pedidos-crear con cuenta
const PEDIDO = {
  clave_idempotencia: 'c0ffee00-1111-2222-3333-444455556666', metodo_pago: 'transferencia',
  items: [{ sku: 'UL-CLOUD-GRAY-ANU-N', cantidad: 1 }], entrega: { tipo: 'metro', zona: 'Pantitlán' },
  contacto: { nombre: 'Ana Cuenta', telefono: '5512345678', correo: '' }, total_visto: 769, puntos: 60, turnstile: 'tok',
};
const CREADO = { id: '00000000-0000-4000-8000-000000000001', folio: 'AGO-1001', token: 'a'.repeat(64), total: 769, envio: 0, descuento: 30, puntos_usados: 60,
  expira: '2026-11-11T20:00:00Z', metodo_pago: 'transferencia', repetido: false, estado: 'pendiente_pago' };
const deps = (b: ReturnType<typeof bd>): Dependencias => ({
  admin: b.admin, mp: clienteMP({ token: 'TEST', secretoWebhook: 's', api: 'https://mp.simulado' }, (async () => new Response('{}')) as typeof fetch),
  turnstile: async () => ({ ok: true }), sitio: 'https://pupilentesago.mx', urlAviso: 'https://x/functions/v1/webhook-mercadopago',
});

Deno.test('pedidos-crear: con sesión, cuenta_id sale del token y se canjean puntos', async () => {
  const b = bd({ rpc: { crear_pedido: () => CREADO } });
  const r = await crear(post({ ...PEDIDO, cuenta_id: 'u-otra' }, 'jwt-clienta'), deps(b));
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.descuento, 30); assert.equal(d.puntos_usados, 60);
  const datos = b.hizo('crear_pedido')[0].args.p_datos as Record<string, unknown>;
  assert.equal(datos.cuenta_id, 'u-clienta', 'el cuenta_id del cuerpo se ignora');
  assert.equal(datos.puntos, 60);
});

Deno.test('pedidos-crear: puntos sin sesión 401 (sin tocar la BD); sesión vencida 401; invitada sin puntos pasa con cuenta_id null', async () => {
  const b = bd({ rpc: { crear_pedido: () => CREADO } });
  const sin = await crear(post(PEDIDO), deps(b));
  assert.equal(sin.status, 401); assert.equal((await sin.json()).error, 'puntos_sin_cuenta');
  const vencida = await crear(post(PEDIDO, 'jwt-vencido'), deps(b));
  assert.equal(vencida.status, 401); assert.equal((await vencida.json()).error, 'sesion_vencida');
  assert.equal(b.hizo('crear_pedido').length, 0);
  const inv = await crear(post({ ...PEDIDO, puntos: 0, total_visto: 799 }), deps(b));
  assert.equal(inv.status, 200);
  assert.equal((b.hizo('crear_pedido')[0].args.p_datos as Record<string, unknown>).cuenta_id, null);
});

Deno.test('pedidos-crear: saldo insuficiente o tope excedido → 409 con el máximo; cuenta del panel → 403', async () => {
  for (const [codigo, estado] of [['puntos_insuficientes', 409], ['puntos_excedidos', 409]] as const) {
    const b = bd({ rpc: { crear_pedido: () => ({ data: null, error: { message: codigo, details: '19' } }) } });
    const r = await crear(post(PEDIDO, 'jwt-clienta'), deps(b));
    assert.equal(r.status, estado);
    const d = await r.json();
    assert.equal(d.error, codigo); assert.equal(d.maximo, 19);
  }
  const p = await crear(post(PEDIDO, 'jwt-clienta'), deps(bd({ rpc: { crear_pedido: () => ({ data: null, error: { message: 'cuenta_de_panel' } }) } })));
  assert.equal(p.status, 403);
  assert.equal((await crear(post({ ...PEDIDO, puntos: -5 }, 'jwt-clienta'), deps(bd()))).status, 400);
});
