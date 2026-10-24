// POST /api/chat — asistente de Pupilentes AGO.
//
// Flujo:
//   1) { accion: 'iniciar', turnstile }            → verifica que es humano y entrega un token de sesión
//   2) { accion: 'mensaje', token, historial, texto } → pasa los filtros y responde con Claude Haiku
//
// Filtros, en orden (el más barato primero; la IA solo se llama si todo pasa):
//   origen permitido → tamaño del texto → token firmado → límite por IP (minuto y día)
//   → límite por sesión → tope diario global → IA con max_tokens fijo

import { SYSTEM_PROMPT } from '../src/lib/chatbot-kb.js';
import {
  contar, leer, registrarPregunta, firmarSesion, verificarSesion, verificarTurnstile,
  ipDe, origenPermitido, hoy, usandoRedis,
} from './_lib/guard.js';

const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' ? Number(v) : d);
const CFG = {
  modelo: process.env.CHAT_MODEL || 'claude-haiku-5-5',
  maxMsgsSesion: num(process.env.CHAT_MAX_MSGS, 6),           // preguntas a la IA por sesión
  ipPorMinuto: num(process.env.CHAT_IP_PER_MIN, 8),
  ipPorDia: num(process.env.CHAT_IP_PER_DAY, 40),
  sesionesPorIpDia: num(process.env.CHAT_SESSIONS_PER_IP_DAY, 6),
  topeDiario: num(process.env.CHAT_DAILY_CAP, 1500),          // llamadas a la IA por día, toda la tienda
  maxCaracteres: 400,
  maxHistorial: 6,                                             // últimos turnos que se reenvían
  maxTokensSalida: 300,
};

// Precios Claude Haiku 5.5 en USD por millón de tokens (prompts ≤100K):
// https://platform.claude.com/docs/en/about-claude/pricing
const PRECIO = { in: 0.10, out: 0.50, cacheW: 0.125, cacheR: 0.01 };

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export async function POST(request) {
  if (!origenPermitido(request)) return json({ error: 'origen' }, 403);
  const raw = await request.text();
  if (raw.length > 8_000) return json({ error: 'muy-grande' }, 413);
  let body; try { body = JSON.parse(raw); } catch { return json({ error: 'json' }, 400); }
  const ip = ipDe(request);
  const dia = hoy();

  // ---------- 1) Iniciar sesión ----------
  if (body.accion === 'iniciar') {
    if (!(await verificarTurnstile(body.turnstile, ip))) return json({ error: 'humano' }, 403);
    const n = await contar(`chat:ses:${ip}:${dia}`, 86_400);
    if (n > CFG.sesionesPorIpDia) return json({ error: 'limite-ip', handoff: true }, 429);
    return json({ token: await firmarSesion(30), restantes: CFG.maxMsgsSesion, ia: Boolean(process.env.ANTHROPIC_API_KEY) });
  }

  if (body.accion !== 'mensaje') return json({ error: 'accion' }, 400);

  // ---------- 2) Mensaje ----------
  const texto = String(body.texto || '').trim();
  if (!texto) return json({ error: 'vacio' }, 400);
  if (texto.length > CFG.maxCaracteres) return json({ error: 'largo', max: CFG.maxCaracteres }, 400);

  const sesion = await verificarSesion(body.token);
  if (!sesion) return json({ error: 'sesion' }, 401);

  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'sin-ia' }, 503);

  // Límites (se cuentan ANTES de llamar a la IA para frenar ráfagas simultáneas)
  const minuto = Math.floor(Date.now() / 60_000);
  if ((await contar(`chat:ipm:${ip}:${minuto}`, 70)) > CFG.ipPorMinuto) return json({ error: 'rapido' }, 429);
  if ((await contar(`chat:ipd:${ip}:${dia}`, 86_400)) > CFG.ipPorDia) return json({ error: 'limite-ip', handoff: true }, 429);
  const usados = await contar(`chat:sid:${sesion.sid}`, 3_600);
  if (usados > CFG.maxMsgsSesion) return json({ error: 'limite-sesion', handoff: true, restantes: 0 }, 429);
  if ((await contar(`chat:global:${dia}`, 172_800)) > CFG.topeDiario) return json({ error: 'tope-diario', handoff: true }, 503);

  // Historial: solo los últimos turnos, recortados y con roles válidos alternados
  const historial = (Array.isArray(body.historial) ? body.historial : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    .slice(-CFG.maxHistorial)
    .map((m) => ({ role: m.role, content: m.text.slice(0, 600) }));
  while (historial.length && historial[0].role !== 'user') historial.shift();
  const messages = [...historial, { role: 'user', content: texto }]
    .reduce((acc, m) => { // une mensajes seguidos del mismo rol (la API exige alternar)
      if (acc.length && acc.at(-1).role === m.role) acc.at(-1).content += '\n' + m.content; else acc.push({ ...m });
      return acc;
    }, []);

  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CFG.modelo,
        max_tokens: CFG.maxTokensSalida,
        // El system prompt es igual en todas las llamadas: se cachea y se cobra a 1/10
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return json({ error: 'ia-caida', handoff: true }, 502);
  }
  if (!r.ok) {
    console.error('anthropic', r.status, (await r.text()).slice(0, 300));
    return json({ error: 'ia-caida', handoff: true }, 502);
  }
  const data = await r.json();
  let respuesta = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
  const handoff = respuesta.includes('[WHATSAPP]');
  respuesta = respuesta.replace(/\s*\[WHATSAPP\]\s*/g, ' ').trim();

  // Costo real de esta llamada (micro-dólares) para monitorear el gasto por día
  const u = data.usage || {};
  const usd = ((u.input_tokens || 0) * PRECIO.in + (u.output_tokens || 0) * PRECIO.out
    + (u.cache_creation_input_tokens || 0) * PRECIO.cacheW + (u.cache_read_input_tokens || 0) * PRECIO.cacheR) / 1e6;
  await contar(`chat:usd:${dia}`, 40 * 86_400, Math.round(usd * 1e6)).catch(() => {});
  registrarPregunta(texto);

  return json({ respuesta, handoff, restantes: Math.max(0, CFG.maxMsgsSesion - usados) });
}

// Resumen de uso para el panel (protegido con una clave). GET /api/chat?clave=...
export async function GET(request) {
  const clave = new URL(request.url).searchParams.get('clave');
  if (!process.env.CHAT_ADMIN_KEY || clave !== process.env.CHAT_ADMIN_KEY) return json({ error: 'no' }, 401);
  const dia = hoy();
  return json({
    dia, redis: usandoRedis(),
    llamadasHoy: await leer(`chat:global:${dia}`),
    usdHoy: (await leer(`chat:usd:${dia}`)) / 1e6,
    topeDiario: CFG.topeDiario,
  });
}
