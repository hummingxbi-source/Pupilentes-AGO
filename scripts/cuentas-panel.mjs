#!/usr/bin/env node
// Administración de cuentas del panel (Fase 2). No hay registro abierto: las cuentas las crea el equipo.
//
//   node scripts/cuentas-panel.mjs crear   --correo dueña@ejemplo.mx --rol duena
//   node scripts/cuentas-panel.mjs rol     --correo ayudante@ejemplo.mx --rol ayudante
//   node scripts/cuentas-panel.mjs quitar  --correo exayudante@ejemplo.mx      (le quita el acceso al panel)
//   node scripts/cuentas-panel.mjs reiniciar-mfa --correo dueña@ejemplo.mx     (perdió su teléfono)
//   node scripts/cuentas-panel.mjs lista
//
// Variables: SUPABASE_URL (por defecto la local http://127.0.0.1:55321) y SUPABASE_SECRET_KEY
// (la llave sb_secret_… que imprime `supabase status`; en la nube, la del proyecto). Nunca en el repo.
//
// "reiniciar-mfa" borra los factores de la persona: al entrar de nuevo con su contraseña,
// el panel le pide dar de alta otra vez su app autenticadora. Úsalo SOLO después de confirmar
// su identidad por otro medio (llamada o en persona). Queda en auditoria_panel.

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const args = Object.fromEntries(process.argv.slice(3).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1]]] : a), []));
const accion = process.argv[2];
const salir = (m, c = 1) => { console.error(m); process.exit(c); };

const URL = process.env.SUPABASE_URL || 'http://127.0.0.1:55321';
const LLAVE = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!LLAVE) salir('Falta SUPABASE_SECRET_KEY (corre `supabase status` y copia la Secret key).');
const admin = createClient(URL, LLAVE, { auth: { persistSession: false, autoRefreshToken: false } });

const correo = args.correo?.trim().toLowerCase();
const rol = args.rol;
if (accion !== 'lista' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo || '')) salir('Indica --correo válido.');
if (['crear', 'rol'].includes(accion) && !['duena', 'ayudante'].includes(rol)) salir('Indica --rol duena o --rol ayudante.');

async function buscar(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) salir(`No se pudo leer usuarios: ${error.message}`);
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u || data.users.length < 200) return u || null;
  }
  return null;
}
async function auditar(accionAud, usuario, despues) {
  await admin.from('auditoria_panel').insert({ usuario: null, accion: accionAud, tabla: 'perfiles_panel', registro: usuario, despues });
}

if (accion === 'crear') {
  if (await buscar(correo)) salir(`Ya existe ${correo}. Usa "rol" para cambiar su rol.`);
  const contrasena = args.contrasena || randomBytes(15).toString('base64url');
  if (contrasena.length < 12) salir('La contraseña debe tener al menos 12 caracteres.');
  const { data, error } = await admin.auth.admin.createUser({ email: correo, password: contrasena, email_confirm: true });
  if (error) salir(`No se pudo crear: ${error.message}`);
  const { error: e2 } = await admin.from('perfiles_panel').upsert({ user_id: data.user.id, rol });
  if (e2) salir(`Usuario creado pero sin rol: ${e2.message}`);
  await auditar('crear_cuenta_panel', data.user.id, { correo, rol });
  console.log(`✓ Cuenta ${correo} (${rol}) creada.`);
  if (!args.contrasena) console.log(`  Contraseña temporal (compártela por un medio seguro, se muestra una sola vez):\n  ${contrasena}`);
  console.log('  Al entrar al panel le pedirá dar de alta su app autenticadora.');
} else if (accion === 'rol') {
  const u = await buscar(correo); if (!u) salir(`No existe ${correo}.`);
  const { error } = await admin.from('perfiles_panel').upsert({ user_id: u.id, rol });
  if (error) salir(error.message);
  await auditar('cambiar_rol_panel', u.id, { correo, rol });
  console.log(`✓ ${correo} ahora es ${rol}.`);
} else if (accion === 'quitar') {
  const u = await buscar(correo); if (!u) salir(`No existe ${correo}.`);
  const { error } = await admin.from('perfiles_panel').delete().eq('user_id', u.id);
  if (error) salir(error.message);
  await admin.auth.admin.signOut?.(u.id).catch(() => {});
  await auditar('quitar_acceso_panel', u.id, { correo });
  console.log(`✓ ${correo} ya no tiene acceso al panel. (Si se fue del equipo, rota también los secretos que conocía — ARQUITECTURA §6.1 regla 9.)`);
} else if (accion === 'reiniciar-mfa') {
  const u = await buscar(correo); if (!u) salir(`No existe ${correo}.`);
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId: u.id });
  if (error) salir(error.message);
  for (const f of data.factors) {
    const { error: e } = await admin.auth.admin.mfa.deleteFactor({ userId: u.id, id: f.id });
    if (e) salir(`No se pudo borrar un factor: ${e.message}`);
  }
  await auditar('reiniciar_mfa', u.id, { correo, factores_borrados: data.factors.length });
  console.log(`✓ ${data.factors.length} factor(es) borrados. ${correo} dará de alta su app de nuevo al entrar.`);
} else if (accion === 'lista') {
  const { data, error } = await admin.from('perfiles_panel').select('user_id, rol, creado_en');
  if (error) salir(error.message);
  for (const p of data) {
    const { data: u } = await admin.auth.admin.getUserById(p.user_id);
    const { data: f } = await admin.auth.admin.mfa.listFactors({ userId: p.user_id });
    console.log(`${p.rol.padEnd(9)} ${u.user?.email}  MFA: ${f?.factors?.some((x) => x.status === 'verified') ? 'sí' : 'pendiente'}`);
  }
} else {
  salir('Acción: crear | rol | quitar | reiniciar-mfa | lista');
}
