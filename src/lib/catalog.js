// Catálogo v4 — organizado como lo vende Araceli: 4 familias de color, varios tonos por familia.
// Los nombres del proveedor (Angeles N Blue, Breeze Green…) se conservan y cada tono lleva
// un "alias" en español para que la clienta entienda qué está viendo.
// ⚠️ Precios, tonos marcados como demo:true y existencias son de DEMO: confirmar con Araceli.

export const A = (p) => (/^(data:|blob:|https?:)/.test(p) ? p : import.meta.env.BASE_URL + p.replace(/^\//, ''));
export const WA = '525571113508';
export const waLink = (txt) => `https://wa.me/${WA}?text=${encodeURIComponent(txt)}`;
// Pesos enteros sin decimales ("$799"); con centavos, los centavos exactos ("$921.50"): lo que se muestra
// es lo que se cobra (hallazgo H4: Envia cotiza con centavos y antes se redondeaba a pesos).
export const mxn = (n) => {
  const v = Math.round(Number(n) * 100) / 100;
  const centavos = !Number.isInteger(v);
  return '$' + v.toLocaleString('es-MX', { minimumFractionDigits: centavos ? 2 : 0, maximumFractionDigits: 2 });
};

export const GRADS = ['0.00', '-0.50', '-0.75', '-1.00', '-1.25', '-1.50', '-1.75', '-2.00', '-2.25', '-2.50', '-2.75', '-3.00', '-3.25', '-3.50', '-3.75', '-4.00', '-4.50', '-5.00', '-5.50', '-6.00', '-6.50', '-7.00', '-7.50', '-8.00'];

export const FAMILIAS = [
  { id: 'azul', nombre: 'Azules', hex: '#4F7FA8', iris: 'azul', frase: 'Del azul hielo al azul profundo.', fondo: '#E9EEF2' },
  { id: 'verde', nombre: 'Verdes', hex: '#5E8467', iris: 'verde', frase: 'Verdes que se ven naturales, incluso en ojos oscuros.', fondo: '#ECEFEA' },
  { id: 'cafe', nombre: 'Cafés & Miel', hex: '#9A6A3E', iris: 'avellana', frase: 'Un cambio sutil: miel, avellana y chocolate.', fondo: '#F1EBE3' },
  { id: 'gris', nombre: 'Grises', hex: '#8E9399', iris: 'gris', frase: 'Grises con brillo perla, del humo a la plata.', fondo: '#EEEEEC' },
];
export const familia = (id) => FAMILIAS.find((f) => f.id === id);

export const INTENSIDAD = ['', 'Natural', 'Notorio', 'Intenso'];

// f = filtro CSS sobre el iris macro de la familia (da la variación de tono sin fotos nuevas)
const T = (id, nombre, alias, fam, int, desc, f, extra = {}) => ({ id, nombre, alias, familia: fam, intensidad: int, desc, filtro: f, tipo: 'lente', duracion: 'Anual', visible: true, ...extra });

const BASE = [
  T('angeles-n-blue', 'Angeles N Blue', 'Azul cielo con contorno', 'azul', 3, 'Azul brillante con anillo oscuro que define la mirada. Se nota aun en ojos muy oscuros.', 'saturate(1.15)', { foto: 'img/fotos/clientes/angeles-n-blue.webp', top: true }),
  T('chelsea-blue', 'Chelsea Blue', 'Azul suave y luminoso', 'azul', 2, 'Azul claro con centro cálido; ilumina sin verse artificial.', 'brightness(1.22) saturate(.7) hue-rotate(-12deg)', { foto: 'img/fotos/clientes/chelsea-blue.webp' }),
  T('siri-blue', 'Siri Blue', 'Azul hielo', 'azul', 2, 'Azul casi gris con destellos plateados. Elegante para el día.', 'saturate(.45) brightness(1.35)', { demo: true }),
  T('ocean-blue', 'Ocean Blue', 'Azul profundo', 'azul', 3, 'Azul marino intenso, ideal para fotos y eventos.', 'saturate(1.6) brightness(.68) hue-rotate(10deg)', { demo: true }),
  T('breeze-green', 'Breeze Green', 'Verde oliva natural', 'verde', 1, 'Verde con centro miel. El favorito para un cambio que parece de nacimiento.', 'saturate(.85) sepia(.15)', { foto: 'img/fotos/clientes/02-verde-breeze-green.jpg', top: true }),
  T('siri-green', 'Siri Green', 'Verde jade', 'verde', 2, 'Verde limpio con reflejos dorados alrededor de la pupila.', 'saturate(1.2) hue-rotate(-22deg) brightness(1.05)', { demo: true }),
  T('angeles-n-green', 'Angeles N Green', 'Verde con contorno', 'verde', 3, 'Verde vivo con aro definido para una mirada marcada.', 'saturate(1.6) brightness(.85)', { demo: true }),
  T('mint-green', 'Mint Green', 'Verde menta claro', 'verde', 2, 'Verde aqua muy luminoso, para un look notorio.', 'brightness(1.12)', { iris: 'aqua', demo: true }),
  T('gemini-hazel', 'Gemini Hazel', 'Avellana dorado', 'cafe', 1, 'Avellana cálido con destellos verdes. Cambio sutil y muy natural.', 'none', { foto: 'img/fotos/clientes/03-cafe-gemini-hazel.jpg', top: true }),
  T('breeze-hazel', 'Breeze Hazel', 'Miel claro', 'cafe', 2, 'Miel brillante que aclara ojos oscuros sin perder calidez.', 'brightness(1.08)', { iris: 'miel', demo: true }),
  T('honey-brown', 'Honey Brown', 'Café caramelo', 'cafe', 1, 'Café caramelo, el tono más discreto del catálogo.', 'brightness(.78) saturate(.9)', { iris: 'miel', demo: true }),
  T('choco', 'Choco', 'Chocolate', 'cafe', 1, 'Chocolate profundo: unifica el color y da profundidad.', 'brightness(.85)', { iris: 'cafe', demo: true }),
  T('cloud-gray', 'Cloud Gray', 'Gris nube', 'gris', 2, 'Gris claro con textura suave; luminoso y elegante.', 'brightness(1.18) contrast(.95)', { foto: 'img/fotos/clientes/04-gris-cloud-gray.jpg', top: true }),
  T('angeles-n-gray', 'Angeles N Gray', 'Gris con contorno', 'gris', 3, 'Gris con anillo oscuro; contraste alto que se nota de lejos.', 'contrast(1.2)', { foto: 'img/fotos/clientes/angeles-n-gray.webp' }),
  T('angeles-n-wave-gray', 'Angeles N Wave Gray', 'Gris ondulado', 'gris', 2, 'Gris con fibras onduladas y centro avellana; muy natural.', 'sepia(.25) brightness(.98)', { foto: 'img/fotos/clientes/angeles-n-wave-gray.webp' }),
  T('storm-gray', 'Storm Gray', 'Gris humo', 'gris', 3, 'Gris carbón para una mirada misteriosa.', 'brightness(.6) contrast(1.15)', { demo: true }),
];

export const ACCESORIOS = [
  { id: 'solucion', nombre: 'Solución multipropósito 120 ml', alias: 'Limpia, enjuaga y conserva', tipo: 'accesorio', precio: 95, visible: true, stock: { '0.00': 30 } },
  { id: 'estuche', nombre: 'Estuche con espejo y pinzas', alias: 'Para llevar en la bolsa', tipo: 'accesorio', precio: 89, visible: true, stock: { '0.00': 24 } },
  { id: 'gotas', nombre: 'Gotas lubricantes', alias: 'Para ojos secos o pantallas', tipo: 'accesorio', precio: 120, visible: true, stock: { '0.00': 14 } },
];

// Existencias demo deterministas por graduación
function rnd(seed) { let s = seed; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
export function crearProductos() {
  return BASE.map((p, i) => {
    const r = rnd(i * 97 + 13);
    const stock = {};
    GRADS.forEach((g, gi) => {
      const v = gi === 0 ? 8 + Math.floor(r() * 14) : Math.max(0, Math.floor(r() * (gi < 12 ? 10 : 5)) - (r() < 0.08 ? 9 : 0));
      stock[g] = v;
    });
    return { ...p, precio: 549, precioGraduado: 649, stock };
  }).concat(ACCESORIOS);
}

export const irisSrc = (p) => A(`img/iris/${p.iris || familia(p.familia)?.iris || 'azul'}.webp`);
export const texSrc = (p) => A(`img/iris-tex/${p.iris || familia(p.familia)?.iris || 'azul'}.webp`);

export const ENTREGAS = [
  { id: 'metro', nombre: 'Entrega en Metro', detalle: 'Pantitlán o Tepalcates · gratis', costo: 0, icon: 'M' },
  { id: 'metro-otra', nombre: 'Otra estación de Metro', detalle: 'Costo extra por traslado', costo: 60, icon: 'M+' },
  { id: 'didi', nombre: 'Envío por DiDi', detalle: 'Mismo día en CDMX · se cotiza por dirección', costo: null, icon: 'D' },
  { id: 'paqueteria', nombre: 'Paquetería a todo México', detalle: 'Cotiza con tu código postal y recibe tu guía', costo: null, icon: 'P' },
];

// Cotizador simulado (en producción: API de Skydropx / Envia.com con el CP real)
export function cotizarPaqueteria(cp) {
  const z = parseInt(String(cp)[0] || '0', 10);
  const lejos = z >= 2 && z !== 5 ? (z >= 8 ? 1.35 : 1.15) : 1;
  return [
    { id: 'jt', paq: 'J&T Express', servicio: 'Económico', dias: '3–6 días', costo: Math.round(109 * lejos) },
    { id: 'estafeta', paq: 'Estafeta', servicio: 'Terrestre', dias: '3–5 días', costo: Math.round(139 * lejos) },
    { id: 'fedex', paq: 'FedEx', servicio: 'Económico', dias: '2–4 días', costo: Math.round(165 * lejos) },
    { id: 'dhl', paq: 'DHL', servicio: 'Express', dias: '1–2 días', costo: Math.round(229 * lejos) },
  ];
}
export function cotizarDidi(alcaldia) {
  const m = { Iztacalco: 75, Iztapalapa: 80, 'Venustiano Carranza': 85, Nezahualcóyotl: 85, Coyoacán: 140, Cuauhtémoc: 130, 'Benito Juárez': 135, 'Gustavo A. Madero': 150, 'Álvaro Obregón': 185, Tlalpan: 175 };
  return m[alcaldia] ?? 160;
}
export const ALCALDIAS = ['Iztacalco', 'Iztapalapa', 'Venustiano Carranza', 'Nezahualcóyotl', 'Benito Juárez', 'Coyoacán', 'Cuauhtémoc', 'Gustavo A. Madero', 'Álvaro Obregón', 'Tlalpan', 'Otra'];

export const ESTADOS = {
  revision: { label: 'Pago por validar', corto: 'Validar pago' },
  pagado: { label: 'Pagado · por enviar', corto: 'Por enviar' },
  enviado: { label: 'En camino', corto: 'En camino' },
  entregado: { label: 'Entregado', corto: 'Entregado' },
};
export const PASOS = ['revision', 'pagado', 'enviado', 'entregado'];

// Recomendador: respuestas → ids de tonos
export function recomendar({ ojos, efecto }) {
  const tabla = {
    'oscuros-natural': ['gemini-hazel', 'breeze-green', 'angeles-n-wave-gray'],
    'oscuros-notorio': ['angeles-n-blue', 'angeles-n-gray', 'angeles-n-green'],
    'claros-natural': ['chelsea-blue', 'honey-brown', 'cloud-gray'],
    'claros-notorio': ['ocean-blue', 'mint-green', 'storm-gray'],
  };
  return tabla[`${ojos}-${efecto}`] || tabla['oscuros-natural'];
}
