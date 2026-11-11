// Dependencias externas con versión fija (ARQUITECTURA §6.1 regla 15).
// Para actualizar: cambiar aquí la versión y correr `deno check` + pruebas.
export { createClient } from 'npm:@supabase/supabase-js@2.119.0';
export type { SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0';
export { z } from 'npm:zod@4.6.7';
export { AwsClient } from 'npm:aws4fetch@1.0.20';
