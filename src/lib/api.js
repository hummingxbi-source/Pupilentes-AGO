// Llamadas a Edge Functions desde el navegador.
// Todo lo que mueve dinero o stock pasa por aquí, nunca directo a la BD (ARQUITECTURA §3).
import { supabase, SUPABASE_URL, SUPABASE_KEY, supabaseConfigurado } from './supabase';

export class ErrorApi extends Error {
  constructor(estado, codigo, mensaje) { super(mensaje || codigo); this.estado = estado; this.codigo = codigo; }
}

/** Llama a /functions/v1/<nombre>. Si hay sesión, manda su token; si no, solo la llave publicable. */
export async function llamarFuncion(nombre, { metodo = 'POST', cuerpo, señal } = {}) {
  if (!supabaseConfigurado) throw new ErrorApi(0, 'sin_configurar', 'Falta VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY');
  const { data } = await supabase.auth.getSession();
  const encabezados = { apikey: SUPABASE_KEY };
  if (data.session?.access_token) encabezados.Authorization = `Bearer ${data.session.access_token}`;
  if (cuerpo !== undefined) encabezados['Content-Type'] = 'application/json';

  const r = await fetch(`${SUPABASE_URL}/functions/v1/${nombre}`, {
    method: metodo, headers: encabezados, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo), signal: señal,
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErrorApi(r.status, datos.error || 'error', datos.mensaje);
  return datos;
}

/** Prueba de conexión de la Fase 0: el frontend local llama a la Edge Function `salud`. */
export async function comprobarSalud() {
  return llamarFuncion('salud', { metodo: 'GET', señal: AbortSignal.timeout(5000) });
}
