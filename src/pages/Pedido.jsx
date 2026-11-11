import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { MessageCircle } from 'lucide-react';
import { useStore } from '../lib/store';
import { ESTADOS, PASOS, mxn, waLink } from '../lib/catalog';
import { useProductos } from '../lib/tienda';
import { Iris } from '../ui';

export default function Pedido() {
  const { folio } = useParams();
  const [qs] = useSearchParams();
  const nav = useNavigate();
  const p = useStore((s) => s.pedidos.find((x) => x.folio === folio));
  const productos = useProductos();
  const [q, setQ] = useState('');
  const ref = useRef();
  const nuevo = qs.get('nuevo');

  useEffect(() => {
    if (!ref.current) return;
    gsap.from(ref.current.children, { y: 30, opacity: 0, stagger: 0.07, duration: 0.9, ease: 'expo.out' });
    gsap.from('.done .iris', { scale: 0.4, rotate: -120, duration: 1.4, ease: 'expo.out' });
    if (nuevo) import('canvas-confetti').then(({ default: c }) => c({ particleCount: 70, spread: 70, origin: { y: 0.35 }, colors: ['#A3824C', '#D9C7A3', '#141210', '#FBFAF7'] }));
  }, [folio]);

  if (!p) return (
    <main className="co"><div className="wrap done" ref={ref}>
      <p className="eyebrow">Rastrear pedido</p>
      <h1 className="h-m" style={{ margin: '10px 0 22px' }}>Escribe tu número de pedido</h1>
      <div style={{ display: 'flex', gap: 8 }}><input className="inp mono" value={q} onChange={(e) => setQ(e.target.value.toUpperCase())} placeholder="AGO-1046" /><button className="btn" onClick={() => nav(`/pedido/${q.trim()}`)}>Buscar</button></div>
      {folio && <p className="mute" style={{ marginTop: 14 }}>No encontramos {folio}.</p>}
    </div></main>
  );

  const k = PASOS.indexOf(p.estado);
  const lente = productos.find((x) => x.id === p.items[0]?.id && x.tipo === 'lente');
  const metro = p.entrega.tipo === 'metro';
  const sub = {
    revision: 'Estamos revisando tu depósito.',
    pagado: metro ? `Te vemos en ${p.entrega.detalle} · ${p.entrega.cita || 'por agendar'}` : 'Preparamos tu paquete y generamos tu guía.',
    enviado: p.guia ? `${p.entrega.paq} · guía ${p.guia}` : 'Tu pedido va en camino.',
    entregado: '¡Disfrútalos!',
  };
  const msg = `Hola, acabo de hacer mi pedido ${p.folio} por ${mxn(p.total)} y ya subí mi comprobante.`;
  return (
    <main className="co"><div className="wrap done" ref={ref}>
      {lente ? <Iris p={lente} /> : <Iris fam="cafe" />}
      <p className="eyebrow">Pedido {p.folio}</p>
      <h1 className="h-m" style={{ margin: '10px 0 10px' }}>{nuevo ? <>¡Listo, {p.clienta.split(' ')[0]}! <span className="it gold">Tus piezas están apartadas.</span></> : ESTADOS[p.estado].label}</h1>
      <p className="mute">{nuevo ? 'Te avisaremos por WhatsApp cuando validemos tu pago. Guarda tu número de pedido para rastrearlo.' : `Total ${mxn(p.total)} · ${p.entrega.detalle}`}</p>
      <div className="timeline">
        {PASOS.map((s, i) => (
          <div key={s} className={'tl ' + (i <= k ? 'on' : '')}><i>{i < k ? '✓' : i + 1}</i><div><b>{s === 'enviado' && metro ? 'Lista para entrega' : ESTADOS[s].label}</b>{i === k && <small>{sub[s]}</small>}</div></div>
        ))}
      </div>
      {p.guia && <div className="bank" style={{ textAlign: 'left', marginBottom: 18 }}><div>Paquetería <b>{p.entrega.paq}</b></div><div>Número de guía <b>{p.guia}</b></div></div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {nuevo && <a className="btn" href={waLink(msg)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Avisar por WhatsApp</a>}
        <button className="btn ghost" onClick={() => nav('/tienda')}>Seguir viendo tonos</button>
      </div>
    </div></main>
  );
}
