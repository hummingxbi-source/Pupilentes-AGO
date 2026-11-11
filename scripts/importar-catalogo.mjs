#!/usr/bin/env node
// Importa el catálogo desde la plantilla (Excel o CSV) + carpeta de fotos → BD (+ fotos a R2 o local).
// ARQUITECTURA Fase 1 y tarea paralela C. Formato de la plantilla: plantillas/LEEME.md
//
//   node scripts/importar-catalogo.mjs <catalogo.xlsx|.csv> [opciones]
//
//   --fotos <carpeta>      dónde están los archivos de fotos que menciona la plantilla
//   --destino local|r2     a dónde se suben las fotos (local = public/img/catalogo; por defecto)
//   --sql <archivo>        escribe el SQL generado en un archivo
//   --aplicar [DB_URL]     ejecuta el SQL en la BD (por defecto la local: 127.0.0.1:55322)
//   --revisar              solo valida y muestra el resumen (no sube fotos ni escribe nada)
//
// Sin --sql ni --aplicar, imprime el SQL en la salida estándar.
// Siempre es idempotente: reimportar actualiza nombres/precios/fotos y NUNCA duplica stock.

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerArchivo } from './catalogo/leer.mjs';
import { construirPlan, resumen } from '../supabase/functions/_shared/catalogo/plan.js';
import { generarSql } from './catalogo/sql.mjs';
import { destinoLocal, destinoR2, publicarFotos } from './catalogo/fotos.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_LOCAL = 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';

function args(argv) {
  const o = { archivo: null, fotos: null, destino: 'local', sql: null, aplicar: null, revisar: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fotos') o.fotos = argv[++i];
    else if (a === '--destino') o.destino = argv[++i];
    else if (a === '--sql') o.sql = argv[++i];
    else if (a === '--aplicar') o.aplicar = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : (process.env.DB_URL || DB_LOCAL);
    else if (a === '--revisar') o.revisar = true;
    else if (a === '-h' || a === '--help') o.ayuda = true;
    else if (!a.startsWith('--') && !o.archivo) o.archivo = a;
    else throw new Error(`Opción desconocida: ${a}`);
  }
  return o;
}

const salir = (msg, codigo = 1) => { console.error(msg); process.exit(codigo); };

const o = (() => { try { return args(process.argv.slice(2)); } catch (e) { return salir(e.message); } })();
if (o.ayuda || !o.archivo) salir('Uso: node scripts/importar-catalogo.mjs <catalogo.xlsx|.csv> [--fotos carpeta] [--destino local|r2] [--sql archivo] [--aplicar [DB_URL]] [--revisar]', o.ayuda ? 0 : 1);
if (!['local', 'r2'].includes(o.destino)) salir('--destino debe ser local o r2');

const log = (m) => console.error(m);
const { errores, plan } = construirPlan(await leerArchivo(o.archivo));
if (errores.length) salir(`✗ La plantilla tiene ${errores.length} error(es); no se aplicó nada:\n  - ${errores.join('\n  - ')}`);
log(`✓ ${resumen(plan)}`);
if (o.revisar) process.exit(0);

const destino = o.destino === 'r2' ? await destinoR2() : destinoLocal(path.join(RAIZ, 'public'));
const erroresFotos = await publicarFotos(plan, { carpetaFotos: o.fotos, raizPublic: path.join(RAIZ, 'public'), destino, log });
if (erroresFotos.length) salir(`✗ Problemas con fotos; no se aplicó nada:\n  - ${erroresFotos.join('\n  - ')}`);

const sql = generarSql(plan, { titulo: `Importación de ${path.basename(o.archivo)}` });
if (o.sql) { await writeFile(o.sql, sql); log(`✓ SQL escrito en ${o.sql}`); }
if (o.aplicar) {
  const { default: pg } = await import('pg');
  const cli = new pg.Client({ connectionString: o.aplicar });
  await cli.connect();
  try { await cli.query(sql); log('✓ Catálogo aplicado en la BD'); }
  catch (e) { salir(`✗ La BD rechazó la importación (no se aplicó nada): ${e.message}`); }
  finally { await cli.end(); }
}
if (!o.sql && !o.aplicar) process.stdout.write(sql);
