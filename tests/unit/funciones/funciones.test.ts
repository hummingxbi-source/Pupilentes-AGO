// Pruebas de las Edge Functions de la Fase 0 (sin red ni BD: el cliente se simula).
import assert from 'node:assert/strict';
import { manejar as salud } from '../../../supabase/functions/salud/manejador.ts';
import { manejar as cron } from '../../../supabase/functions/cron-conciliar/manejador.ts';
import type { SupabaseClient } from '../../../supabase/functions/_shared/deps.ts';

Deno.test('salud: GET 200 con CORS, POST 405, origen ajeno 403', async () => {
  Deno.env.delete('ORIGENES_PERMITIDOS');
  const r = salud(new Request('http://x', { headers: { Origin: 'http://localhost:5173' } }));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal((await r.json()).ok, true);
  assert.equal(salud(new Request('http://x', { method: 'POST' })).status, 405);
  assert.equal(salud(new Request('http://x', { headers: { Origin: 'https://malo.com' } })).status, 403);
});

Deno.test('cron-conciliar: secreto, método y latido', async () => {
  const SECRETO = crypto.randomUUID(); // aleatorio: nunca un secreto fijo en el repo
  Deno.env.set('CRON_SECRET', SECRETO);
  const llamadas: string[] = [];
  const admin = {
    rpc: async (nombre: string) => { llamadas.push(nombre); return { data: nombre === 'limpiar_limites_tasa' ? 4 : null, error: null }; },
  } as unknown as SupabaseClient;

  assert.equal((await cron(new Request('http://x', { method: 'GET' }), admin)).status, 405);
  assert.equal((await cron(new Request('http://x', { method: 'POST', headers: { 'x-cron-secret': 'no' } }), admin)).status, 401);
  assert.deepEqual(llamadas, []);

  const r = await cron(new Request('http://x', { method: 'POST', headers: { 'x-cron-secret': SECRETO } }), admin);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).limites_borrados, 4);
  assert.deepEqual(llamadas, ['liberar_reservas_vencidas', 'limpiar_limites_tasa', 'registrar_latido']);
  Deno.env.delete('CRON_SECRET');
});
