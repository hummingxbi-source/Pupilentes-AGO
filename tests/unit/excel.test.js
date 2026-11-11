import { describe, it, expect } from 'vitest';
import { filasCsv, valorCelda } from '../../src/lib/excel.js';

describe('filasCsv', () => {
  it('separa por comas y respeta comillas', () => {
    expect(filasCsv('Tono,-1.00\n"Cloud, gris",3\n')).toEqual([['Tono', '-1.00'], ['Cloud, gris', '3']]);
  });
  it('detecta punto y coma (Excel en español) y CRLF', () => {
    expect(filasCsv('Tono;-1.00\r\nCloud;3')).toEqual([['Tono', '-1.00'], ['Cloud', '3']]);
  });
  it('descarta filas vacías y comillas escapadas', () => {
    expect(filasCsv('a,b\n\n"di ""hola""",2')).toEqual([['a', 'b'], ['di "hola"', '2']]);
  });
});

describe('valorCelda', () => {
  it('aplana fórmulas, texto enriquecido e hipervínculos', () => {
    expect(valorCelda({ formula: 'A1+1', result: 4 })).toBe(4);
    expect(valorCelda({ richText: [{ text: 'Clo' }, { text: 'ud' }] })).toBe('Cloud');
    expect(valorCelda({ text: 'sitio', hyperlink: 'https://x' })).toBe('sitio');
    expect(valorCelda(null)).toBe('');
    expect(valorCelda(7)).toBe(7);
  });
});
