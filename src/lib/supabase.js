// Cliente de Supabase para el navegador. Usa SOLO la llave publicable (sb_publishable_…);
// la llave secreta nunca llega al navegador (ARQUITECTURA §2.3, §6.1 regla 2).
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_KEY);

if (SUPABASE_KEY.startsWith('sb_secret_')) {
  // Defensa extra: Supabase rechaza la llave secreta en navegadores (401), pero no debe ni intentarse.
  throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY tiene una llave secreta. Usa la publicable.');
}

export const supabase = supabaseConfigurado
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
