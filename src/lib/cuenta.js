// Cuenta de clienta (Fase 7): entra con un código al correo (Supabase Auth OTP + Turnstile).
// La cuenta es opcional (D5): sirve para puntos e historial. Saldo, descuentos y pedidos los
// calcula el servidor (Edge Function `cuenta` y pedidos-crear); aquí solo se muestran.
import { create } from 'zustand';
import { llamarFuncion } from './api';
import { supabaseCuenta } from './supabase';

export const NIVELES = [{ id: 'Esencial', min: 0 }, { id: 'Dorado', min: 300 }, { id: 'Black', min: 800 }];
export const nivelDe = (pts) => [...NIVELES].reverse().find((n) => pts >= n.min) ?? NIVELES[0];
export const DIAS_DURACION = { trimestral: 90, semestral: 180, anual: 365 };
const PAGADOS = new Set(['pagado', 'preparando', 'enviado', 'entregado']);
export const MOTIVOS = {
  compra: 'Compra', compra_revertida: 'Compra devuelta', canje: 'Usaste en tu compra', canje_devuelto: 'Regresaron a tu saldo',
  bono_perfil: 'Bono por completar tu perfil', ajuste: 'Ajuste de la tienda', reverso: 'Ajuste',
};

/** Máximo de puntos que se pueden usar en una compra (misma regla que crear_pedido en SQL). */
export function maxPuntos(subtotal, saldo, reglas) {
  if (!reglas?.activos || !(saldo > 0) || !(subtotal > 0)) return 0;
  const tope = Math.floor(Math.floor(subtotal * reglas.max_pct) / 100 / Number(reglas.valor));
  return Math.max(0, Math.min(saldo, tope));
}
export const descuentoDe = (puntos, reglas) => (reglas ? Math.round(puntos * Number(reglas.valor) * 100) / 100 : 0);

/** Piezas de un pedido que se pueden volver a comprar hoy (con precio y disponibilidad actuales). */
export function paraRecomprar(pedido, productos) {
  const agregables = [], faltan = [];
  for (const it of pedido?.items || []) {
    const p = productos.find((x) => x.id === it.clave);
    const v = p?.variantes.find((x) => x.sku === it.sku);
    if (!p || !v || v.disponible < 1) { faltan.push(it.tono || it.producto); continue; }
    agregables.push({ id: p.id, sku: v.sku, nombre: p.nombre, alias: p.alias, duracion: v.duracion, graduacion: v.graduacion,
      od: v.graduacion, oi: v.graduacion, cant: Math.min(it.cantidad, v.disponible, 5), precio: v.precio });
  }
  return { agregables, faltan };
}

/** Datos derivados de los pedidos: último par de lentes, renovación y direcciones guardadas. */
export function derivados(pedidos = [], ahora = Date.now()) {
  const pagados = pedidos.filter((p) => PAGADOS.has(p.estado));
  const ultimo = pagados.find((p) => p.items?.some((i) => i.tipo === 'lente'));
  const lente = ultimo?.items.find((i) => i.tipo === 'lente');
  let renovacion = null;
  if (lente?.duracion && DIAS_DURACION[lente.duracion]) {
    const fecha = new Date(new Date(ultimo.fecha).getTime() + DIAS_DURACION[lente.duracion] * 864e5);
    renovacion = { fecha, dias: Math.max(0, Math.round((fecha - ahora) / 864e5)), nombre: lente.tono || lente.producto };
  }
  const vistas = new Set(), direcciones = [];
  for (const p of pedidos) {
    const d = p.entrega?.direccion_envio;
    if (!d) continue;
    const k = [d.calle, d.numero, d.cp].join('|').toLowerCase();
    if (!vistas.has(k)) { vistas.add(k); direcciones.push(d); }
  }
  return { ultimo, lente, renovacion, direcciones: direcciones.slice(0, 3) };
}

const mensaje = (e) => {
  const m = String(e?.message || e || '');
  if (/captcha/i.test(m)) return 'No pudimos verificar que eres una persona. Vuelve a intentarlo.';
  if (/rate limit|security purposes|only request this after|too many/i.test(m)) return 'Ya te mandamos un código hace poco. Espera un minuto y vuelve a intentarlo.';
  if (/expired|invalid|otp/i.test(m)) return 'El código no es válido o ya venció. Pide uno nuevo.';
  if (/signups? not allowed/i.test(m)) return 'Por ahora no se pueden crear cuentas nuevas.';
  if (/email/i.test(m) && /invalid|format/i.test(m)) return 'Revisa tu correo.';
  return 'No se pudo completar. Inténtalo de nuevo.';
};

export const useCuenta = create((set, get) => ({
  estado: supabaseCuenta ? 'cargando' : 'sin_configurar',   // cargando · fuera · dentro · sin_configurar
  correo: null,
  datos: null,        // respuesta de `cuenta` (perfil, saldo, reglas, movimientos, pedidos)
  error: null,

  async iniciar() {
    if (!supabaseCuenta) return;
    const { data: { session } } = await supabaseCuenta.auth.getSession();
    if (!session) return set({ estado: 'fuera', correo: null, datos: null });
    set({ estado: 'dentro', correo: session.user.email });
    await get().refrescar();
  },

  async refrescar() {
    try {
      const d = await llamarFuncion('cuenta', { cuerpo: { accion: 'resumen' }, cliente: supabaseCuenta, señal: AbortSignal.timeout(15000) });
      set({ datos: d, error: null });
    } catch (e) {
      if (e.estado === 401) return get().salir();
      set({ error: e.message || 'No pudimos cargar tu cuenta.' });
    }
  },

  /** Paso 1: manda el código al correo. `captchaToken` = token de Turnstile (lo valida Supabase Auth). */
  async pedirCodigo(correo, captchaToken) {
    set({ error: null });
    const { error } = await supabaseCuenta.auth.signInWithOtp({ email: correo.trim().toLowerCase(), options: { shouldCreateUser: true, captchaToken } });
    if (error) { set({ error: mensaje(error) }); return false; }
    return true;
  },

  /** Paso 2: el código de 6 dígitos abre la sesión (y verifica el correo). */
  async verificar(correo, codigo) {
    set({ error: null });
    const { data, error } = await supabaseCuenta.auth.verifyOtp({ email: correo.trim().toLowerCase(), token: String(codigo).replace(/\D/g, ''), type: 'email' });
    if (error || !data.session) { set({ error: mensaje(error) }); return false; }
    set({ estado: 'dentro', correo: data.session.user.email });
    await get().refrescar();
    return true;
  },

  async guardarPerfil(perfil) {
    set({ error: null });
    const r = await llamarFuncion('cuenta', { cuerpo: { accion: 'perfil', ...perfil }, cliente: supabaseCuenta });
    await get().refrescar();
    return r;
  },

  async salir() {
    await supabaseCuenta?.auth.signOut();
    set({ estado: 'fuera', correo: null, datos: null, error: null });
  },
}));

let iniciado = false;
/** Arranca la sesión de la cuenta una sola vez (Cuenta y Checkout la usan). */
export function iniciarCuenta() {
  if (iniciado || !supabaseCuenta) return;
  iniciado = true;
  useCuenta.getState().iniciar();
}
