// Cloudflare Turnstile validado en el servidor (ARQUITECTURA §6.1 regla 7).
// Falla cerrado: sin secreto configurado o sin respuesta de Cloudflare, no pasa.
// En desarrollo se usan las llaves de prueba de Cloudflare (ver .env.example).

const URL_VERIFICAR = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface ResultadoTurnstile { ok: boolean; motivo?: string }

export async function verificarTurnstile(
  token: string | null | undefined,
  ip: string | null,
  opciones: { secreto?: string; fetchFn?: typeof fetch } = {},
): Promise<ResultadoTurnstile> {
  const secreto = opciones.secreto ?? Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secreto) return { ok: false, motivo: 'sin_configurar' };
  if (!token || token.length > 2048) return { ok: false, motivo: 'sin_token' };

  const cuerpo = new FormData();
  cuerpo.append('secret', secreto);
  cuerpo.append('response', token);
  if (ip) cuerpo.append('remoteip', ip);
  cuerpo.append('idempotency_key', crypto.randomUUID());

  try {
    const r = await (opciones.fetchFn ?? fetch)(URL_VERIFICAR, {
      method: 'POST', body: cuerpo, signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return { ok: false, motivo: 'cloudflare_' + r.status };
    const datos = await r.json() as { success?: boolean; 'error-codes'?: string[] };
    return datos.success === true ? { ok: true } : { ok: false, motivo: (datos['error-codes'] ?? []).join(',') || 'rechazado' };
  } catch {
    return { ok: false, motivo: 'sin_respuesta' };
  }
}
