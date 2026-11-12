# Frontend · La demo como punto de partida

> Complementa a [`ARQUITECTURA.md`](ARQUITECTURA.md). Aquí se explica qué es fijo y qué es libre en el frontend.

## 1. Qué es la demo

La demo (rama `demo`, tag `demo-v1`) es **la propuesta que ideamos nosotros** para cerrar la venta: estructura de pantallas, flujo de compra, estilo visual y animaciones. La clienta la vio y la aprobó **como idea**, no como diseño final cerrado.

Por eso:
- **Es el punto de partida, no un contrato visual.** Quien programe puede cambiar el diseño, mover secciones, simplificar animaciones o quitar cosas que no aporten.
- **Lo que sí es fijo son las reglas de negocio y los flujos** (sección 3). El *cómo se ve* es libre; el *qué hace* no.
- Los cambios grandes de diseño (quitar una sección completa, cambiar la paleta o el tono de marca) se platican antes con el equipo, porque la clienta ya vio la demo.

## 2. Flujo natural de trabajo: partir de lo que ya existe

No se reescribe el frontend desde cero. El camino es **conservar los componentes actuales y cambiarles la fuente de datos**, una pantalla a la vez:

1. Hoy cada pantalla lee de `src/lib/store.js` (Zustand + `localStorage`) y de `src/lib/catalog.js` (datos fijos).
2. En cada fase, la pantalla que toca pasa a leer y escribir en **Supabase** (directo con RLS, o vía Edge Function cuando hay secretos o reglas de negocio; ver ARQUITECTURA §3).
3. El store de Zustand se queda solo para **estado de interfaz**: bolsa, modales, avisos y sesión en memoria. Los datos de negocio vienen de la BD.
4. Si al conectar una pantalla conviene rediseñarla, se hace en esa misma rama de fase.

**Orden sugerido (sigue las fases):**

| Fase | Pantallas que se conectan |
|---|---|
| 1 ✅ | `Landing`, `Tienda`, ficha de producto, `Tono`, `Probador`, bolsa (catálogo desde la BD). El panel sigue con datos de la demo hasta la Fase 2 |
| 2 ✅ | `/panel`: acceso con MFA (`Acceso.jsx`, `sesion.js`), Inventario, Catálogo, Hoy, Pedidos (solo lectura), Clientas (`datos.js`) |
| 3 | `Checkout`, `Pedido` (pagos y rastreo reales) |
| 4 | `Checkout` (cotizador Envia.com), panel → generar guía |
| 5–6 | Panel → vincular publicaciones de ML y TikTok |
| 7 | `Cuenta` (login por correo y puntos) |
| — | `Tono` y `Probador` no necesitan BD; se conservan tal cual (salvo ajustes de diseño) |

## 3. Qué es fijo (no se cambia sin acordarlo)

- Se vende **por par**; la graduación es la misma en ambos ojos.
- Selector de producto: **color/diseño → duración → graduación** (o "sin graduación").
- El precio que se muestra es informativo; **el que se cobra lo calcula el servidor**.
- Métodos de pago: **Mercado Pago** y **transferencia con comprobante**.
- Entregas: **Metro, DiDi y paquetería** (Envia.com).
- **Nunca mencionar el nombre de la dueña en la web pública.**
- El panel exige login (con MFA para la dueña).
- Móvil primero: la mayoría de las clientas llegan desde el celular.

## 4. Qué es libre

- Colores, tipografías, espaciados y componentes visuales (`src/styles.css`, `src/ui.jsx`).
- Animaciones (GSAP/Lenis): se pueden simplificar o quitar si afectan el rendimiento en celular.
- Orden y contenido de secciones de la landing y de "Nosotros".
- Textos de interfaz (siempre en español).
- Organización interna de componentes y carpetas dentro de `src/`.

## 5. Mapa de la demo (para ubicarse)

| Ruta | Archivo | Qué es |
|---|---|---|
| `/` | `src/pages/Landing.jsx` | Landing con animaciones |
| `/tienda` | `src/pages/Tienda.jsx` | Catálogo por familias + filtro de graduación |
| `/checkout` | `src/pages/Checkout.jsx` | Entrega (Metro / DiDi / paquetería) y pago |
| `/pedido/:folio` | `src/pages/Pedido.jsx` | Rastreo |
| `/tono` | `src/pages/Tono.jsx` | Test de tono |
| `/probador` | `src/pages/Probador.jsx` | Lookbook y cámara (MediaPipe) |
| `/nosotros` | `src/pages/Nosotros.jsx` | Historia (texto de demo; se reemplaza por el real) |
| `/cuenta` | `src/pages/Cuenta.jsx` | Cuenta y puntos |
| `/panel` | `src/panel/Panel.jsx`, `src/panel/Gestion.jsx` | Panel de la dueña |
| — | `src/lib/store.js` | Estado (Zustand); hoy guarda todo en `localStorage` |
| — | `src/lib/catalog.js` | Catálogo, precios y cotizadores **simulados** |
| — | `src/lib/tienda.js` | **Catálogo desde la BD** (vista `catalogo_publico`) con caché en el navegador; lo usan todas las pantallas de la tienda (Fase 1) |
| — | `src/lib/supabase.js`, `src/lib/api.js` | Cliente de Supabase (llave publicable) y llamadas a Edge Functions (Fase 0) |
| — | `src/lib/excel.js` | Leer/escribir Excel y CSV (ExcelJS, se carga solo al usarse) |
| — | `src/ui.jsx`, `src/styles.css` | Componentes y estilos compartidos |
| — | `src/chat/` | Chatbot (**fuera de alcance**; se oculta con `VITE_CHATBOT=false`) |

## 6. Cosas de la demo que son de relleno

- La historia de `/nosotros` es **inventada**.
- Precios, tonos marcados `demo: true` en `catalog.js` y datos bancarios son de ejemplo.
- Las fotos del lookbook (`public/img/lookbook/`) son **ilustrativas**: lente aplicado por computadora sobre retratos de modelo.
- Cotizador de paquetería, "Generar guía", login por WhatsApp y puntos están **simulados**.
