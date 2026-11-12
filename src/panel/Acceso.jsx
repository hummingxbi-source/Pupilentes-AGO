import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Smartphone, LogOut, ArrowUpRight } from 'lucide-react';
import { LOGO } from '../ui';
import { FAMILIAS } from '../lib/catalog';
import { useSesion } from './sesion';

/**
 * Lado oscuro: el contorno de un lente en líneas doradas (borde, zona de color y zona óptica)
 * con un anillo punteado que gira despacio y, sobre él, el color de cada familia de tonos.
 * Abajo, el logotipo en el estilo del footer.
 */
function Escena() {
  const R = 300;                               // radio de la órbita de los colores
  const muestras = FAMILIAS.map((f, k) => {
    const a = (150 + k * 26) * (Math.PI / 180);    // repartidos en el arco izquierdo (la parte visible)
    return { ...f, x: 400 + R * Math.cos(a), y: 400 - R * Math.sin(a) };
  });
  return (
    <aside className="acceso-escena" aria-hidden="true">
      <div className="acceso-cabeza"><img src={LOGO} alt="" /><span>Panel de la tienda</span></div>
      <svg className="acceso-lente" viewBox="0 0 800 800">
        <circle cx="400" cy="400" r="380" className="l1" />
        <circle cx="400" cy="400" r="300" className="l2" />
        <g className="giro"><circle cx="400" cy="400" r="240" className="l3" /></g>
        <circle cx="400" cy="400" r="150" className="l1" />
        <circle cx="400" cy="400" r="62" className="pupila" />
        {muestras.map((m) => (
          <g key={m.id}>
            <circle cx={m.x} cy={m.y} r="22" style={{ fill: m.hex }} className="muestra" />
            <circle cx={m.x} cy={m.y} r="30" className="l1" />
          </g>
        ))}
      </svg>
      <ul className="acceso-familias">{FAMILIAS.map((f) => <li key={f.id}><i style={{ background: f.hex }} />{f.nombre}</li>)}</ul>
      <p className="acceso-marca">Pupilentes<em>AGO</em></p>
    </aside>
  );
}

// Pantallas de acceso al panel: contraseña → app autenticadora (alta o código) → dentro.
export default function Acceso() {
  const { estado, error, motivoSalida, usuario } = useSesion();
  return (
    <div className="acceso">
      <Escena />
      <main className="acceso-form">
        <div className="acceso-caja">
          {estado === 'cargando' && <p className="mute" role="status">Revisando tu sesión…</p>}
          {estado === 'sin_configurar' && <p role="alert">Falta configurar Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY).</p>}
          {motivoSalida === 'inactividad' && estado === 'fuera' && <p className="acceso-aviso" role="status">Cerramos tu sesión tras 30 minutos sin actividad.</p>}
          {estado === 'fuera' && <Login />}
          {estado === 'mfa_enrolar' && <Enrolar />}
          {estado === 'mfa_verificar' && <Verificar />}
          {estado === 'sin_acceso' && (<>
            <h1>Esta cuenta no entra al panel</h1>
            <p className="acceso-sub">{usuario?.email} no tiene permiso. Si es un error, pide al equipo que la habilite.</p>
            <Salir />
          </>)}
          {error && <p className="err" role="alert">{error}</p>}
          <Link to="/" className="acceso-tienda">Ver la tienda <ArrowUpRight size={14} /></Link>
        </div>
      </main>
    </div>
  );
}

function Login() {
  const entrar = useSesion((s) => s.entrar);
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const enviar = async (e) => { e.preventDefault(); setEnviando(true); await entrar(correo, contrasena); setEnviando(false); };
  return (
    <form onSubmit={enviar}>
      <h1>Hola de nuevo</h1>
      <p className="acceso-sub">Entra con tu correo y contraseña. Después te pedimos el código de tu app.</p>
      <div className="field"><label htmlFor="correo">Correo</label><input id="correo" className="inp" type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} /></div>
      <div className="field"><label htmlFor="contrasena">Contraseña</label><input id="contrasena" className="inp" type="password" autoComplete="current-password" required value={contrasena} onChange={(e) => setContrasena(e.target.value)} /></div>
      <button className="btn full acceso-btn" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar al panel'}</button>
    </form>
  );
}

function Codigo({ alEnviar, texto }) {
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const enviar = async (e) => { e.preventDefault(); setEnviando(true); await alEnviar(codigo); setEnviando(false); setCodigo(''); };
  return (
    <form onSubmit={enviar}>
      <div className="field"><label htmlFor="codigo">Código de 6 dígitos</label>
        <input id="codigo" className="inp mono" style={{ fontSize: 24, letterSpacing: '.3em', textAlign: 'center' }} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} />
      </div>
      <button className="btn full acceso-btn" disabled={enviando || codigo.length !== 6}>{enviando ? 'Verificando…' : texto}</button>
    </form>
  );
}

function Verificar() {
  const verificar = useSesion((s) => s.verificar);
  return (<>
    <Smartphone className="acceso-ico" size={26} strokeWidth={1.4} />
    <h1>Tu código</h1>
    <p className="acceso-sub">Abre Google Authenticator (o la app que usaste) y escribe el código de “Panel AGO”.</p>
    <Codigo alEnviar={verificar} texto="Verificar" />
    <p className="acceso-nota">¿Perdiste tu teléfono? Pide al equipo de HummingX que reinicie tu verificación.</p>
    <Salir />
  </>);
}

function Enrolar() {
  const { enrolamiento, iniciarEnrolamiento, verificar } = useSesion();
  useEffect(() => { if (!enrolamiento) iniciarEnrolamiento(); }, []);
  return (<>
    <ShieldCheck className="acceso-ico" size={26} strokeWidth={1.4} />
    <h1>Protege tu cuenta</h1>
    <p className="acceso-sub">El panel pide un segundo paso: un código que cambia cada 30 segundos en tu teléfono.</p>
    <ol className="pasos">
      <li>Instala <b>Google Authenticator</b> o <b>Microsoft Authenticator</b>.</li>
      <li>En la app, toca “+” y escanea este código.</li>
      <li>Escribe aquí el código de 6 dígitos que te muestra.</li>
    </ol>
    {enrolamiento ? (<>
      <img className="qr" src={enrolamiento.qr} alt="Código QR para la app autenticadora" width="200" height="200" />
      <details className="acceso-clave"><summary>¿No puedes escanear? Escribe esta clave</summary><code className="mono" style={{ wordBreak: 'break-all' }}>{enrolamiento.secreto}</code></details>
      <Codigo alEnviar={verificar} texto="Activar y entrar" />
    </>) : <p className="mute" role="status">Preparando tu código…</p>}
    <Salir />
  </>);
}

function Salir() {
  const salir = useSesion((s) => s.salir);
  return <button className="acceso-salir" onClick={() => salir()}><LogOut size={15} /> Salir</button>;
}
