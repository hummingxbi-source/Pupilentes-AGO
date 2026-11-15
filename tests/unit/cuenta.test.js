// Fase 7: reglas de la cuenta que se muestran en el navegador. El servidor (crear_pedido) es quien decide;
// aquí se prueba que la caja calcule lo mismo para no mandar un total que el servidor rechace.
import { describe, expect, it } from 'vitest';
import { maxPuntos, descuentoDe, paraRecomprar, derivados, nivelDe } from '../../src/lib/cuenta';

const REGLAS = { activos: true, pesos_por_punto: 10, valor: 0.5, max_pct: 50, bono_perfil: 50 };

describe('puntos en la caja', () => {
  it('tope: la mitad del subtotal en puntos, sin pasar del saldo', () => {
    expect(maxPuntos(799, 79, REGLAS)).toBe(79);
    expect(maxPuntos(799, 5000, REGLAS)).toBe(799);        // ⌊⌊799·50⌋/100/0.5⌋ = 799 (igual que en SQL)
    expect(maxPuntos(129, 5000, REGLAS)).toBe(129);
    expect(maxPuntos(799, 0, REGLAS)).toBe(0);
    expect(maxPuntos(799, -10, REGLAS)).toBe(0);            // saldo negativo (p. ej. tras un reembolso)
    expect(maxPuntos(799, 79, { ...REGLAS, activos: false })).toBe(0);
  });
  it('descuento en pesos con 2 decimales', () => {
    expect(descuentoDe(60, REGLAS)).toBe(30);
    expect(descuentoDe(79, REGLAS)).toBe(39.5);
    expect(descuentoDe(7, { ...REGLAS, valor: '0.30' })).toBe(2.1);
  });
  it('niveles', () => {
    expect(nivelDe(0).id).toBe('Esencial');
    expect(nivelDe(300).id).toBe('Dorado');
    expect(nivelDe(1200).id).toBe('Black');
  });
});

const PRODUCTOS = [
  { id: 'cloud-gray', nombre: 'Cloud Gray', alias: '', variantes: [{ sku: 'UL-CLOUD-GRAY-ANU-N', duracion: 'anual', graduacion: '0.00', precio: 799, disponible: 2 }] },
  { id: 'siri-blue', nombre: 'Siri Blue', alias: '', variantes: [{ sku: 'UL-SIRI-BLUE-ANU-N', duracion: 'anual', graduacion: '0.00', precio: 799, disponible: 0 }] },
];

describe('recompra en 1 clic', () => {
  it('agrega lo disponible con el precio de hoy y avisa lo agotado', () => {
    const p = { items: [
      { sku: 'UL-CLOUD-GRAY-ANU-N', clave: 'cloud-gray', cantidad: 3, precio: 700, tono: 'Cloud Gray' },
      { sku: 'UL-SIRI-BLUE-ANU-N', clave: 'siri-blue', cantidad: 1, tono: 'Siri Blue' },
      { sku: 'YA-NO-EXISTE', clave: 'x', cantidad: 1, producto: 'Viejo' },
    ] };
    const r = paraRecomprar(p, PRODUCTOS);
    expect(r.agregables).toEqual([{ id: 'cloud-gray', sku: 'UL-CLOUD-GRAY-ANU-N', nombre: 'Cloud Gray', alias: '', duracion: 'anual', graduacion: '0.00', od: '0.00', oi: '0.00', cant: 2, precio: 799 }]);
    expect(r.faltan).toEqual(['Siri Blue', 'Viejo']);
  });
});

describe('derivados de los pedidos', () => {
  const pedidos = [
    { estado: 'cancelado', fecha: '2026-11-10T00:00:00Z', items: [{ tipo: 'lente', duracion: 'anual', tono: 'Cancelado' }] },
    { estado: 'entregado', fecha: '2026-11-01T00:00:00Z', items: [{ tipo: 'lente', duracion: 'trimestral', tono: 'Cloud Gray', graduacion: -1.5 }],
      entrega: { direccion_envio: { calle: 'Av. Uno', numero: '5', colonia: 'Centro', cp: '06000' } } },
    { estado: 'pagado', fecha: '2026-10-01T00:00:00Z', items: [{ tipo: 'accesorio' }], entrega: { direccion_envio: { calle: 'Av. Uno', numero: '5', colonia: 'Centro', cp: '06000' } } },
  ];
  it('último par pagado, renovación según su duración y direcciones sin repetir', () => {
    const d = derivados(pedidos, Date.parse('2026-11-15T00:00:00Z'));
    expect(d.lente.tono).toBe('Cloud Gray');
    expect(d.renovacion.dias).toBe(76);                    // 1 nov + 90 días = 30 ene → 76 días desde el 15 nov
    expect(d.direcciones).toHaveLength(1);
  });
});
