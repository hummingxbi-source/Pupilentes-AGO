// Identidad y permisos dentro de las Edge Functions (ARQUITECTURA §3 y §6.2).
// Las funciones tienen la llave secreta y saltan RLS: cada una comprueba aquí
// quién la llama. Pasar verify_jwt de la plataforma no autentica a nadie [25].

import { createClient, type SupabaseClient } from './deps.ts';
import { ErrorHttp, igualesSeguro } from './http.ts';

export type RolPanel = 'duena' | 'ayudante';

function env(nombre: string): string | undefined {
  const v = Deno.env.get(nombre);
  return v && v.trim() ? v.trim() : undefined;
}

/** Lee una llave por nombre de SUPABASE_*_KEYS (diccionario JSON), con respaldo local. */
export function llaveSupabase(tipo: 'SECRET' | 'PUBLISHABLE', nombre = 'default'): string {
  const dic = env(`SUPABASE_${tipo}_KEYS`);
  if (dic) {
    try {
      const v = (JSON.parse(dic) as Record<string, string>)[nombre];
      if (v) return v;
    } catch { /* formato inesperado: se intenta el respaldo */ }
  }
  // Respaldo para la CLI local [25]. Las llaves antiguas no se usan en la nube (§2.3).
  const suelta = env(`SUPABASE_${tipo}_KEY`) ?? env(tipo === 'SECRET' ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_ANON_KEY');
  if (!suelta) throw new Error(`Falta la llave ${tipo.toLowerCase()} de Supabase`);
  return suelta;
}

let _admin: SupabaseClient | null = null;
/** Cliente con la llave secreta (salta RLS). Solo dentro de Edge Functions. */
export function clienteServicio(): SupabaseClient {
  _admin ??= createClient(env('SUPABASE_URL')!, llaveSupabase('SECRET'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return _admin;
}

export interface Usuario { id: string; email?: string; aal: 'aal1' | 'aal2' }

function tokenBearer(req: Request): string | null {
  const h = req.headers.get('Authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  const t = m?.[1]?.trim();
  // Una llave publicable o secreta no es una sesión de usuario.
  if (!t || t.startsWith('sb_publishable_') || t.startsWith('sb_secret_')) return null;
  return t;
}

/** Exige una sesión válida de Supabase Auth. 401 si no hay o no es válida. */
export async function exigirUsuario(req: Request, admin = clienteServicio()): Promise<Usuario> {
  const token = tokenBearer(req);
  if (!token) throw new ErrorHttp(401, 'sin_sesion');
  const { data, error } = await admin.auth.getClaims(token);
  const c = data?.claims as { sub?: string; email?: string; aal?: string; role?: string } | undefined;
  if (error || !c?.sub || c.role !== 'authenticated') throw new ErrorHttp(401, 'sesion_invalida');
  return { id: c.sub, email: c.email, aal: c.aal === 'aal2' ? 'aal2' : 'aal1' };
}

/**
 * Regla del panel: sesión con MFA (aal2) y rol en `perfiles_panel` dentro de los permitidos.
 * Función pura para poder probarla sin BD.
 */
export function decidirAccesoPanel(
  usuario: Pick<Usuario, 'aal'>, rol: string | null, permitidos: readonly RolPanel[],
): { ok: true; rol: RolPanel } | { ok: false; estado: 403; codigo: string } {
  if (usuario.aal !== 'aal2') return { ok: false, estado: 403, codigo: 'mfa_requerido' };
  if (rol !== 'duena' && rol !== 'ayudante') return { ok: false, estado: 403, codigo: 'sin_acceso_panel' };
  if (!permitidos.includes(rol)) return { ok: false, estado: 403, codigo: 'rol_insuficiente' };
  return { ok: true, rol };
}

/** Exige sesión de panel con MFA y uno de los roles indicados (tabla perfiles_panel, Fase 2). */
export async function exigirPanel(
  req: Request, permitidos: readonly RolPanel[], admin = clienteServicio(),
): Promise<Usuario & { rol: RolPanel }> {
  const usuario = await exigirUsuario(req, admin);
  const { data, error } = await admin.from('perfiles_panel').select('rol').eq('user_id', usuario.id).maybeSingle();
  if (error) throw new ErrorHttp(503, 'perfiles_no_disponibles');
  const d = decidirAccesoPanel(usuario, (data as { rol?: string } | null)?.rol ?? null, permitidos);
  if (!d.ok) throw new ErrorHttp(d.estado, d.codigo);
  return { ...usuario, rol: d.rol };
}

/** Exige el secreto del cron en `x-cron-secret` (el mismo valor que `secreto_cron` en Vault). */
export function exigirSecretoCron(req: Request, secreto = env('CRON_SECRET')): void {
  const recibido = req.headers.get('x-cron-secret') ?? '';
  if (!secreto || secreto.length < 16) throw new ErrorHttp(503, 'cron_sin_configurar');
  if (!igualesSeguro(recibido, secreto)) throw new ErrorHttp(401, 'no_autorizado');
}
