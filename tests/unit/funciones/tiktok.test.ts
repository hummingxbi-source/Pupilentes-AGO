// Pruebas unitarias · Fase 6 · TikTok Shop.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { firmar, resumenOrdenTT, verificarAviso } from '../../../supabase/functions/_shared/tiktok.ts';
import { manejar as webhook, type Dependencias } from '../../../supabase/functions/webhook-tiktok/manejador.ts';
import { clienteTT, type ConfigTT } from '../../../supabase/functions/_shared/tiktok.ts';
import type { SupabaseClient } from '../../../supabase/functions/_shared/deps.ts';

const CFG: ConfigTT = { appKey: 'ttkey', secreto: 'sec123', servicio: '1', api: 'https://tt.simulado', authApi: 'https://auth.simulado', authUrl: 'https://auth.simulado/open/authorize' };
const hmac = (s: string) => createHmac('sha256', CFG.secreto).update(s).digest('hex');

Deno.test('firmar: secreto + ruta + params ordenados (sin sign ni access_token) + cuerpo + secreto', async () => {
  const params = { timestamp: '100', app_key: 'ttkey', shop_cipher: 'C', sign: 'x', access_token: 'y' };
  const esperado = hmac('sec123' + '/order/202309/orders' + 'app_keyttkey' + 'shop_cipherC' + 'timestamp100' + '{"a":1}' + 'sec123');
  assert.equal(await firmar('sec123', '/order/202309/orders', params, '{"a":1}'), esperado);
});

Deno.test('verificarAviso: firma correcta pasa; alterada, ausente o de otro cuerpo no', async () => {
  const cuerpo = '{"type":1,"data":{"order_id":"5800000000000000001"}}';
  const firma = hmac('ttkey' + cuerpo);
  assert.equal(await verificarAviso(cuerpo, firma, 'ttkey', 'sec123'), true);
  assert.equal(await verificarAviso(cuerpo + ' ', firma, 'ttkey', 'sec123'), false, 'un byte distinto en el cuerpo');
  assert.equal(await verificarAviso(cuerpo, null, 'ttkey', 'sec123'), false);
  assert.equal(await verificarAviso(cuerpo, `Bearer ${firma}`, 'ttkey', 'sec123'), false, 'TikTok no usa prefijo Bearer');
});

Deno.test('resumenOrdenTT: agrupa una línea por pieza; traduce estados (UNPAID no mueve, CANCELLED regresa)', () => {
  const lineas = [{ product_id: '1111', sku_id: '2222' }, { product_id: '1111', sku_id: '2222' }, { product_id: '1111', sku_id: '3333', quantity: 3 }, { product_id: 'x', sku_id: '2' }];
  const r = resumenOrdenTT({ id: '9999', status: 'AWAITING_SHIPMENT', line_items: lineas });
  assert.equal(r.status, 'paid');
  assert.deepEqual(r.items, [{ item_id: '1111', variation_id: '2222', cantidad: 2 }, { item_id: '1111', variation_id: '3333', cantidad: 3 }]);
  assert.equal(resumenOrdenTT({ id: '1', status: 'UNPAID', line_items: [] }).status, 'sin_cambio');
  assert.equal(resumenOrdenTT({ id: '1', status: 'CANCELLED', line_items: [] }).status, 'cancelled');
  assert.equal(resumenOrdenTT({ id: '1', status: 'ON_HOLD', line_items: [] }).status, 'paid');
});

Deno.test('webhook-tiktok: firma inválida → 401 sin procesar; válida → 200 y trabajo en segundo plano', async () => {
  const tareas: Promise<unknown>[] = [];
  const admin = { rpc: async () => ({ data: false, error: null }) } as unknown as SupabaseClient;
  const d: Dependencias = { admin, config: CFG, tt: clienteTT(CFG), enSegundoPlano: (p) => tareas.push(p) };
  const cuerpo = JSON.stringify({ type: 1, tts_notification_id: '77', shop_id: '1', data: { order_id: '5800000000000000001' } });
  const mal = await webhook(new Request('http://x', { method: 'POST', body: cuerpo, headers: { authorization: 'f'.repeat(64) } }), d);
  assert.equal(mal.status, 401);
  assert.equal(tareas.length, 0);
  const bien = await webhook(new Request('http://x', { method: 'POST', body: cuerpo, headers: { authorization: hmac('ttkey' + cuerpo) } }), d);
  assert.equal(bien.status, 200);
  assert.equal(tareas.length, 1);
  await Promise.allSettled(tareas);
  const otro = JSON.stringify({ type: 6, tts_notification_id: '78', shop_id: '1', data: { product_id: '1' } });
  assert.equal((await webhook(new Request('http://x', { method: 'POST', body: otro, headers: { authorization: hmac('ttkey' + otro) } }), d)).status, 200);
  assert.equal(tareas.length, 1, 'avisos que no son de órdenes se aceptan y se descartan');
});
