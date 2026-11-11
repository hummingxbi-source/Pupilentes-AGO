import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { construirPlan, parsearGraduaciones, generarSku, codigoMarca, slug, ESCALA } from '../../scripts/catalogo/plan.mjs';
import { generarSql } from '../../scripts/catalogo/sql.mjs';
import { generarSemilla, SEED } from '../../scripts/generar-semilla.mjs';

const H = ['marca', 'linea', 'tipo', 'color', 'familia', 'duracion', 'graduaciones', 'precio', 'stock', 'fotos', 'alias'];
const plan = (...filas) => construirPlan([H, ...filas]);

describe('graduaciones', () => {
  it('entiende neutro, rangos y sueltas, sin duplicar', () => {
    expect(parsearGraduaciones('neutro, -0.50 a -1.25, -1.00, −6')).toEqual([null, -0.5, -0.75, -1, -1.25, -6]);
  });
  it('vacío = solo neutro; el orden del rango no importa', () => {
    expect(parsearGraduaciones('')).toEqual([null]);
    expect(parsearGraduaciones('-1.00 a -0.50')).toEqual([-0.5, -0.75, -1]);
  });
  it('la escala pasa a pasos de 0.50 después de −4.00', () => {
    expect(parsearGraduaciones('-3.75 a -5.00')).toEqual([-3.75, -4, -4.5, -5]);
    expect(ESCALA.at(0)).toBe(-0.5);
  });
  it('rechaza pasos raros y texto', () => {
    expect(() => parsearGraduaciones('-1.10')).toThrow(/0.25/);
    expect(() => parsearGraduaciones('mucha')).toThrow(/no se entiende/);
  });
});

describe('SKU y claves', () => {
  it('genera SKU legible', () => {
    expect(codigoMarca('Urban Layer')).toBe('UL');
    expect(codigoMarca('Freshlady')).toBe('FRES');
    expect(generarSku({ marca: 'Urban Layer', linea: 'Angeles N', color: 'Wave Gray', duracion: 'anual', graduacion: -1.5, tipo: 'lente' })).toBe('UL-ANGELES-N-WAVE-GRAY-ANU-M150');
    expect(generarSku({ marca: 'Renu', linea: 'Solución 120 ml', tipo: 'accesorio' })).toBe('RENU-SOLUCION-120-ML');
    expect(slug('Ángeles N  Blue')).toBe('angeles-n-blue');
  });
});

describe('construirPlan', () => {
  it('agrupa varias filas del mismo tono', () => {
    const { errores, plan: p } = plan(
      ['UL', 'Cloud', 'lente', 'Gray', 'gris', 'anual', 'neutro, -0.50 a -1.00', '799', '5', 'img/a.webp', 'Gris nube'],
      ['UL', 'Cloud', 'lente', 'Gray', 'gris', 'anual', '-1.25 a -1.50', '799', '0', '', ''],
      ['UL', 'Cloud', 'lente', 'Gray', 'gris', 'trimestral', 'neutro', '299', '8', '', ''],
    );
    expect(errores).toEqual([]);
    expect(p.tonos).toHaveLength(1);
    expect(p.tonos[0]).toMatchObject({ slug: 'cloud-gray', alias: 'Gris nube', familia: 'gris' });
    expect(p.variantes).toHaveLength(4 + 2 + 1);
    expect(p.variantes.find((v) => v.sku === 'UL-CLOUD-GRAY-TRI-N')).toMatchObject({ precio: 299, stock: 8, duracion: 'trimestral' });
    expect(p.imagenes).toHaveLength(1);
  });
  it('lista TODOS los errores con su fila y no devuelve un plan a medias', () => {
    const { errores } = plan(
      ['UL', 'X', 'lente', '', 'azul', '', '', '100', '1', '', ''],
      ['UL', 'Y', 'lente', 'Azul', 'morado', '', '', '100', '1', '', ''],
      ['UL', 'Z', 'accesorio', 'Rojo', '', '', '', '100', '1', '', ''],
      ['UL', 'W', 'lente', 'Azul', 'azul', 'mensual', '', '100', '1', '', ''],
      ['UL', 'V', 'lente', 'Azul', 'azul', '', '', '-5', '1', '', ''],
      ['UL', 'U', 'lente', 'Azul', 'azul', '', '', '100', '2.5', '', ''],
    );
    expect(errores).toHaveLength(6);
    expect(errores[0]).toMatch(/^fila 2: .*color/);
    expect(errores.join('\n')).toMatch(/fila 3: familia "morado"/);
  });
  it('detecta variantes repetidas entre filas', () => {
    const { errores } = plan(
      ['UL', 'Cloud', 'lente', 'Gray', 'gris', 'anual', '-1.00', '799', '1', '', ''],
      ['UL', 'Cloud', 'lente', 'Gray', 'gris', 'anual', '-0.50 a -1.00', '799', '1', '', ''],
    );
    expect(errores[0]).toMatch(/UL-CLOUD-GRAY-ANU-M100 se repite/);
  });
  it('exige las columnas obligatorias', () => {
    expect(construirPlan([['marca', 'tipo']]).errores[0]).toMatch(/Faltan columnas: linea, precio/);
  });
});

describe('SQL', () => {
  it('escapa comillas y el stock inicial es idempotente por SKU', () => {
    const { plan: p } = plan(['O\'Brien', 'Lin\'ea', 'lente', 'Azul', 'azul', '', 'neutro', '100', '3', '', "it's"]);
    const sql = generarSql(p);
    expect(sql).toContain("'O''Brien'");
    expect(sql).toContain("'inicial:OB-LIN-EA-AZUL-N'");
    expect(sql).toMatch(/^begin;$/m);
    expect(sql).toMatch(/^commit;$/m);
    expect(sql).not.toMatch(/update public\.variantes set stock/);
  });
});

describe('semilla', () => {
  it('supabase/seed.sql está al día con plantillas/catalogo-semilla.csv (corre `npm run semilla`)', async () => {
    const { sql } = await generarSemilla();
    expect(await readFile(SEED, 'utf8')).toBe(sql);
  });
  it('tiene lo que la Fase 1 necesita probar', async () => {
    const { plan: p } = await generarSemilla();
    const t = new Set(p.tonos.map((x) => x.slug));
    for (const id of ['angeles-n-blue', 'breeze-green', 'gemini-hazel', 'cloud-gray', 'choco']) expect(t.has(id)).toBe(true);
    expect(new Set(p.tonos.map((x) => x.familia))).toEqual(new Set(['azul', 'verde', 'cafe', 'gris']));
    expect(p.variantes.some((v) => v.stock === 0)).toBe(true);                       // agotados
    expect(new Set(p.variantes.map((v) => v.duracion)).size).toBeGreaterThan(1);    // varias duraciones
    expect(p.productos.filter((x) => x.tipo === 'accesorio').length).toBeGreaterThan(0);
  });
});
