// Capas de protección del chatbot. Los archivos que empiezan con "_" no se publican como ruta en Vercel.
//
// Almacenamiento de contadores: Upstash Redis por REST (sin dependencias). Si no hay variables
// configuradas, usa memoria del proceso (sirve para desarrollo local, NO para producción:
// en serverless cada instancia tendría su propio contador).

const UP_URL = process.env.UPSTASH_REDIS_REST_URL;
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const mem = new Map(); // clave -> { v, exp }

export const usandoRedis = () => Boolean(UP_URL && UP_TOKEN);

async function redis(cmds) {
  const r = await fetch(`${UP_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).map((x) => x.result);
}

/** Incrementa un contador con expiración (segundos) y devuelve el nuevo valor. */
export async function contar(clave, ttl, cuanto = 1) {
  if (usandoRedis()) {
    const [v] = await redis([['INCRBY', clave, cuanto], ['EXPIRE', clave, ttl, 'NX']]);
    return v;
  }
  const now = Date.now();
  const e = mem.get(clave);
  const v = (e && e.exp > now ? e.v : 0) + cuanto;
  mem.set(clave, { v, exp: e && e.exp > now ? e.exp : now + ttl * 1000 });
  return v;
}

export async function leer(clave) {
  if (usandoRedis()) return Number((await redis([['GET', clave]]))[0] || 0);
  const e = mem.get(clave);
  return e && e.exp > Date.now() ? e.v : 0;
}

/** Guarda las últimas preguntas (anónimas) para el panel de BI de la tienda. */
export async function registrarPregunta(texto) {
  if (!usandoRedis()) return;
  const item = JSON.stringify({ t: texto.slice(0, 200), f: new Date().toISOString() });
  await redis([['LPUSH', 'chat:preguntas', item], ['LTRIM', 'chat:preguntas', 0, 499]]).catch(() => {});
}

// ---------- Token de sesión firmado (HMAC-SHA256) ----------
// Se entrega solo después de pasar Turnstile. Sin token válido no se llama a la IA.
const SECRET = process.env.CHAT_SECRET || (globalThis.__chatDevSecret ??= crypto.randomUUID());
const enc = new TextEncoder();
const b64u = (buf) => Buffer.from(buf).toString('base64url');

async function hmac(data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

export async function firmarSesion(minutos = 30) {
  const payload = b64u(JSON.stringify({ sid: crypto.randomUUID(), exp: Date.now() + minutos * 60_000 }));
  return `${payload}.${await hmac(payload)}`;
}

export async function verificarSesion(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, firma] = token.split('.');
  const esperada = await hmac(payload);
  // comparación de longitud fija para no filtrar información por tiempos
  if (firma.length !== esperada.length) return null;
  let diff = 0;
  for (let i = 0; i < firma.length; i++) diff |= firma.charCodeAt(i) ^ esperada.charCodeAt(i);
  if (diff) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return s.exp > Date.now() ? s : null;
  } catch { return null; }
}

// ---------- Cloudflare Turnstile (CAPTCHA invisible, gratis) ----------
export async function verificarTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // sin configurar = modo desarrollo
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const j = await r.json().catch(() => ({}));
  return j.success === true;
}

// ---------- Utilidades ----------
export function ipDe(request) {
  const h = request.headers;
  return (h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0] || 'local').trim();
}

export function origenPermitido(request) {
  const permitidos = (process.env.CHAT_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!permitidos.length) return true; // sin lista = desarrollo
  const o = request.headers.get('origin') || '';
  return permitidos.includes(o);
}

export const hoy = () => new Date().toISOString().slice(0, 10);
