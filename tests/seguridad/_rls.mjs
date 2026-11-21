// Matriz de RLS (docs/PLAN-PRUEBAS.md §6.2 S18): qué puede hacer cada identidad en cada tabla y vista de `public`.
// No es un archivo de pruebas: lo usa fase8-huecos.test.mjs. Emula a PostgREST dentro de Postgres
// (SET LOCAL ROLE + request.jwt.claims) en transacciones que siempre se revierten: puede intentar
// leer, actualizar, borrar e insertar de verdad sin dejar rastro.
import pg from 'pg';

const DB = process.env.DB_URL || 'postgresql://postgres:postgres@127.0.0.1:55322/postgres';

/** Clasifica un conteo visible frente al total real de la tabla. */
const clase = (n, total) => (n === 0 ? (total === 0 ? 'vacía' : 'ninguna') : n === total ? 'todas' : 'algunas');

/**
 * identidades: { nombre: { rol: 'anon' | 'authenticated', claims: {...} } }
 * Devuelve { tabla: { identidad: { leer, actualizar, borrar, insertar } } } con:
 *   leer/actualizar/borrar: 'sin permiso' | 'ninguna' | 'algunas' | 'todas' | 'vacía'
 *   insertar: 'sin permiso' | 'bloqueado por RLS' | 'permitido'
 */
export async function matrizRls(identidades) {
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  try {
    const { rows: tablas } = await c.query(
      `select c.relname as t, c.relkind as k from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p') order by 1`);
    const total = {};
    for (const { t } of tablas) total[t] = Number((await c.query(`select count(*) from public."${t}"`)).rows[0].count);
    const salida = {};
    for (const { t } of tablas) {
      salida[t] = {};
      for (const [nombre, id] of Object.entries(identidades)) {
        const r = {};
        const en = async (sql) => {
          await c.query('begin');
          try {
            await c.query(`set local role ${id.rol}`);
            await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(id.claims)]);
            return await c.query(sql);
          } finally { await c.query('rollback'); }
        };
        // Leer
        try { r.leer = clase(Number((await en(`select count(*) from public."${t}"`)).rows[0].count), total[t]); }
        catch (e) { r.leer = e.code === '42501' ? 'sin permiso' : `error ${e.code}`; }
        // Actualizar: una columna a sí misma (no cambia nada; cuenta filas que RLS deja tocar)
        const { rows: cols } = await c.query(
          `select column_name from information_schema.column_privileges
            where table_schema = 'public' and table_name = $1 and grantee = $2 and privilege_type = 'UPDATE' order by 1 limit 1`, [t, id.rol]);
        if (!cols.length) r.actualizar = 'sin permiso';
        else {
          try { r.actualizar = clase((await en(`update public."${t}" set "${cols[0].column_name}" = "${cols[0].column_name}"`)).rowCount, total[t]); }
          catch (e) { r.actualizar = e.code === '42501' ? 'sin permiso' : `error ${e.code}`; }
        }
        // Borrar (se revierte)
        try { r.borrar = clase((await en(`delete from public."${t}"`)).rowCount, total[t]); }
        catch (e) { r.borrar = e.code === '42501' ? 'sin permiso' : e.code === '23503' ? 'algunas' : `error ${e.code}`; }
        // Insertar: fila por defecto; lo que importa es si el permiso/RLS la deja llegar a las restricciones
        try { await en(`insert into public."${t}" default values`); r.insertar = 'permitido'; }
        catch (e) {
          r.insertar = e.code === '42501' ? (/row-level security/.test(e.message) ? 'bloqueado por RLS' : 'sin permiso')
            : ['23502', '23503', '23514', '23505', 'P0001'].includes(e.code) ? 'permitido' : `error ${e.code}`;
        }
        salida[t][nombre] = r;
      }
    }
    return salida;
  } finally { await c.end(); }
}

/** Funciones de `public` que anon o authenticated pueden ejecutar por RPC (deben ser las de la lista blanca). */
export async function funcionesExpuestas() {
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  try {
    const { rows } = await c.query(
      `select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as f,
              has_function_privilege('anon', p.oid, 'execute') as anon,
              has_function_privilege('authenticated', p.oid, 'execute') as auth
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prokind = 'f'
          and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))
        order by 1`);
    return rows;
  } finally { await c.end(); }
}
