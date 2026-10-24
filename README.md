# Pupilentes AGO

Pupilentes de color con y sin graduación · tienda en línea, test de tono, lookbook, cuenta con puntos y panel de la dueña.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/
```

### Subir a Vercel
1. Sube la carpeta a GitHub (node_modules y dist ya están en .gitignore).
2. En Vercel: **Add New → Project →** importa el repo.
3. Framework Preset: **Vite** · Build Command: `npm run build` · Output Directory: `dist`.
4. Deploy. Usa HashRouter (`/#/tienda`), así que no hace falta configurar rewrites.

## Rutas
| Ruta | Qué es |
|---|---|
| `#/` | Landing: propósito claro (pupilentes de color con/sin graduación, entrega CDMX y nacional) |
| `#/tienda` | Catálogo por 4 familias (Azules, Verdes, Cafés & Miel, Grises) + filtro "Mi graduación" |
| `#/checkout` | Entrega (Metro / DiDi / paquetería con cotizador por CP) → datos de guía → transferencia + comprobante |
| `#/pedido/AGO-1047` | Rastreo del pedido y número de guía |
| `#/tono` | Test de tono (6 preguntas) con resultado en una persona con tu tono de piel |
| `#/probador` | Lookbook: 4 personas × 16 tonos × 3 ángulos, comparador antes/después, cámara opcional |
| `#/nosotros` | Historia de la marca (texto de demo) con línea de tiempo horizontal |
| `#/cuenta` | Mi cuenta por WhatsApp: puntos AGO, nivel, pedidos y guía, receta, renovación |
| `#/panel` | Panel de Araceli: Hoy · Pedidos · Inventario · Catálogo · Clientas |

## Decisiones de diseño
- Paleta: blanco cálido `#FBFAF7` como base, tinta `#141210` y oro `#A3824C` en tonos (claro/oscuro). Sin degradados decorativos (eran lo que se veía mal en celular).
- Tipografía (archivos locales en `src/fonts`): **DM Serif Display** (titulares) + **Manrope** (texto) + **Geist Mono** (graduaciones, precios, folios).
- Fotos del lookbook en `public/img/lookbook/` son ILUSTRATIVAS (lente aplicado por computadora sobre retratos de modelo). Reemplazar por fotos reales con el mismo nombre: `{tono}-{persona}-{rostro|mirada|detalle}.webp`.
- Animación con GSAP + ScrollTrigger: intro con el logo, hero con titulares que suben, banda que acelera con el scroll, escena anclada de familias (el iris cambia de color al hacer scroll), manifiesto palabra por palabra.
- Existencias en **piezas** (1 lente = 1 pieza) por graduación: así se resuelve la graduación distinta por ojo sin confirmar por mensaje.

## Pendiente de confirmar con la clienta (marcado como demo en `src/lib/catalog.js`)
- La historia de `#/nosotros` es INVENTADA para la demo: reemplazar con la real.
- Precios ($549 plano / $649 graduado), lista real de tonos por familia (los marcados `demo: true` son de relleno), datos bancarios.
- Cotizador de paquetería y "Generar guía" están simulados; en producción se conectan a la API de Skydropx o Envia.com.

## Asistente (chatbot) · v4.1
Botón flotante abajo a la derecha (reemplaza al de WhatsApp). Código: `src/chat/ChatBot.jsx`, conocimiento en `src/lib/chatbot-kb.js`, API en `api/chat.js`.

- **Botones rápidos**: se contestan en el navegador, sin IA, sin costo y sin gastar preguntas.
- **Texto libre**: va a `/api/chat` → Claude Haiku 5.5, máx. 6 preguntas por sesión; lo que no sabe lo deriva a WhatsApp con la duda prellenada.
- **Sin clave de IA o en hosting estático**: cae solo a "modo básico" por palabras clave.
- **Protección de costos**: Turnstile (anti-bots) → token de sesión firmado → límite por IP por minuto y por día → límite por sesión → tope diario global → `max_tokens` fijo. Además, poner un límite de gasto mensual en la consola de Anthropic.
- Configuración: copia `.env.example` a `.env.local` (desarrollo) y a las variables de entorno de Vercel. `npm run dev` ya sirve `/api/chat` localmente.
- Para cambiar respuestas, precios o tonos que conoce el bot: edita `src/lib/chatbot-kb.js`.
