// Pruebas de las Edge Functions del panel (Fase 2). La BD y R2 se simulan.
import assert from 'node:assert/strict';
import { manejar as panelStock } from '../../../supabase/functions/panel-stock/manejador.ts';
import { manejar as panelCatalogo } from '../../../supabase/functions/panel-catalogo/manejador.ts';
import { manejar as r2Firmar } from '../../../supabase/functions/r2-firmar/manejador.ts';
import { clienteR2, esWebp } from '../../../supabase/functions/_shared/r2.ts';
import type { SupabaseClient } from '../../../supabase/functions/_shared/deps.ts';

type Rol = 'duena' | 'ayudante' | null;
function bd({ rol = 'duena' as Rol, aal = 'aal2', rpc = {} as Record<string, (a: unknown) => unknown>, variantes = [] as unknown[] } = {}) {
  const llamadas: { rpc: string; args: unknown }[] = [];
  const consulta = (tabla: string) => {
    const q = {
      select: () => q, eq: () => q,
      in: async () => ({ data: tabla === 'variantes' ? variantes : [], error: null }),
      maybeSingle: async () => ({ data: tabla === 'perfiles_panel' && rol ? { rol } : null, error: null }),
    };
    return q;
  };
  const admin = {
    auth: { getClaims: async (t: string) => t === 'jwt-valido' ? { data: { claims: { sub: 'u-1', role: 'authenticated', aal } }, error: null } : { data: null, error: { message: 'x' } } },
    from: consulta,
    rpc: async (nombre: string, args: unknown) => {
      llamadas.push({ rpc: nombre, args });
      if (nombre === 'consumir_limite') return { data: true, error: null };
      const r = rpc[nombre]?.(args);
      return r && typeof r === 'object' && 'error' in (r as object) ? r : { data: r ?? null, error: null };
    },
  } as unknown as SupabaseClient;
  return { admin, llamadas };
}
const post = (cuerpo: unknown, token: string | null = 'jwt-valido') => new Request('http://x', {
  method: 'POST', body: JSON.stringify(cuerpo),
  headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
});

// ---------------------------------------------------------------------------- panel-stock
Deno.test('panel-stock: sin sesión 401, sin MFA 403, ayudante 403', async () => {
  const c = { accion: 'previsualizar', filas: [{ sku: 'A-1', nuevo: 3 }] };
  assert.equal((await panelStock(post(c, null), bd().admin)).status, 401);
  assert.equal((await panelStock(post(c, 'jwt-falso'), bd().admin)).status, 401);
  const sinMfa = await panelStock(post(c), bd({ aal: 'aal1' }).admin);
  assert.equal(sinMfa.status, 403); assert.equal((await sinMfa.json()).error, 'mfa_requerido');
  assert.equal((await panelStock(post(c), bd({ rol: 'ayudante' }).admin)).status, 403);
  assert.equal((await panelStock(post(c), bd({ rol: null }).admin)).status, 403);   // clienta: no es del panel
});

Deno.test('panel-stock: previsualizar calcula cambios y detecta errores sin tocar nada', async () => {
  const { admin, llamadas } = bd({ variantes: [{ sku: 'A-1', stock: 5, stock_reservado: 2 }, { sku: 'B-2', stock: 1, stock_reservado: 0 }] });
  const r = await panelStock(post({ accion: 'previsualizar', filas: [{ sku: 'A-1', nuevo: 1 }, { sku: 'B-2', delta: 3 }, { sku: 'C-3', nuevo: 1 }] }), admin);
  const d = await r.json();
  assert.equal(r.status, 200);
  assert.deepEqual(d.filas.map((f: { sku: string; error?: string; cambio?: number }) => [f.sku, f.error ?? f.cambio]), [['A-1', 'debajo_de_apartado'], ['B-2', 3], ['C-3', 'sku_no_existe']]);
  assert.equal(d.cambios, 1); assert.equal(d.errores, 2);
  assert.match(d.lote, /^[0-9a-f-]{36}$/);
  assert.ok(!llamadas.some((l) => l.rpc === 'panel_ajustar_stock'), 'previsualizar no aplica nada');
});

Deno.test('panel-stock: aplicar → 200; conflicto → 409 con problemas; datos malos → 400', async () => {
  const filas = [{ sku: 'A-1', nuevo: 4, esperado: 5 }];
  const ok = bd({ rpc: { panel_ajustar_stock: () => ({ aplicadas: 1 }) } });
  const r = await panelStock(post({ accion: 'aplicar', lote: 'lote-1234-abcd', motivo: 'ajuste', filas }), ok.admin);
  assert.equal(r.status, 200);
  assert.deepEqual((ok.llamadas.find((l) => l.rpc === 'panel_ajustar_stock')!.args as { p_usuario: string }).p_usuario, 'u-1');
  const conf = bd({ rpc: { panel_ajustar_stock: () => ({ data: null, error: { message: 'ajuste_con_problemas', details: '[{"sku":"A-1","error":"cambio_mientras_tanto"}]' } }) } });
  const r2 = await panelStock(post({ accion: 'aplicar', lote: 'lote-1234-abcd', motivo: 'ajuste', filas }), conf.admin);
  assert.equal(r2.status, 409);
  assert.equal((await r2.json()).problemas[0].error, 'cambio_mientras_tanto');
  for (const malo of [
    { accion: 'aplicar', lote: 'x', motivo: 'ajuste', filas },                                   // lote inválido
    { accion: 'aplicar', lote: 'lote-1234-abcd', motivo: 'regalo', filas },                     // motivo inválido
    { accion: 'previsualizar', filas: [{ sku: 'A-1', nuevo: -1 }] },                            // negativo
    { accion: 'previsualizar', filas: [{ sku: 'A-1', nuevo: 1, delta: 1 }] },                   // ambos
    { accion: 'previsualizar', filas: [{ sku: 'A-1', nuevo: 1 }, { sku: 'A-1', nuevo: 2 }] },   // repetido
    { accion: 'previsualizar', filas: [{ sku: "a'; drop", nuevo: 1 }] },                        // sku raro
  ]) assert.equal((await panelStock(post(malo), bd().admin)).status, 400, JSON.stringify(malo));
});

// ---------------------------------------------------------------------------- panel-catalogo
const H = ['marca', 'linea', 'tipo', 'color', 'familia', 'precio', 'graduaciones', 'stock', 'fotos'];
Deno.test('panel-catalogo: revisar lista errores; aplicar usa aplicar_catalogo; fotos sin publicar se rechazan', async () => {
  const malo = await panelCatalogo(post({ accion: 'revisar', filas: [H, ['UL', 'X', 'lente', 'Azul', 'morado', '100', '', '1', '']] }), bd().admin);
  assert.equal(malo.status, 400);
  assert.match((await malo.json()).errores[0], /fila 2: familia "morado"/);

  const foto = await panelCatalogo(post({ accion: 'aplicar', filas: [H, ['UL', 'X', 'lente', 'Azul', 'azul', '100', '', '1', 'mi-foto.jpg']] }), bd().admin);
  assert.equal(foto.status, 400);

  const { admin, llamadas } = bd({ rpc: { aplicar_catalogo: () => ({ variantes_nuevas: 1 }) } });
  const ok = await panelCatalogo(post({ accion: 'aplicar', filas: [H, ['UL', 'X', 'lente', 'Azul', 'azul', '100', '-1.00', '2', 'img/a.webp']] }), admin);
  assert.equal(ok.status, 200);
  const plan = (llamadas.find((l) => l.rpc === 'aplicar_catalogo')!.args as { p_plan: { variantes: { sku: string; stock: number }[]; imagenes: { url: string }[] } }).p_plan;
  assert.deepEqual(plan.variantes.map((v) => [v.sku, v.stock]), [['UL-X-AZUL-M100', 2]]);
  assert.equal(plan.imagenes[0].url, 'img/a.webp');
  assert.equal((await panelCatalogo(post({ accion: 'revisar', filas: [H] }), bd({ rol: 'ayudante' }).admin)).status, 403);
});

// ---------------------------------------------------------------------------- r2-firmar
function r2Falso(objetos: Record<string, { bytes: number; inicio: Uint8Array }>) {
  const borrados: string[] = [];
  return {
    borrados,
    r2: {
      firmarPut: async (k: string) => `https://r2.ejemplo/${k}?firmado`,
      inspeccionar: async (k: string) => objetos[k] ?? null,
      borrar: async (k: string) => { borrados.push(k); },
      urlPublica: (k: string) => `https://img.ago.mx/${k}`,
    } as unknown as ReturnType<typeof clienteR2>,
  };
}
const WEBP = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32]);
const HTML = new TextEncoder().encode('<html><script>x');

Deno.test('r2-firmar: sin R2 → 503; firmar da 3 PUT con nombre del servidor', async () => {
  assert.equal((await r2Firmar(post({ accion: 'firmar' }), bd().admin, null)).status, 503);
  const { r2 } = r2Falso({});
  const r = await r2Firmar(post({ accion: 'firmar' }), bd({ rol: 'ayudante' }).admin, r2);
  const d = await r.json();
  assert.equal(r.status, 200);
  assert.deepEqual(d.subidas.map((s: { ancho: number }) => s.ancho), [480, 960, 1600]);
  assert.ok(d.subidas.every((s: { clave: string }) => s.clave === `catalogo/${d.id}-${s.clave.match(/-(\d+)\.webp$/)![1]}.webp`));
  assert.equal((await r2Firmar(post({ accion: 'firmar' }), bd({ aal: 'aal1' }).admin, r2)).status, 403);
});

Deno.test('r2-firmar: un archivo que no es WebP (p. ej. HTML renombrado) se rechaza y se BORRA', async () => {
  const id = crypto.randomUUID();
  const k = (a: number) => `catalogo/${id}-${a}.webp`;
  const malo = r2Falso({ [k(480)]: { bytes: 900, inicio: WEBP }, [k(960)]: { bytes: 900, inicio: HTML }, [k(1600)]: { bytes: 900, inicio: WEBP } });
  const r = await r2Firmar(post({ accion: 'verificar', id }), bd().admin, malo.r2);
  assert.equal(r.status, 400);
  assert.deepEqual(malo.borrados.sort(), [k(1600), k(480), k(960)].sort());
  const grande = r2Falso({ [k(480)]: { bytes: 900, inicio: WEBP }, [k(960)]: { bytes: 900, inicio: WEBP }, [k(1600)]: { bytes: 3e6, inicio: WEBP } });
  assert.equal((await r2Firmar(post({ accion: 'verificar', id }), bd().admin, grande.r2)).status, 400);
  const bien = r2Falso({ [k(480)]: { bytes: 900, inicio: WEBP }, [k(960)]: { bytes: 900, inicio: WEBP }, [k(1600)]: { bytes: 900, inicio: WEBP } });
  const ok = await r2Firmar(post({ accion: 'verificar', id }), bd().admin, bien.r2);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).url, `https://img.ago.mx/${k(960)}`);
  assert.deepEqual(bien.borrados, []);
});

Deno.test('R2: la URL firmada de PUT expira en 60 s y firma el Content-Type', async () => {
  const c = clienteR2({ cuenta: 'abc123', llave: 'AKIAEJEMPLO', secreto: 'secreto-de-prueba', bucket: 'fotos', urlPublica: 'https://img.ago.mx' });
  const u = new URL(await c.firmarPut('catalogo/x-960.webp', 'image/webp', 60));
  assert.equal(u.host, 'abc123.r2.cloudflarestorage.com');
  assert.equal(u.pathname, '/fotos/catalogo/x-960.webp');
  assert.equal(u.searchParams.get('X-Amz-Expires'), '60');
  assert.match(u.searchParams.get('X-Amz-SignedHeaders') ?? '', /content-type/);
  assert.match(u.searchParams.get('X-Amz-Signature') ?? '', /^[0-9a-f]{64}$/);
  assert.equal(esWebp(WEBP), true);
  assert.equal(esWebp(HTML), false);
});
