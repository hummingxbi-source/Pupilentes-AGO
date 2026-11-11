// Pruebas unitarias de supabase/functions/_shared (deno test --allow-env tests/unit/funciones)
import assert from 'node:assert/strict';
import { ErrorHttp, igualesSeguro, json, respuestaDeError } from '../../../supabase/functions/_shared/http.ts';
import { encabezadosCors, manejarCors } from '../../../supabase/functions/_shared/cors.ts';
import { verificarTurnstile } from '../../../supabase/functions/_shared/turnstile.ts';
import { leerJson, z } from '../../../supabase/functions/_shared/validar.ts';
import { exigirLimite, ipCliente } from '../../../supabase/functions/_shared/limite.ts';
import { decidirAccesoPanel, exigirSecretoCron, exigirUsuario, llaveSupabase } from '../../../supabase/functions/_shared/auth.ts';
import type { SupabaseClient } from '../../../supabase/functions/_shared/deps.ts';

const TIENDA = ['http://localhost:5173'];
const pedir = (h: Record<string, string> = {}, init: RequestInit = {}) =>
  new Request('http://x/f', { ...init, headers: h });
const falso = (o: unknown) => o as unknown as SupabaseClient;

Deno.test('igualesSeguro compara bien', () => {
  assert.equal(igualesSeguro('abc', 'abc'), true);
  assert.equal(igualesSeguro('abc', 'abd'), false);
  assert.equal(igualesSeguro('abc', 'abcd'), false);
  assert.equal(igualesSeguro('', ''), true);
});

Deno.test('respuestaDeError: ErrorHttp conserva código; otros salen como 500 genérico', async () => {
  const r1 = respuestaDeError(new ErrorHttp(429, 'demasiadas_peticiones'));
  assert.equal(r1.status, 429);
  assert.equal((await r1.json()).error, 'demasiadas_peticiones');
  const orig = console.error; console.error = () => {};
  const r2 = respuestaDeError(new Error('detalle interno con datos'));
  console.error = orig;
  assert.equal(r2.status, 500);
  assert.deepEqual(await r2.json(), { error: 'error_interno' });
  assert.equal(json({}).headers.get('cache-control'), 'no-store');
});

Deno.test('CORS: origen permitido, ajeno, preflight y sin origen', () => {
  assert.equal(encabezadosCors(pedir({ Origin: 'http://localhost:5173' }), TIENDA)['Access-Control-Allow-Origin'], 'http://localhost:5173');
  assert.equal(encabezadosCors(pedir({ Origin: 'https://malo.com' }), TIENDA)['Access-Control-Allow-Origin'], undefined);
  assert.equal(manejarCors(pedir({ Origin: 'https://malo.com' }), TIENDA)?.status, 403);
  assert.equal(manejarCors(new Request('http://x', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } }), TIENDA)?.status, 204);
  assert.equal(manejarCors(pedir(), TIENDA), null);
});

Deno.test('Turnstile falla cerrado', async () => {
  assert.deepEqual(await verificarTurnstile('t', null, { secreto: '' }), { ok: false, motivo: 'sin_configurar' });
  assert.equal((await verificarTurnstile('', null, { secreto: 's' })).motivo, 'sin_token');
  const ok = (async () => new Response(JSON.stringify({ success: true }))) as typeof fetch;
  const no = (async () => new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }))) as typeof fetch;
  const caido = (async () => { throw new Error('red'); }) as typeof fetch;
  assert.equal((await verificarTurnstile('t', '1.2.3.4', { secreto: 's', fetchFn: ok })).ok, true);
  assert.equal((await verificarTurnstile('t', null, { secreto: 's', fetchFn: no })).motivo, 'invalid-input-response');
  assert.equal((await verificarTurnstile('t', null, { secreto: 's', fetchFn: caido })).motivo, 'sin_respuesta');
});

Deno.test('leerJson: tipo, tamaño, sintaxis y esquema', async () => {
  const E = z.object({ sku: z.string().min(1), cantidad: z.number().int().min(1).max(10) });
  const req = (cuerpo: string, tipo = 'application/json') =>
    new Request('http://x', { method: 'POST', body: cuerpo, headers: { 'content-type': tipo } });
  assert.deepEqual(await leerJson(req('{"sku":"A","cantidad":2}'), E), { sku: 'A', cantidad: 2 });
  await assert.rejects(leerJson(req('{}', 'text/plain'), E), (e: ErrorHttp) => e.estado === 415);
  await assert.rejects(leerJson(req('x'.repeat(100)), E, 50), (e: ErrorHttp) => e.estado === 413);
  await assert.rejects(leerJson(req('{malo'), E), (e: ErrorHttp) => e.codigo === 'json_invalido');
  await assert.rejects(leerJson(req('{"sku":"A","cantidad":-1}'), E), (e: ErrorHttp) => e.codigo === 'datos_invalidos');
});

Deno.test('Límite: pasa, 429 al exceder, 503 si la BD falla', async () => {
  const admin = (r: { data: unknown; error: unknown }) => falso({ rpc: async () => r });
  await exigirLimite(admin({ data: true, error: null }), 'k', 60, 5);
  await assert.rejects(exigirLimite(admin({ data: false, error: null }), 'k', 60, 5), (e: ErrorHttp) => e.estado === 429);
  await assert.rejects(exigirLimite(admin({ data: null, error: { message: 'x' } }), 'k', 60, 5), (e: ErrorHttp) => e.estado === 503);
  assert.equal(ipCliente(pedir({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1' })), '9.9.9.9');
  assert.equal(ipCliente(pedir({ 'cf-connecting-ip': '8.8.8.8', 'x-forwarded-for': '9.9.9.9' })), '8.8.8.8');
});

Deno.test('Panel: exige MFA (aal2) y rol', () => {
  assert.deepEqual(decidirAccesoPanel({ aal: 'aal1' }, 'duena', ['duena']), { ok: false, estado: 403, codigo: 'mfa_requerido' });
  assert.equal(decidirAccesoPanel({ aal: 'aal2' }, null, ['duena']).ok, false);
  assert.deepEqual(decidirAccesoPanel({ aal: 'aal2' }, 'ayudante', ['duena']), { ok: false, estado: 403, codigo: 'rol_insuficiente' });
  assert.deepEqual(decidirAccesoPanel({ aal: 'aal2' }, 'ayudante', ['duena', 'ayudante']), { ok: true, rol: 'ayudante' });
});

Deno.test('Sesión: sin token, con llave publicable, inválida y válida', async () => {
  const admin = (claims: unknown) => falso({ auth: { getClaims: async () => ({ data: claims ? { claims } : null, error: claims ? null : { message: 'x' } }) } });
  await assert.rejects(exigirUsuario(pedir(), admin(null)), (e: ErrorHttp) => e.estado === 401);
  await assert.rejects(exigirUsuario(pedir({ Authorization: 'Bearer sb_publishable_abc' }), admin({ sub: 'u' })), (e: ErrorHttp) => e.codigo === 'sin_sesion');
  await assert.rejects(exigirUsuario(pedir({ Authorization: 'Bearer jwt' }), admin(null)), (e: ErrorHttp) => e.codigo === 'sesion_invalida');
  await assert.rejects(exigirUsuario(pedir({ Authorization: 'Bearer jwt' }), admin({ sub: 'u', role: 'anon' })), (e: ErrorHttp) => e.codigo === 'sesion_invalida');
  assert.deepEqual(await exigirUsuario(pedir({ Authorization: 'Bearer jwt' }), admin({ sub: 'u', role: 'authenticated', aal: 'aal2', email: 'a@b.c' })), { id: 'u', email: 'a@b.c', aal: 'aal2' });
});

Deno.test('Secreto del cron', () => {
  const s = 'x'.repeat(32);
  exigirSecretoCron(pedir({ 'x-cron-secret': s }), s);
  assert.throws(() => exigirSecretoCron(pedir({ 'x-cron-secret': 'otro' }), s), (e: ErrorHttp) => e.estado === 401);
  assert.throws(() => exigirSecretoCron(pedir({ 'x-cron-secret': 'corto' }), 'corto'), (e: ErrorHttp) => e.estado === 503);
  assert.throws(() => exigirSecretoCron(pedir(), undefined), (e: ErrorHttp) => e.estado === 503);
});

Deno.test('Llaves: diccionario JSON nuevo y respaldo local', () => {
  Deno.env.set('SUPABASE_SECRET_KEYS', JSON.stringify({ default: 'sb_secret_nueva' }));
  assert.equal(llaveSupabase('SECRET'), 'sb_secret_nueva');
  Deno.env.delete('SUPABASE_SECRET_KEYS');
  Deno.env.set('SUPABASE_SECRET_KEY', 'sb_secret_local');
  assert.equal(llaveSupabase('SECRET'), 'sb_secret_local');
  Deno.env.delete('SUPABASE_SECRET_KEY');
});
