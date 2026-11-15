import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { crearProductos, GRADS } from './catalog';

const NOMBRES = ['Daniela Ruiz', 'Fernanda López', 'Valeria Méndez', 'Karla Hernández', 'Ximena Torres', 'Andrea Castillo', 'Paola Jiménez', 'Mariana Flores', 'Sofía Ramírez', 'Lucía Vargas', 'Itzel Morales', 'Regina Cruz', 'Alejandra Soto', 'Brenda Aguilar', 'Natalia Reyes', 'Diana Ortega', 'Monserrat Gil', 'Jimena Pardo'];
const CANALES = ['Instagram', 'WhatsApp', 'TikTok', 'Instagram', 'Mercado Libre', 'Web', 'WhatsApp', 'Instagram'];
const PAQS = [['Estafeta', 'Terrestre', 139], ['J&T Express', 'Económico', 109], ['DHL', 'Express', 229], ['FedEx', 'Económico', 165]];

function rnd(seed) { let s = seed; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

export function folio(n) { return 'AGO-' + String(n).padStart(4, '0'); }

function mockPedidos(productos) {
  const r = rnd(42);
  const lentes = productos.filter((p) => p.tipo === 'lente');
  const hoy = new Date();
  const out = [];
  for (let i = 0; i < 46; i++) {
    const dias = Math.floor(i * 1.05 + r() * 1.5);
    const f = new Date(hoy); f.setDate(hoy.getDate() - dias); f.setHours(9 + Math.floor(r() * 11), Math.floor(r() * 60));
    const p = lentes[Math.floor(r() * lentes.length)];
    const grad = r() < 0.55 ? GRADS[1 + Math.floor(r() * 14)] : '0.00';
    const mixta = grad !== '0.00' && r() < 0.25;
    const oi = mixta ? GRADS[Math.min(GRADS.length - 1, GRADS.indexOf(grad) + 1)] : grad;
    const precio = grad === '0.00' ? 549 : 649;
    const tr = r();
    let entrega;
    if (tr < 0.38) entrega = { tipo: 'metro', detalle: r() < 0.5 ? 'Metro Pantitlán' : 'Metro Tepalcates', costo: 0 };
    else if (tr < 0.5) entrega = { tipo: 'didi', detalle: 'DiDi · Iztacalco', costo: 80 };
    else { const q = PAQS[Math.floor(r() * PAQS.length)]; entrega = { tipo: 'paqueteria', paq: q[0], servicio: q[1], costo: q[2], detalle: `${q[0]} ${q[1]}`, cp: String(10000 + Math.floor(r() * 80000)), ciudad: ['Puebla', 'Querétaro', 'Monterrey', 'Guadalajara', 'Toluca', 'Mérida'][Math.floor(r() * 6)] }; }
    let estado = 'entregado';
    if (dias <= 0) estado = r() < 0.6 ? 'revision' : 'pagado';
    else if (dias <= 2) estado = ['revision', 'pagado', 'enviado'][Math.floor(r() * 3)];
    else if (dias <= 5 && entrega.tipo === 'paqueteria') estado = 'enviado';
    if (entrega.tipo === 'metro' && estado === 'enviado') estado = 'pagado';
    if (entrega.tipo === 'metro' && estado === 'pagado' && dias <= 1) entrega.cita = (dias === 0 ? 'Hoy' : 'Mañana') + ' · ' + ['12:00', '15:30', '18:00'][Math.floor(r() * 3)];
    // Escenario de demo: un día con pendientes reales
    const paqDe = () => { const q = PAQS[i % PAQS.length]; return { tipo: 'paqueteria', paq: q[0], servicio: q[1], costo: q[2], detalle: `${q[0]} ${q[1]}`, cp: String(20000 + i * 7311), ciudad: ['Puebla', 'Querétaro', 'Monterrey', 'Guadalajara'][i % 4], dir: `Calle ${i + 3} #${10 + i}, Centro, ${['Puebla', 'Querétaro', 'Monterrey', 'Guadalajara'][i % 4]}` }; };
    if (i < 3) estado = 'revision';
    else if (i < 6) { estado = 'pagado'; entrega = paqDe(); }
    else if (i < 8) { estado = 'pagado'; entrega = { tipo: 'metro', detalle: i === 6 ? 'Metro Pantitlán' : 'Metro Tepalcates', costo: 0, cita: i === 6 ? 'Hoy · 15:30' : 'Mañana · 12:00' }; }
    else if (i < 12) { estado = 'enviado'; entrega = paqDe(); }
    else if (estado !== 'entregado' && dias > 3) estado = 'entregado';
    const extra = r() < 0.3 ? [{ id: 'solucion', nombre: 'Solución multipropósito 120 ml', cant: 1, precio: 95, od: '0.00', oi: '0.00' }] : [];
    const items = [{ id: p.id, nombre: p.nombre, od: grad, oi, cant: 1, precio }, ...extra];
    const subtotal = items.reduce((a, b) => a + b.precio * b.cant, 0);
    const n = NOMBRES[Math.floor(r() * NOMBRES.length)];
    const ped = { folio: folio(1046 - i), fecha: f.toISOString(), clienta: n, tel: '55' + String(10000000 + Math.floor(r() * 89999999)), canal: CANALES[Math.floor(r() * CANALES.length)], items, entrega, subtotal, total: subtotal + entrega.costo, estado };
    if (i === 9 || i === 20) { ped.clienta = 'Daniela Ruiz'; ped.tel = '5512345678'; }
    if (['enviado', 'entregado'].includes(estado) && entrega.tipo === 'paqueteria') ped.guia = String(Math.floor(1e9 + r() * 8e9)) + 'MX';
    out.push(ped);
  }
  return out;
}

const productos0 = crearProductos();

export const useStore = create(
  persist(
    (set, get) => ({
      productos: productos0,
      pedidos: mockPedidos(productos0),
      bolsa: [],
      bolsaAbierta: false,
      clientes: clientes0(),
      sesion: null,
      login: (tel) => set({ sesion: normTel(tel) }),
      logout: () => set({ sesion: null }),
      guardarCliente: (c) => { const t = normTel(c.tel); set({ clientes: { ...get().clientes, [t]: { ...(get().clientes[t] || { puntosBase: 0, desde: new Date().toISOString() }), ...c, tel: t } } }); },
      toast: null,

      notificar: (msg) => { set({ toast: { msg, id: Date.now() } }); setTimeout(() => { if (get().toast?.msg === msg) set({ toast: null }); }, 2800); },
      abrirBolsa: (v = true) => set({ bolsaAbierta: v }),
      agregar: (item) => {
        const bolsa = [...get().bolsa];
        const k = bolsa.findIndex((b) => (item.sku ? b.sku === item.sku : b.id === item.id && b.od === item.od && b.oi === item.oi));
        if (k >= 0) bolsa[k] = { ...bolsa[k], cant: Math.min(5, bolsa[k].cant + item.cant) }; else bolsa.push(item);
        set({ bolsa, bolsaAbierta: true });
      },
      cambiarCant: (i, d) => set({ bolsa: get().bolsa.map((b, j) => (j === i ? { ...b, cant: Math.min(5, Math.max(1, b.cant + d)) } : b)) }),
      quitar: (i) => set({ bolsa: get().bolsa.filter((_, j) => j !== i) }),
      vaciar: () => set({ bolsa: [] }),

      crearPedido: (datos) => {
        const nums = get().pedidos.map((p) => parseInt(p.folio.slice(4), 10));
        const ped = { folio: folio(Math.max(...nums) + 1), fecha: new Date().toISOString(), canal: 'Web', estado: 'revision', ...datos };
        // descuenta existencias por ojo (cada ojo = 1 pieza)
        const productos = get().productos.map((p) => {
          const its = ped.items.filter((it) => it.id === p.id);
          if (!its.length) return p;
          const stock = { ...p.stock };
          its.forEach((it) => {
            if (p.tipo === 'accesorio') stock['0.00'] = Math.max(0, stock['0.00'] - it.cant);
            else { stock[it.od] = Math.max(0, (stock[it.od] || 0) - it.cant); stock[it.oi] = Math.max(0, (stock[it.oi] || 0) - it.cant); }
          });
          return { ...p, stock };
        });
        set({ pedidos: [ped, ...get().pedidos], productos, bolsa: [] });
        return ped.folio;
      },
      actualizarPedido: (folio, cambios) => set({ pedidos: get().pedidos.map((p) => (p.folio === folio ? { ...p, ...cambios } : p)) }),
      ajustarStock: (id, g, d) => set({ productos: get().productos.map((p) => (p.id === id ? { ...p, stock: { ...p.stock, [g]: Math.max(0, (p.stock[g] || 0) + d) } } : p)) }),
      fijarStock: (id, g, v) => set({ productos: get().productos.map((p) => (p.id === id ? { ...p, stock: { ...p.stock, [g]: Math.max(0, v | 0) } } : p)) }),
      editarProducto: (id, cambios) => set({ productos: get().productos.map((p) => (p.id === id ? { ...p, ...cambios } : p)) }),
      nuevoProducto: (p) => set({ productos: [...get().productos, p] }),
      reiniciarDemo: () => set({ productos: crearProductos(), pedidos: mockPedidos(crearProductos()), bolsa: [], clientes: clientes0(), sesion: null }),
    }),
    { name: 'ago-v4', version: 4, migrate: () => ({}), partialize: (s) => ({ productos: s.productos, pedidos: s.pedidos, bolsa: s.bolsa, clientes: s.clientes, sesion: s.sesion }) }
  )
);

export const normTel = (t) => String(t || '').replace(/\D/g, '').slice(-10);
// Clientas registradas (demo). En producción: tabla clientes (tel único) + direcciones.
function clientes0() { return {
  '5512345678': { tel: '5512345678', nombre: 'Daniela Ruiz', correo: 'dani.ruiz@gmail.com', cumple: '1998-03-14', puntosBase: 380, desde: '2025-06-02', direcciones: [{ calle: 'Av. Universidad 1450, int. 3', colonia: 'Del Carmen', ciudad: 'Coyoacán', estado: 'CDMX', cp: '04100' }], receta: { od: '-2.25', oi: '-2.50' } },
  '5598765432': { tel: '5598765432', nombre: 'Fernanda López', correo: '', cumple: '', puntosBase: 120, desde: '2026-01-10', direcciones: [{ calle: 'Calle 5 de Mayo 22', colonia: 'Centro', ciudad: 'Puebla', estado: 'Puebla', cp: '72000' }], receta: { od: '0.00', oi: '0.00' } },
}; }
// Lealtad: 1 punto por cada $10 de compra validada · 1 punto = $0.50 al canjear
export const PUNTO_MXN = 0.5;
export const NIVELES = [{ id: 'Esencial', min: 0 }, { id: 'Dorado', min: 300 }, { id: 'Black', min: 800 }];
export function puntosDe(tel, pedidos, clientes) {
  const t = normTel(tel); const c = clientes[t];
  const ganados = pedidos.filter((p) => normTel(p.tel) === t && p.estado !== 'revision').reduce((a, p) => a + Math.floor(p.subtotal / 10), 0);
  const usados = pedidos.filter((p) => normTel(p.tel) === t).reduce((a, p) => a + (p.puntosUsados || 0), 0);
  return Math.max(0, (c?.puntosBase || 0) + ganados - usados);
}
export const nivelDe = (pts) => [...NIVELES].reverse().find((n) => pts >= n.min);

export const piezas = (p, g) => p?.stock?.[g] ?? 0;
export const gradsDisponibles = (p) => Object.entries(p.stock || {}).filter(([g, v]) => g !== '0.00' && v > 0).length;
