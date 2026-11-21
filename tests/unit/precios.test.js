// H4 (docs/PLAN-PRUEBAS.md §11): el precio mostrado debe ser el que se cobra, con centavos si los hay.
import { describe, it, expect } from 'vitest';
import { mxn } from '../../src/lib/catalog.js';

describe('mxn', () => {
  it('pesos enteros sin decimales, como hoy', () => {
    expect(mxn(799)).toBe('$799');
    expect(mxn(1590)).toBe('$1,590');
    expect(mxn(0)).toBe('$0');
  });
  it('con centavos muestra los centavos exactos (no redondea a pesos)', () => {
    expect(mxn(921.5)).toBe('$921.50');
    expect(mxn(122.5)).toBe('$122.50');
    expect(mxn('1234.05')).toBe('$1,234.05');
  });
  it('no arrastra errores de punto flotante', () => {
    expect(mxn(0.1 + 0.2)).toBe('$0.30');
    expect(mxn(799 - 39.5)).toBe('$759.50');
  });
});
