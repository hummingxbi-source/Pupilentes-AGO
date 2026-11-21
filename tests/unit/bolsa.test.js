// H5 (docs/PLAN-PRUEBAS.md §11): la bolsa se pone al día con el catálogo de la BD.
import { describe, it, expect } from 'vitest';
import { ajustarBolsa, avisoBolsa } from '../../src/lib/bolsa.js';

const prod = (sku, precio, disponible) => ({ id: sku, variantes: [{ sku, precio, disponible }] });
const item = (sku, precio, cant, nombre = sku) => ({ id: sku, sku, nombre, precio, cant });

describe('ajustarBolsa', () => {
  it('sin cambios devuelve la misma bolsa', () => {
    const bolsa = [item('A', 799, 2)];
    const r = ajustarBolsa(bolsa, [prod('A', 799, 5)]);
    expect(r.cambio).toBe(false);
    expect(r.bolsa).toBe(bolsa);
    expect(avisoBolsa(r)).toBeNull();
  });
  it('precio nuevo: se usa el de hoy y el aviso cuenta las piezas', () => {
    const r = ajustarBolsa([item('A', 799, 2), item('B', 590, 1)], [prod('A', 836, 5), prod('B', 590, 3)]);
    expect(r.bolsa.map((b) => [b.sku, b.precio, b.cant])).toEqual([['A', 836, 2], ['B', 590, 1]]);
    expect(avisoBolsa(r)).toBe('Actualizamos el precio de 2 piezas.');
  });
  it('menos disponible: baja la cantidad; agotado o fuera de venta: se quita', () => {
    const r = ajustarBolsa([item('A', 799, 4), item('B', 590, 1, 'Breeze'), item('C', 100, 1, 'Choco')], [prod('A', 799, 2), prod('B', 590, 0)]);
    expect(r.bolsa.map((b) => [b.sku, b.cant])).toEqual([['A', 2]]);
    expect(r.quitadas).toEqual(['Breeze', 'Choco']);
    expect(avisoBolsa(r)).toBe('Ajustamos la cantidad de 1 tono a lo que hay; quitamos lo agotado: Breeze, Choco.');
  });
  it('renglones viejos sin SKU se dejan igual', () => {
    const viejo = { id: 'x', nombre: 'Viejo', precio: 1, cant: 1 };
    expect(ajustarBolsa([viejo], []).bolsa).toEqual([viejo]);
  });
});
