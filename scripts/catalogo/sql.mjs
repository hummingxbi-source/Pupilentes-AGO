// Plan de catálogo → SQL que llama a public.aplicar_catalogo (migración 20261113000000).
// Toda la lógica de guardado vive en esa función SQL; la usan también el panel y la semilla.
// Idempotente: reimportar actualiza nombres, precios y fotos y NUNCA duplica stock.

import { planParaBd } from '../../supabase/functions/_shared/catalogo/plan.js';

export { planParaBd };

export function generarSql(plan, { titulo = 'Importación de catálogo' } = {}) {
  const json = JSON.stringify(planParaBd(plan), null, 1);
  // Delimitador $plan$ … $plan$: el JSON no necesita escaparse (y no puede contener ese delimitador)
  if (json.includes('$plan$')) throw new Error('el catálogo contiene el texto reservado $plan$');
  return [
    `-- ${titulo}`,
    '-- Generado por scripts/importar-catalogo.mjs. No editar a mano.',
    '-- Toda la lógica está en public.aplicar_catalogo (una transacción).',
    `select public.aplicar_catalogo($plan$${json}$plan$::jsonb);`,
    '',
  ].join('\n');
}
