// Sesión del panel (Fase 2): correo + contraseña → MFA con app autenticadora (TOTP) → rol.
// La pantalla es solo la primera barrera: la BD exige aal2 en cada tabla (políticas
// restrictivas) y las Edge Functions también (exigirPanel). ARQUITECTURA §6.1 regla 11.
//
// Estados: cargando · fuera · mfa_enrolar · mfa_verificar · dentro · sin_acceso · sin_configurar

import { create } from 'zustand';
import { supabase, supabaseConfigurado } from '../lib/supabase';

export const INACTIVIDAD_MS = 30 * 60 * 1000;   // cierre de sesión tras 30 min sin usar el panel

const mensaje = (e) => {
  const m = String(e?.message || e || '');
  if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/invalid (totp )?code|invalid mfa|code.*(expired|invalid)/i.test(m)) return 'El código no es válido o ya expiró. Usa el que aparece ahora en tu app.';
  if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Espera un momento.';
  return 'No se pudo completar. Intenta de nuevo.';
};

export const useSesion = create((set, get) => ({
  estado: supabaseConfigurado ? 'cargando' : 'sin_configurar',
  usuario: null,
  rol: null,
  factorId: null,
  enrolamiento: null,     // { factorId, qr, secreto } mientras se da de alta la app autenticadora
  error: null,
  motivoSalida: null,

  /** Decide en qué paso va la persona según su sesión y su nivel de seguridad (aal). */
  async evaluar() {
    if (!supabase) return set({ estado: 'sin_configurar' });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return set({ estado: 'fuera', usuario: null, rol: null });
    const { data: aal, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) return set({ estado: 'fuera', error: mensaje(error) });
    if (aal.currentLevel !== 'aal2') {
      const { data: f } = await supabase.auth.mfa.listFactors();
      const totp = (f?.totp || []).find((x) => x.status === 'verified');
      return set(totp ? { estado: 'mfa_verificar', factorId: totp.id, usuario: session.user } : { estado: 'mfa_enrolar', usuario: session.user });
    }
    // Con MFA: el rol sale de perfiles_panel (RLS solo deja leerlo con aal2)
    const { data: perfil } = await supabase.from('perfiles_panel').select('rol').eq('user_id', session.user.id).maybeSingle();
    set(perfil?.rol ? { estado: 'dentro', usuario: session.user, rol: perfil.rol, error: null, motivoSalida: null } : { estado: 'sin_acceso', usuario: session.user, rol: null });
  },

  async entrar(correo, contrasena) {
    set({ error: null });
    const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: contrasena });
    if (error) return set({ error: mensaje(error) });
    await get().evaluar();
  },

  /** Alta de la app autenticadora (primera vez). Limpia intentos previos sin terminar. */
  async iniciarEnrolamiento() {
    set({ error: null });
    const { data: f } = await supabase.auth.mfa.listFactors();
    for (const x of (f?.all || []).filter((x) => x.factor_type === 'totp' && x.status !== 'verified')) {
      await supabase.auth.mfa.unenroll({ factorId: x.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Panel AGO ${new Date().toISOString().slice(0, 10)}` });
    if (error) return set({ error: mensaje(error) });
    set({ enrolamiento: { factorId: data.id, qr: data.totp.qr_code, secreto: data.totp.secret } });
  },

  async verificar(codigo) {
    set({ error: null });
    const factorId = get().enrolamiento?.factorId || get().factorId;
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: String(codigo).replace(/\D/g, '') });
    if (error) return set({ error: mensaje(error) });
    set({ enrolamiento: null });
    await get().evaluar();
  },

  async salir(motivo = null) {
    await supabase?.auth.signOut();
    set({ estado: 'fuera', usuario: null, rol: null, enrolamiento: null, factorId: null, motivoSalida: motivo });
  },
}));

let iniciado = false;
/** Arranca la sesión del panel una sola vez: evalúa, escucha cambios y vigila la inactividad. */
export function iniciarSesionPanel() {
  if (iniciado || !supabase) return () => {};
  iniciado = true;
  const s = useSesion.getState();
  s.evaluar();
  const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT') useSesion.setState({ estado: 'fuera', usuario: null, rol: null });
  });

  let ultimo = Date.now();
  const actividad = () => { ultimo = Date.now(); };
  const eventos = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
  eventos.forEach((e) => addEventListener(e, actividad, { passive: true }));
  const reloj = setInterval(() => {
    const { estado, salir } = useSesion.getState();
    if (['dentro', 'mfa_verificar', 'mfa_enrolar', 'sin_acceso'].includes(estado) && Date.now() - ultimo > INACTIVIDAD_MS) salir('inactividad');
  }, 30_000);

  return () => { iniciado = false; sub.subscription.unsubscribe(); eventos.forEach((e) => removeEventListener(e, actividad)); clearInterval(reloj); };
}
