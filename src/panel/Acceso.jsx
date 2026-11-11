import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Smartphone, LogOut, ArrowUpRight } from 'lucide-react';
import { LOGO } from '../ui';
import { useSesion } from './sesion';

// Pantallas de acceso al panel: contraseña → app autenticadora (alta o código) → dentro.
export default function Acceso() {
  const { estado, error, motivoSalida, usuario } = useSesion();
  return (
    <div className="acceso">
      <div className="acceso-box">
        <Link to="/" className="brand" style={{ marginBottom: 22 }}><img src={LOGO} alt="" />AGO · PANEL</Link>
        {estado === 'cargando' && <p className="mute" role="status">Revisando tu sesión…</p>}
        {estado === 'sin_configurar' && <p role="alert">Falta configurar Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY).</p>}
        {estado === 'fuera' && <Login />}
        {estado === 'mfa_enrolar' && <Enrolar />}
        {estado === 'mfa_verificar' && <Verificar />}
        {estado === 'sin_acceso' && (<>
          <h1 className="h-s">Sin acceso al panel</h1>
          <p className="mute" style={{ margin: '10px 0 18px' }}>La cuenta {usuario?.email} no tiene permiso para el panel. Si es un error, pide al equipo que la habilite.</p>
          <Salir />
        </>)}
        {motivoSalida === 'inactividad' && estado === 'fuera' && <p className="note" role="status">Cerramos tu sesión por inactividad (30 min).</p>}
        {error && <p className="err" role="alert">{error}</p>}
        <div style={{ marginTop: 22 }}><Link to="/" className="link mute" style={{ fontSize: 13, display: 'inline-flex', gap: 4 }}>Ver tienda <ArrowUpRight size={13} /></Link></div>
      </div>
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
      <h1 className="h-s">Entrar al panel</h1>
      <p className="mute" style={{ margin: '6px 0 18px' }}>Correo y contraseña; después, el código de tu app autenticadora.</p>
      <div className="field"><label htmlFor="correo">Correo</label><input id="correo" className="inp" type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} /></div>
      <div className="field"><label htmlFor="contrasena">Contraseña</label><input id="contrasena" className="inp" type="password" autoComplete="current-password" required value={contrasena} onChange={(e) => setContrasena(e.target.value)} /></div>
      <button className="btn full" style={{ marginTop: 16 }} disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
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
      <button className="btn full" style={{ marginTop: 14 }} disabled={enviando || codigo.length !== 6}>{enviando ? 'Verificando…' : texto}</button>
    </form>
  );
}

function Verificar() {
  const verificar = useSesion((s) => s.verificar);
  return (<>
    <h1 className="h-s"><Smartphone size={22} style={{ verticalAlign: '-3px' }} /> Código de tu app</h1>
    <p className="mute" style={{ margin: '6px 0 18px' }}>Abre Google Authenticator (o la app que usaste) y escribe el código de “Panel AGO”.</p>
    <Codigo alEnviar={verificar} texto="Verificar" />
    <p className="mute" style={{ fontSize: 13, marginTop: 14 }}>¿Perdiste tu teléfono? Pide al equipo de HummingX que reinicie tu verificación.</p>
    <Salir />
  </>);
}

function Enrolar() {
  const { enrolamiento, iniciarEnrolamiento, verificar } = useSesion();
  useEffect(() => { if (!enrolamiento) iniciarEnrolamiento(); }, []);
  return (<>
    <h1 className="h-s"><ShieldCheck size={22} style={{ verticalAlign: '-3px' }} /> Protege tu cuenta</h1>
    <p className="mute" style={{ margin: '6px 0 14px' }}>El panel pide un segundo paso: un código que cambia cada 30 segundos en tu teléfono.</p>
    <ol className="pasos">
      <li>Instala <b>Google Authenticator</b> o <b>Microsoft Authenticator</b>.</li>
      <li>En la app, toca “+” y escanea este código.</li>
      <li>Escribe aquí el código de 6 dígitos que te muestra.</li>
    </ol>
    {enrolamiento ? (<>
      <img className="qr" src={enrolamiento.qr} alt="Código QR para la app autenticadora" width="200" height="200" />
      <details style={{ margin: '6px 0 12px', fontSize: 13 }}><summary className="mute">¿No puedes escanear? Escribe esta clave</summary><code className="mono" style={{ wordBreak: 'break-all' }}>{enrolamiento.secreto}</code></details>
      <Codigo alEnviar={verificar} texto="Activar y entrar" />
    </>) : <p className="mute" role="status">Preparando tu código…</p>}
    <Salir />
  </>);
}

function Salir() {
  const salir = useSesion((s) => s.salir);
  return <button className="btn sm ghost" style={{ marginTop: 14 }} onClick={() => salir()}><LogOut size={15} /> Salir</button>;
}
