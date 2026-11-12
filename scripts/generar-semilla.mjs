#!/usr/bin/env node
// Genera supabase/seed.sql a partir de plantillas/catalogo-semilla.csv con el mismo
// importador que se usará para el catálogo real (así la semilla prueba el importador).
//   npm run semilla
// Una prueba (tests/unit/catalogo.test.js) falla si el seed.sql quedó desfasado del CSV.

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerArchivo } from './catalogo/leer.mjs';
import { construirPlan, resumen } from '../supabase/functions/_shared/catalogo/plan.js';
import { generarSql } from './catalogo/sql.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CSV_SEMILLA = path.join(RAIZ, 'plantillas', 'catalogo-semilla.csv');
export const SEED = path.join(RAIZ, 'supabase', 'seed.sql');

export const ENCABEZADO = `-- Semilla LOCAL (supabase db reset). No se aplica a proyectos en la nube.
-- GENERADO con \`npm run semilla\` desde plantillas/catalogo-semilla.csv. No editar a mano.

-- Secretos de Vault para que el cron local llame a \`cron-conciliar\` (ver migración *_cron.sql).
-- host.docker.internal llega a tu máquina desde el contenedor de Postgres en Docker Desktop (Mac/Windows).
-- El secreto debe ser igual a CRON_SECRET de supabase/functions/.env.
select vault.create_secret('http://host.docker.internal:55321', 'url_proyecto');
select vault.create_secret('cron-local-solo-desarrollo', 'secreto_cron');

-- Catálogo semilla (Fase 1). Catálogo de TRABAJO, no el real:
--   · Urban Layer a $799 y Freshlady a $299 / accesorios: precios vistos en Mercado Libre (8 nov 2026).
--   · Freshlady anual a $590: precio visto en TikTok Shop (8 nov 2026); que sea de esa marca es un supuesto.
--   · Tonos, alias y descripciones: los de la demo. Stock: inventado para probar agotados.
--   El catálogo real se carga con scripts/importar-catalogo.mjs cuando llegue el Drive (tarea C).
`;

export async function generarSemilla() {
  const { errores, plan } = construirPlan(await leerArchivo(CSV_SEMILLA));
  if (errores.length) throw new Error('La semilla tiene errores:\n' + errores.join('\n'));
  for (const i of plan.imagenes) i.url = i.origen;   // la semilla solo usa fotos ya publicadas (img/…)
  return { sql: ENCABEZADO + '\n' + generarSql(plan, { titulo: 'Catálogo semilla' }), plan };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { sql, plan } = await generarSemilla();
  await writeFile(SEED, sql);
  console.log(`✓ supabase/seed.sql · ${resumen(plan)}`);
}
