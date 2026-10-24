import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Nav, Footer, Bag, Toast, Curtain, TLink } from './ui';
import ChatBot from './chat/ChatBot';
import Landing from './pages/Landing';

gsap.registerPlugin(ScrollTrigger);
const Tienda = lazy(() => import('./pages/Tienda'));
const Tono = lazy(() => import('./pages/Tono'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Pedido = lazy(() => import('./pages/Pedido'));
const Cuenta = lazy(() => import('./pages/Cuenta'));
const Nosotros = lazy(() => import('./pages/Nosotros'));
const Probador = lazy(() => import('./pages/Probador'));
const Panel = lazy(() => import('./panel/Panel'));

function Smooth() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    if (pathname.startsWith('/panel') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(tick); lenis.destroy(); window.__lenis = null; };
  }, [pathname]);
  return null;
}

function DemoPill() {
  const [on, setOn] = useState(false);
  useEffect(() => { const f = () => setOn(scrollY > innerHeight * 0.9); f(); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f); }, []);
  const { pathname } = useLocation();
  // El asistente reemplaza al botón flotante de WhatsApp: resuelve lo básico y deriva lo demás.
  return <><div className={on ? '' : 'pre-scroll'}><div className="demo-pill">Demo <TLink to="/panel">Ver panel de la dueña →</TLink></div></div><ChatBot visible={on || pathname !== '/'} /></>;
}

function Shop({ children, dark, bare }) {
  return (<><Nav dark={dark} />{children}{!bare && <Footer />}<Bag />{!bare && <DemoPill />}</>);
}

export default function App() {
  return (
    <HashRouter>
      <Smooth />
      <Curtain />
      <Suspense fallback={<div style={{ minHeight: '100svh' }} />}>
        <Routes>
          <Route path="/" element={<Shop><Landing /></Shop>} />
          <Route path="/nosotros" element={<Shop dark><Nosotros /></Shop>} />
          <Route path="/tienda" element={<Shop><Tienda /></Shop>} />
          <Route path="/tono" element={<Shop dark bare><Tono /></Shop>} />
          <Route path="/probador" element={<Shop><Probador /></Shop>} />
          <Route path="/cuenta" element={<Shop><Cuenta /></Shop>} />
          <Route path="/pedido/:folio?" element={<Shop><Pedido /></Shop>} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/panel/*" element={<Panel />} />
        </Routes>
      </Suspense>
      <Toast />
    </HashRouter>
  );
}
