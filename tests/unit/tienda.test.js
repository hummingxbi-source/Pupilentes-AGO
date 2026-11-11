import { describe, it, expect } from 'vitest';
import { mapearFila, varianteDe, srcsetDe, textoGrad } from '../../src/lib/tienda.js';

const fila = {
  clave: 'freshlady-azul', tipo: 'lente', marca: 'Freshlady', producto: 'Freshlady', nombre: 'Freshlady Azul', alias: 'Azul brillante',
  familia: 'azul', intensidad: 3, descripcion: 'x', iris_base: 'azul', filtro_css: null, destacado: false, orden: 20,
  imagenes: [{ url: 'img/catalogo/abc-960.webp' }],
  variantes: [
    { sku: 'F-AZUL-TRI-N', duracion: 'trimestral', graduacion: null, precio: '299.00', disponible: 8 },
    { sku: 'F-AZUL-ANU-N', duracion: 'anual', graduacion: null, precio: '590.00', disponible: 2 },
    { sku: 'F-AZUL-ANU-M100', duracion: 'anual', graduacion: -1, precio: '590.00', disponible: 0 },
    { sku: 'F-AZUL-ANU-M150', duracion: 'anual', graduacion: -1.5, precio: '620.00', disponible: 1 },
  ],
};

describe('mapearFila', () => {
  const p = mapearFila(fila);
  it('conserva la forma que usan los componentes de la demo', () => {
    expect(p).toMatchObject({ id: 'freshlady-azul', nombre: 'Freshlady Azul', familia: 'azul', filtro: 'none', foto: 'img/catalogo/abc-960.webp', visible: true });
  });
  it('duraciones ordenadas y precios desde', () => {
    expect(p.duraciones).toEqual(['trimestral', 'anual']);
    expect(p.duracion).toBe('Trimestral · Anual');
    expect(p.precio).toBe(299);
    expect(p.precioGraduado).toBe(590);
  });
  it('stock por graduación = mejor disponible entre duraciones', () => {
    expect(p.stock).toEqual({ '0.00': 8, '-1.00': 0, '-1.50': 1 });
  });
  it('encuentra la variante exacta', () => {
    expect(varianteDe(p, 'anual', '-1.50').sku).toBe('F-AZUL-ANU-M150');
    expect(varianteDe(p, 'trimestral', '-1.50')).toBeNull();
  });
});

describe('utilidades', () => {
  it('textoGrad', () => { expect(textoGrad(null)).toBe('0.00'); expect(textoGrad(-0.5)).toBe('-0.50'); });
  it('srcset solo para fotos del importador', () => {
    const A = (u) => '/' + u;
    expect(srcsetDe('img/catalogo/abc-960.webp', A)).toBe('/img/catalogo/abc-480.webp 480w, /img/catalogo/abc-960.webp 960w, /img/catalogo/abc-1600.webp 1600w');
    expect(srcsetDe('img/fotos/x.jpg', A)).toBeUndefined();
  });
});
