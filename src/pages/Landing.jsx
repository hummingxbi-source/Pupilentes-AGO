import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowRight, ArrowUpRight, Train, Car, Package, Check, Truck } from 'lucide-react';
import { Iris, LOGO, ProductSheet, TLink, onReady } from '../ui';
import { A, FAMILIAS, mxn } from '../lib/catalog';
import { useProductos } from '../lib/tienda';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HERO_TONOS = [
  { fam: 'azul', n: 'Angeles N Blue', a: 'azul cielo' },
  { fam: 'verde', n: 'Breeze Green', a: 'verde oliva' },
  { fam: 'cafe', n: 'Gemini Hazel', a: 'avellana dorado' },
  { fam: 'gris', n: 'Cloud Gray', a: 'gris nube' },
];
const PROMESAS = [
  ['Graduación ojo por ojo', 'Revisamos cada graduación antes de apartar. Si tus ojos son distintos, te mandamos cada lente con la suya.'],
  ['Apartado al instante', 'En cuanto haces tu pedido tus piezas se separan del inventario: nadie más se las lleva.'],
  ['Empaque completo', 'Cada par llega con estuche y solución de viaje, listo para usarse el mismo día.'],
  ['Te acompañamos', 'Guía con rastreo, dudas por WhatsApp y un recordatorio cuando toque renovarlos.'],
];
const PASOS = [
  ['Elige tono y graduación', 'Ves al instante si hay piezas para cada ojo. ¿Sin graduación? Un toque y listo.'],
  ['Cotiza tu envío', 'Escribe tu código postal y elige paquetería, o agenda entrega gratis en Metro.'],
  ['Paga y síguelo', 'Mandas tu comprobante por WhatsApp y recibes tu número de guía y tus puntos.'],
];

export default function Landing() {
  const root = useRef();
  const productos = useProductos();
  // El catálogo puede llegar de la BD después de montar: recalcula los pines y el carrusel con scroll
  useEffect(() => { if (productos.length) ScrollTrigger.refresh(); }, [productos.length]);
  const [sheet, setSheet] = useState(null);
  const [hi, setHi] = useState(0);
  useEffect(() => { const t = setInterval(() => setHi((i) => (i + 1) % 4), 2800); return () => clearInterval(t); }, []);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    // Entrada sutil: todo aparece poco a poco cuando la cortina se abre
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    tl.from('.hero .eyebrow', { opacity: 0, y: 10, duration: 1 })
      .from('.hero h1 .wd', { opacity: 0, y: 34, filter: 'blur(10px)', stagger: 0.09, duration: 1.4 }, 0.1)
      .from('.hero-eye svg.ring circle', { opacity: 0, scale: 0.92, transformOrigin: '50% 50%', stagger: 0.15, duration: 1.6 }, 0.2)
      .from('.hero-eye', { opacity: 0, duration: 1.4, ease: 'power1.out' }, 0.25)
      .from('.hero-eye .iris', { scale: 0.88, duration: 2, ease: 'power2.out' }, 0.35)
      .from('.hero-eye svg.ring .txt', { opacity: 0, rotate: -40, transformOrigin: '50% 50%', duration: 2 }, 0.6)
      .from('.hero .lead', { opacity: 0, y: 16, duration: 1.2 }, 0.75)
      .from('.hero .ctas > *', { opacity: 0, y: 14, stagger: 0.1, duration: 1 }, 0.9)
      .from('.hero-eye .tag', { opacity: 0, y: 10, stagger: 0.15, duration: 1 }, 1.2)
      .from('.hero-facts > div', { opacity: 0, y: 14, stagger: 0.1, duration: 1 }, 1.1)
      .add(() => gsap.to('.hero-eye svg.ring .txt', { rotate: '+=360', transformOrigin: '50% 50%', duration: 40, repeat: -1, ease: 'none' }));
    onReady(() => tl.play());
    gsap.to('.hero-eye', { yPercent: 18, scale: 0.92, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    const band = gsap.to('.band .track', { xPercent: -50, duration: 26, repeat: -1, ease: 'none' });
    ScrollTrigger.create({ trigger: '.band', start: 'top bottom', end: 'bottom top', onUpdate: (s) => { gsap.to(band, { timeScale: 1 + Math.min(Math.abs(s.getVelocity()) / 300, 5), duration: 0.2, overwrite: true }); gsap.to(band, { timeScale: 1, duration: 1, delay: 0.2 }); } });

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const n = FAMILIAS.length;
      const ft = gsap.timeline({ scrollTrigger: { trigger: '.fams-stage', start: 'top top', end: `+=${n * 90}%`, pin: true, scrub: 0.6, snap: { snapTo: 1 / (n - 1), duration: 0.5, ease: 'power2.inOut' } } });
      gsap.set('.fams-eye .iris:first-child, .fam-card:first-child, .fams-word span:first-child', { opacity: 1, autoAlpha: 1 });
      gsap.set('.fams-prog i:first-child b', { scaleX: 1 });
      for (let i = 1; i < n; i++) {
        const at = i - 1;
        ft.to(`.fams-eye .iris:nth-child(${i})`, { opacity: 0, scale: 1.25, rotate: 40, duration: 1 }, at)
          .fromTo(`.fams-eye .iris:nth-child(${i + 1})`, { opacity: 0, scale: 0.7, rotate: -40 }, { opacity: 1, scale: 1, rotate: 0, duration: 1 }, at)
          .to(`.fams-word span:nth-child(${i})`, { opacity: 0, xPercent: -18, duration: 1 }, at)
          .fromTo(`.fams-word span:nth-child(${i + 1})`, { opacity: 0, xPercent: 18 }, { opacity: 1, xPercent: 0, duration: 1 }, at)
          .to(`.fam-card:nth-child(${i})`, { autoAlpha: 0, y: -20, duration: 0.45 }, at)
          .fromTo(`.fam-card:nth-child(${i + 1})`, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5 }, at + 0.5)
          .to(`.fams-prog i:nth-child(${i + 1}) b`, { scaleX: 1, duration: 1 }, at)
          .set('.fams-count', { textContent: `0${i + 1} / 0${n}` }, at + 0.5);
      }
      // Por qué nosotras
      gsap.to('.why3-big .w', { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.why3-big', start: 'top 80%', end: 'bottom 45%', scrub: true } });
      gsap.utils.toArray('.why3 .row').forEach((r) => gsap.timeline({ scrollTrigger: { trigger: r, start: 'top 85%' } })
        .from(r.querySelector('.ln-d'), { scaleX: 0, duration: 1.2, ease: 'expo.inOut' })
        .from(r.querySelector('.n'), { yPercent: 60, opacity: 0, duration: 0.9, ease: 'expo.out' }, '-=.8')
        .from(r.querySelector('h3 span'), { yPercent: 110, duration: 1, ease: 'expo.out' }, '<.05')
        .from(r.querySelector('p'), { y: 20, opacity: 0, duration: 0.9, ease: 'expo.out' }, '<.15'));
      // Cómo comprar: la línea se dibuja con el scroll
      gsap.fromTo('.how2-line b', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.how2-grid', start: 'top 75%', end: 'bottom 60%', scrub: true } });
      const track = document.querySelector('.looks-track');
      const dist = () => track.scrollWidth - innerWidth + 32;
      gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.looks-pin', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true } });
    });
    mm.add('(prefers-reduced-motion: reduce)', () => { gsap.set('.fams-eye .iris:first-child, .fam-card:first-child, .fams-word span:first-child', { opacity: 1, autoAlpha: 1 }); });

    ScrollTrigger.batch('.how2-card', { start: 'top 88%', onEnter: (b) => gsap.from(b, { y: 50, opacity: 0, stagger: 0.12, duration: 1, ease: 'expo.out', clearProps: 'transform' }), once: true });
    ScrollTrigger.batch('.how2-card .mui > *', { start: 'top 92%', onEnter: (b) => gsap.from(b, { x: -14, opacity: 0, stagger: 0.06, duration: 0.7, ease: 'expo.out', delay: 0.3 }), once: true });
    gsap.utils.toArray('.stat b[data-n]').forEach((el) => { const o = { v: 0 }; gsap.to(o, { v: +el.dataset.n, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%' }, onUpdate: () => (el.textContent = (el.dataset.p || '') + Math.round(o.v) + (el.dataset.s || '')) }); });
    gsap.to('.tz-chip', { y: -10, duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: { each: 0.3, from: 'random' } });
    gsap.to('.tz-orbit', { rotate: 360, duration: 30, repeat: -1, ease: 'none' });
    gsap.utils.toArray('[data-rv]').forEach((el) => gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));
    ScrollTrigger.batch('.deliv-grid > div, .stat', { start: 'top 90%', onEnter: (b) => gsap.from(b, { y: 50, opacity: 0, stagger: 0.1, duration: 1, ease: 'expo.out' }), once: true });
    gsap.from('.foot .big', { yPercent: 30, opacity: 0, ease: 'expo.out', duration: 1.4, scrollTrigger: { trigger: '.foot', start: 'top 85%' } });
    return () => mm.revert();
  }, { scope: root });

  const tonos = (fam) => productos.filter((p) => p.familia === fam && p.visible);
  const conFoto = productos.filter((p) => p.foto && p.visible);

  return (
    <main ref={root}>
      {/* HERO */}
      <section className="hero">
        <div className="wrap" style={{ width: '100%' }}>
          <div className="grid">
            <div>
              <p className="eyebrow" style={{ marginBottom: 22 }}>Tienda en línea · CDMX</p>
              <h1 className="h-xl">
                <span className="ln fall"><span className="wd">Cambia</span></span>
                <span className="ln fall"><span className="wd">el</span> <span className="wd">color,</span></span>
                <span className="ln fall"><span className="wd it gold">no</span> <span className="wd it gold">tu</span> <span className="wd it gold">mirada.</span></span>
              </h1>
              <p className="lead">Pupilentes de color con y sin graduación. Elige tu tono, apártalo con la graduación de cada ojo y recíbelo en el Metro o en cualquier parte de México.</p>
              <div className="ctas">
                <TLink to="/tienda" className="btn">Ver la tienda <ArrowRight size={18} /></TLink>
                <TLink to="/tono" className="btn ghost">Encuentra tu tono</TLink>
              </div>
            </div>
            <div className="hero-eye">
              <svg className="ring" viewBox="0 0 400 400" aria-hidden="true">
                <circle cx="200" cy="200" r="196" fill="none" stroke="var(--line)" />
                <circle cx="200" cy="200" r="150" fill="none" stroke="var(--gold-l)" />
                <defs><path id="cp" d="M200,200 m-172,0 a172,172 0 1,1 344,0 a172,172 0 1,1 -344,0" /></defs>
                <g className="txt"><text fontFamily="Geist Mono, monospace" fontSize="11" letterSpacing="4.4" fill="currentColor"><textPath href="#cp">PUPILENTES AGO · GRADUACIÓN −0.50 A −8.00 · ENTREGA EN CDMX · ENVÍOS A TODO MÉXICO ·</textPath></text></g>
              </svg>
              {HERO_TONOS.map((t, i) => <Iris key={t.fam} fam={t.fam} style={{ opacity: hi === i ? 1 : 0, transition: 'opacity 1.2s ease', position: 'absolute', inset: '13%', width: 'auto' }} />)}
              <div className="tag" style={{ left: '-2%', bottom: '14%' }}><span className="dot" style={{ background: FAMILIAS.find((f) => f.id === HERO_TONOS[hi].fam).hex }} /><b style={{ fontWeight: 600 }}>{HERO_TONOS[hi].n}</b><span className="mute it serif">{HERO_TONOS[hi].a}</span></div>
              <div className="tag mono" style={{ right: '0', top: '10%', fontSize: 12 }}>OD −2.25 · OI −2.50</div>
            </div>
          </div>
          <div className="hero-facts">
            <div><b>−0.50 a −8.00</b>Graduación distinta por ojo</div>
            <div><b>Gratis</b>Entrega en Metro Pantitlán y Tepalcates</div>
            <div><b>Con guía</b>Envíos a todo México con rastreo</div>
          </div>
        </div>
      </section>

      <div className="band" aria-hidden="true"><div className="track">{[0, 1].map((k) => <div key={k} style={{ display: 'flex' }}>{['−0.50 a −8.00', 'Entrega gratis en Metro', 'Envíos a todo México', 'Con y sin graduación', '16 tonos'].map((w) => <span key={w}>{w}<i>✦</i></span>)}</div>)}</div></div>

      {/* FAMILIAS */}
      <section className="fams" aria-label="Nuestra tienda">
        <div className="fams-stage">
          <div className="fams-top"><div className="wrap"><div><p className="eyebrow" style={{ color: 'var(--gold-l)' }}>Nuestra tienda</p><p className="h-m" style={{ marginTop: 8, maxWidth: '16ch' }}>Cuatro familias, <span className="it" style={{ color: 'var(--gold-l)' }}>dieciséis tonos</span></p></div><span className="fams-count">01 / 04</span></div></div>
          <div className="fams-word" aria-hidden="true">{FAMILIAS.map((f) => <span key={f.id}>{f.nombre}</span>)}</div>
          <div className="fams-eye">{FAMILIAS.map((f) => <Iris key={f.id} fam={f.id} style={{ width: '100%' }} />)}</div>
          <div className="fams-info"><div className="wrap">
            <div style={{ display: 'grid' }}>
              {FAMILIAS.map((f) => (
                <div className="fam-card" key={f.id}>
                  <h3>{f.nombre}</h3><p>{f.frase}</p>
                  <div className="fam-tones">{tonos(f.id).map((p) => <span key={p.id}>{p.nombre}</span>)}</div>
                  <TLink to={`/tienda?f=${f.id}`} className="btn light sm" style={{ marginTop: 16 }}>Ver {f.nombre.toLowerCase()} <ArrowUpRight size={16} /></TLink>
                </div>
              ))}
            </div>
            <div className="fams-prog" aria-hidden="true">{FAMILIAS.map((f) => <i key={f.id}><b /></i>)}</div>
          </div></div>
        </div>
      </section>

      {/* POR QUÉ NOSOTRAS */}
      <section className="why3">
        <div className="wrap">
          <p className="eyebrow">Por qué con nosotras</p>
          <p className="why3-big">{'Cada par pasa por nuestras manos antes de llegar a las tuyas.'.split(' ').map((w, i) => <span className="w" key={i}>{w === 'manos' ? <em>{w}</em> : w} </span>)}</p>
          <ol className="why3-list">{PROMESAS.map(([t, d], i) => (
            <li className="row" key={t}><i className="ln-d" /><span className="n">0{i + 1}</span><h3><span>{t}</span></h3><p>{d}</p></li>
          ))}</ol>
          <TLink to="/nosotros" className="link" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginTop: 30, fontWeight: 600 }}>Conoce nuestra historia <ArrowUpRight size={16} /></TLink>
        </div>
        <div className="wrap stats">
          <div className="stat"><b data-n="24">24</b><span>graduaciones, de −0.50 a −8.00</span></div>
          <div className="stat"><b data-n="16">16</b><span>tonos en 4 familias</span></div>
          <div className="stat"><b data-n="6" data-p="1–">1–6</b><span>días a todo México con guía</span></div>
          <div className="stat"><b data-n="0" data-p="$">$0</b><span>entrega en Metro Pantitlán y Tepalcates</span></div>
        </div>
      </section>

      {/* CÓMO COMPRAR */}
      <section className="how2">
        <div className="wrap">
          <div className="steps-head" data-rv><div><p className="eyebrow">Cómo comprar</p><h2 className="h-l" style={{ marginTop: 12 }}>Tres pasos, <span className="it gold">cero esperas.</span></h2></div><p className="lead">Todo lo eliges tú, desde tu celular. Sin esperar respuesta por mensaje.</p></div>
          <div className="how2-line" aria-hidden="true"><b /></div>
          <div className="how2-grid">
            {PASOS.map(([t, d], i) => (
              <article className="how2-card" key={t}>
                <div className="hd"><span className="n">0{i + 1}</span><span className="dotn" /></div>
                <h3>{t}</h3><p>{d}</p>
                <div className="mui">
                  {i === 0 && <><div className="mrow"><Iris fam="verde" size={44} /><span><b>Breeze Green</b><small>verde oliva natural</small></span></div><div className="mrow two"><span className="pill-m">OD <b>−1.75</b><i className="ok" /></span><span className="pill-m">OI <b>−2.25</b><i className="lo" /></span></div><span className="mbtn">Agregar · $649</span></>}
                  {i === 1 && <><div className="mrow mono" style={{ letterSpacing: '.2em' }}>CP 76000</div>{[['Estafeta', '3–5 días', 160], ['DHL Express', '1–2 días', 263]].map(([a, b, c], k) => <div key={a} className={'mrow rate ' + (k ? '' : 'on')}><span><b>{a}</b><small>{b}</small></span><b className="mono">${c}</b></div>)}<div className="mrow rate"><span><b>Metro Pantitlán</b><small>Agenda día y hora</small></span><b className="mono">Gratis</b></div></>}
                  {i === 2 && <><div className="mrow"><span><b>Pedido AGO-1047</b><small>Pago validado ✓</small></span></div><div className="mrow"><Truck size={18} /><span><b className="mono">7724 6612 09MX</b><small>Estafeta · en camino</small></span></div><div className="mrow gold-row"><Check size={16} /> +64 puntos AGO</div></>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TEASER: ENCUENTRA TU TONO */}
      <section className="tz">
        <div className="wrap tz-grid">
          <div data-rv>
            <p className="eyebrow" style={{ color: 'var(--gold-l)' }}>Test de tono</p>
            <h2 className="h-l" style={{ margin: '14px 0 20px' }}>¿No sabes cuál? <span className="it" style={{ color: 'var(--gold-l)' }}>Te decimos en 60 segundos.</span></h2>
            <p style={{ color: 'rgba(251,250,247,.7)', maxWidth: '44ch', marginBottom: 28 }}>Seis preguntas sobre tus ojos, tu piel y para cuándo los quieres. Te mostramos tus tres tonos ideales en una persona real.</p>
            <TLink to="/tono" className="btn light">Hacer el test <ArrowRight size={18} /></TLink>
          </div>
          <div className="tz-art" aria-hidden="true">
            <div className="tz-orbit">{FAMILIAS.map((f, i) => <Iris key={f.id} fam={f.id} style={{ position: 'absolute', width: '22%', left: `${50 + 40 * Math.cos((i / 4) * 6.283) - 11}%`, top: `${50 + 40 * Math.sin((i / 4) * 6.283) - 11}%` }} />)}</div>
            <img className="tz-face" src={A('img/lookbook/gemini-hazel-1-rostro.webp')} alt="" loading="lazy" />
            {['¿Ojos claros u oscuros?', '¿Natural o que se note?', '¿Para diario o fiesta?', '¿Tu tono de piel?', '¿Usas graduación?'].map((q, i) => <span key={q} className={'tz-chip c' + i}>{q}</span>)}
          </div>
        </div>
      </section>

      {/* LOOKS (horizontal con el scroll) */}
      <section className="looks-pin">
        <div className="wrap looks-head"><div><p className="eyebrow">Fotos de clientas</p><h2 className="h-l" style={{ marginTop: 10 }}>En ojos <span className="it gold">reales</span></h2></div><TLink to="/tienda" className="link">Ver todos los tonos</TLink></div>
        <div className="looks-track">
          {conFoto.map((p) => (
            <button className="look" key={p.id} onClick={() => setSheet(p)}>
              <div className="ph"><img src={A(p.foto)} alt={`${p.nombre} puesto`} loading="lazy" /><span className="tg">{mxn(p.precio)}</span></div>
              <div className="cap"><b>{p.nombre}</b><span className="it serif mute">{p.alias}</span></div>
            </button>
          ))}
          <TLink to="/probador" className="look look-cta">
            <div className="ph"><img src={A('img/lookbook/angeles-n-blue-4-rostro.webp')} alt="" loading="lazy" /><div className="ov"><p className="h-m">Míralos en 4 personas distintas</p><span className="btn light sm">Abrir lookbook <ArrowRight size={16} /></span></div></div>
          </TLink>
        </div>
      </section>

      {/* ENTREGAS */}
      <section className="deliv" id="entregas"><div className="wrap">
        <div className="steps-head" data-rv><h2 className="h-l">Te lo <span className="it gold">llevamos</span></h2><p className="lead">Elige la opción al pagar; el costo se calcula solo.</p></div>
        <div className="deliv-grid">
          <div><Train size={26} strokeWidth={1.3} /><h4>Metro Pantitlán o Tepalcates</h4><p>Entrega personal. Agendas día y hora al comprar. Otras estaciones con costo extra.</p><div className="price">GRATIS · OTRAS ESTACIONES +$60</div></div>
          <div><Car size={26} strokeWidth={1.3} /><h4>DiDi el mismo día</h4><p>En CDMX y zona oriente. Se cotiza con tu dirección completa antes de pagar.</p><div className="price">DESDE $75</div></div>
          <div><Package size={26} strokeWidth={1.3} /><h4>Paquetería a todo México</h4><p>Estafeta, DHL, FedEx o J&T. Cotizas con tu CP y recibes tu número de guía.</p><div className="price">DESDE $109 · 1 A 6 DÍAS</div></div>
        </div>
      </div></section>

      {/* FAQ */}
      <section className="faq"><div className="wrap grid">
        <h2 className="h-l" data-rv>Dudas <span className="it">frecuentes</span></h2>
        <div>
          {[
            ['¿Puedo pedir una graduación distinta en cada ojo?', 'Sí. Al elegir tu tono activa “Con graduación” y desmarca “Misma graduación en ambos ojos”. El sistema revisa la existencia de cada ojo por separado.'],
            ['¿Cuánto duran?', 'Los tonos de este catálogo son de uso anual con el cuidado adecuado. Te mandamos un recordatorio por WhatsApp cuando toque renovarlos.'],
            ['¿Cómo pago?', 'Por transferencia. Al terminar tu pedido se abre WhatsApp con tu resumen listo: solo adjuntas tu comprobante y envías.'],
            ['¿Cómo sigo mi pedido?', 'Entra a “Mi cuenta” con tu número de WhatsApp: ahí ves el estado, tu número de guía y tus puntos AGO.'],
            ['¿Cómo funcionan los puntos?', 'Ganas 1 punto por cada $10 de compra. Cada punto vale $0.50 en tu siguiente pedido.'],
          ].map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </div></section>

      <ProductSheet p={sheet} onClose={() => setSheet(null)} />
    </main>
  );
}
