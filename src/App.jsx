import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Nav, Footer, Bag, Toast, Curtain, TLink } from './ui';
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
// Chatbot fuera de alcance (ARQUITECTURA §1). Solo se incluye si VITE_CHATBOT=true;
// con cualquier otro valor Vite elimina el import del build.
const ChatBot = import.meta.env.VITE_CHATBOT === 'true' ? lazy(() => import('./chat/ChatBot')) : null;

function Smooth() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    // goTo() desde otra ruta deja pendiente la sección de la landing a la que se quería ir
    if (pathname === '/') {
      let sel = null; try { sel = sessionStorage.getItem('goto'); sessionStorage.removeItem('goto'); } catch { /* sin storage */ }
      if (sel) setTimeout(() => document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth' }), 600);
    }
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
  return <><div className={on ? '' : 'pre-scroll'}><div className="demo-pill">Demo <TLink to="/panel">Ver panel de la dueña →</TLink></div></div>{ChatBot && <Suspense fallback={null}><ChatBot visible={on || pathname !== '/'} /></Suspense>}</>;
}

function Shop({ children, dark, bare }) {
  return (<><Nav dark={dark} />{children}{!bare && <Footer />}<Bag />{!bare && <DemoPill />}</>);
}

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
