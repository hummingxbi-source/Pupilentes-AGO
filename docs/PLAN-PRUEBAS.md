# Pupilentes AGO · Plan de pruebas blindado (Fase 8)

> Complementa `docs/ARQUITECTURA.md` (§5 Fase 8, §6.3 y §7). **Solo planea: ninguna prueba de este documento se ha ejecutado.**
> Hecho el 17 nov 2026 sobre `main` en el commit `108cbc5` (PR #18). Se armó leyendo las rutas de `src/App.jsx`, los manejadores de `supabase/functions`, las migraciones y los títulos de las pruebas existentes (`supabase/tests`, `tests/seguridad`).
> Cada caso dice si **ya está automatizado** (y dónde) o si **falta**. "Falta" significa: probarlo a mano ahora y dejarlo automatizado antes de cerrar la Fase 8.

## 1. Cómo se usa

1. Levantar el entorno local con los 4 simuladores (README → "Backend local" y "Compras y pagos en local").
2. Correr la batería automática. Si algo sale en rojo, no se empieza lo manual.
3. Recorrer §4 (personas reales), luego §5 (varias personas a la vez), luego §6 (seguridad).
4. Después de **cada** caso, revisar las reglas de §2. Un caso solo pasa si su resultado es el esperado **y** las reglas siguen cumpliéndose.
5. Registrar cada fallo con el formato de §9. Cada error arreglado suma una prueba automática.

## 2. Reglas que nunca se rompen

Se revisan después de cada caso (en el panel y, si hay duda, con una consulta a la BD local).

| # | Regla | Dónde se ve |
|---|---|---|
| I1 | `stock ≥ 0` y `0 ≤ stock_reservado ≤ stock` en todas las variantes | `variantes` |
| I2 | El stock de una variante = stock inicial + suma de sus `movimientos_stock` | Panel → Inventario → historial |
| I3 | Lo apartado de una variante = suma de sus `reservas_stock` activas | `reservas_stock` |
| I4 | Todo pedido `pagado` (o posterior) tiene un pago aprobado con monto = `pedidos.total` y moneda MXN | `pagos` |
| I5 | El saldo de puntos = suma de `puntos_movimientos` y nunca es negativo | `/cuenta` y la tabla |
| I6 | Un mismo aviso, clic o lote repetido no genera un segundo movimiento | `movimientos_stock.ref_externa` |
| I7 | El estado del pedido solo cambió por una transición permitida (lista en `20261114000000_pedidos.sql`) | `pedidos.estado` |
| I8 | Toda acción de la dueña que mueve dinero, stock o precio quedó en `auditoria_panel` | Panel / tabla |
| I9 | Ninguna página pública muestra el nombre de la dueña, la CLABE fuera de la pantalla de transferencia, ni datos de otra clienta | Tienda |
| I10 | No hay alertas nuevas sin explicación | Panel → Hoy |

## 3. Personas y datos fijos

| Persona | Uso |
|---|---|
| **Inv-A** (correo A, teléfono …1111) | Compra sin cuenta; después crea cuenta con el mismo correo |
| **Inv-A2** (otro correo, mismo teléfono …1111) | Probar que el teléfono no liga pedidos a la cuenta |
| **Cli-B** (con cuenta y puntos) | Puntos, perfil, recompra |
| **Cli-C** (con cuenta) | No debe ver nada de A ni de B |
| **Dueña** (`duena`, MFA) | Todo el panel |
| **Ayudante** (`ayudante`, MFA) | Límites de su rol |
| **Bot** (script con curl) | Ataques de §6 |

Variantes preparadas con `panel-stock`: una con stock 1, una con 0, una con 25, una neutra, una graduada y un accesorio.

Valores vigentes que las pruebas usan como referencia (salen de las migraciones; la dueña los puede cambiar en `config_tienda`):

| Dato | Valor | Fuente |
|---|---|---|
| Apartado con tarjeta / transferencia / tope SPEI | 30 min / 24 h / 72 h | `20261114000000_pedidos.sql` |
| Máximo por renglón / por pedido | 5 / 10 pares | ídem |
| Pedidos sin pagar por teléfono | 3 | ídem |
| Metro Pantitlán y Tepalcates / otra estación | $0 / $60 | ídem (provisional) |
| DiDi por alcaldía | $75 a $185 | ídem (provisional) |
| Vigencia de la cotización de paquetería | 30 min | `20261115000000_envios.sql` |
| Puntos: 1 por cada $10 · valor $0.50 · tope 50 % · bono perfil 50 | — | `20261118000000_cuenta.sql` |
| Código de acceso: 6 dígitos, 10 min, 60 s entre envíos, 2 correos por hora en local | — | `supabase/config.toml` |
| Rastreo por folio: bloqueo al 6.º intento | — | `tests/seguridad/fase3.test.mjs` (ARQUITECTURA §3.3 F dice "5 por hora": confirmar cuál es el correcto) |

## 4. Recorridos de personas reales

Estado: **A** = ya automatizado (archivo) · **F** = falta automatizar · **M** = solo a mano.

### 4.1 Visitante y clienta invitada

| ID | Recorrido | Esperado | Estado |
|---|---|---|---|
| U1 | Landing → `/tienda` → filtro por graduación → ficha → `/nosotros`; recargar cada ruta | Sin 404; agotados marcados; disponible máximo 10; I9 | F (E2E) |
| U2 | `/tono` (test de tono) y `/probador` con cámara permitida y con cámara negada | Funciona; con cámara negada hay mensaje y la tienda sigue usable | M |
| U3 | Bolsa: agregar, cambiar cantidad, quitar, recargar la página, volver al día siguiente | La bolsa se conserva; los precios se refrescan desde la BD | F |
| U4 | Compra con tarjeta aprobada, envío por paquetería | `pagado`; stock −1; I4 | A `fase3`, `fase4` |
| U5 | Regreso de Mercado Pago: aprobado, rechazado, pendiente, y **cerrar la pestaña sin regresar** | El pedido queda bien en los 4 casos (manda el webhook, no la URL de regreso) | F |
| U6 | Pago rechazado y reintento con otra tarjeta sobre el mismo pedido | Un solo pedido; se paga al segundo intento | F |
| U7 | Pago abandonado 30 min | `expirado`; stock libre | A pgTAP `04` · F (E2E) |
| U8 | SPEI pendiente → acreditado; SPEI que nunca se paga (72 h) | Reserva extendida; luego `pagado` o `expirado` | A pgTAP `04` (extensión) · F (vencimiento) |
| U9 | Pago que llega tarde **con** stock (`expirado → pagado`) y **sin** stock (`pagado_sin_stock`) | Se confirma / alerta para reembolsar | A `fase3` (sin stock) · F (con stock) |
| U10 | Entrega en Metro (2 estaciones gratis, "otra" $60) y DiDi en 3 alcaldías | Costo del servidor; días sin domingo; 3 horarios | A pgTAP `04` (costo) · F (pantalla) |
| U11 | Transferencia: ver datos bancarios, avisar por WhatsApp o subir comprobante | `pendiente_validacion`; apartado 24 h | A pgTAP `04` · F (archivo, cuando exista R2) |
| U12 | Transferencia rechazada por la dueña; transferencia que nadie paga en 24 h | Reserva liberada; pedido cerrado | F |
| U13 | Rastreo con enlace; con folio + 4 dígitos; con token inventado en `/pedido/:clave` | Estado y guía sin domicilio; token falso no muestra nada | A `fase3` · F (token inventado) |
| U14 | Límites: 6 pares de un renglón, 11 en el pedido, 4.º pedido sin pagar del mismo teléfono | Rechazado con mensaje claro en pantalla | A (servidor) · F (mensaje en la caja) |
| U15 | El precio cambia mientras está en la caja | Ve el total nuevo antes de pagar | A (409) · F (pantalla) |
| U16 | Cotización de envío vencida (más de 30 min en la caja) | Se le pide cotizar otra vez | F |
| U17 | Compra completa desde un teléfono (iPhone y Android), con red lenta | Sin cortes; Turnstile carga | F (E2E móvil) |
| U18 | Sin internet a media compra / Turnstile bloqueado por un bloqueador de anuncios | Mensaje claro; no se crea un pedido a medias | M |

### 4.2 Clienta con cuenta y puntos

| ID | Recorrido | Esperado | Estado |
|---|---|---|---|
| C1 | Entrar con código; código equivocado; código vencido; pedir otro antes de 60 s | Solo entra con el correcto y vigente | A `fase7` · F (vencido) |
| C2 | Correo escrito con mayúsculas o con espacios | Es la misma cuenta | F |
| C3 | Inv-A crea cuenta: aparecen sus pedidos de invitada, sin contacto ni dirección | Ligados "por correo"; puntos sumados | A `fase7`, pgTAP `09` |
| C4 | Inv-A2 (mismo teléfono, otro correo) crea cuenta | No ve los pedidos de Inv-A | A pgTAP `09` |
| C5 | Completar perfil sin compras / con una compra pagada / por segunda vez | Sin bono / +50 / no se repite | A pgTAP `09` · F (segunda vez) |
| C6 | Compra con puntos: 1 punto, el máximo (50 %), más del máximo, con envío caro | El envío nunca se paga con puntos | A `fase7`, pgTAP `09` |
| C7 | Cancelar, dejar vencer o reembolsar un pedido con puntos | Regresan los usados; se quitan los ganados | A pgTAP `09` · F (vencimiento) |
| C8 | "Repetir" un pedido cuyo producto ya no existe, está agotado o cambió de precio | Avisa qué no se pudo agregar; precio de hoy | F |
| C9 | Reusar una dirección anterior en la caja | Se llena sola y cotiza bien | F |
| C10 | La sesión vence a media caja | Puede terminar como invitada o volver a entrar sin perder la bolsa | F |
| C11 | Misma cuenta abierta en dos dispositivos, comprando con los mismos puntos | Solo una compra los usa | A `fase7` |
| C12 | Cerrar sesión en la tienda con el panel abierto en otra pestaña | No se cierran entre sí | F |
| C13 | La dueña cambia las reglas de puntos con un pedido de Cli-B a medio pagar | El pedido conserva su descuento; los siguientes usan la regla nueva | F |

### 4.3 Dueña

| ID | Recorrido | Esperado | Estado |
|---|---|---|---|
| D1 | Primer acceso: contraseña temporal → enrolar MFA → entrar; código MFA equivocado | Sin MFA no ve nada | A pgTAP `03`, `fase3` · **M pendiente desde la Fase 2** |
| D2 | Perdió su teléfono: `cuentas-panel.mjs reiniciar-mfa` y vuelve a enrolar | Recupera el acceso; queda auditado | F |
| D3 | 30 min sin tocar el panel | Sesión cerrada | F |
| D4 | Hoy: ve pedidos del día, alertas y stock bajo | Coincide con la BD | F |
| D5 | Pedido con tarjeta: preparar → generar guía → descargar → enviado → entregado | Una sola guía; I7 | A `fase4` |
| D6 | Pedido de Metro o DiDi: `pagado → entregado` sin guía | Permitido | F |
| D7 | Aprobar y rechazar transferencias, con nota | I8 | A `fase3` (aprobar) · F (rechazar) |
| D8 | Cancelar un pedido pendiente; intentar cancelar uno ya pagado | Libera la reserva / pide reembolsar | F |
| D9 | Reembolsar: antes de enviar, ya enviado (+ "devolver"), `pagado_sin_stock`, transferencia | Stock y puntos según ARQUITECTURA §3.3 E | A `fase3`, pgTAP `05` |
| D10 | Reembolso que falla en Mercado Pago (simulador caído) | Error claro; el pedido no queda a medias; reintentar no duplica | F |
| D11 | Ajuste de stock con motivo; ajuste por debajo de lo apartado | Movimiento + auditoría / rechazado | A pgTAP `03` · F (integración) |
| D12 | Excel: exportar, editar, importar con errores, importar bien, importar el mismo dos veces | Vista previa; todo o nada; no se duplica | A pgTAP `03` · F (pantalla) |
| D13 | Catálogo: alta de producto, tono y variante; cambio de precio; desactivar | Visible u oculto en la tienda; I8 | A pgTAP `03` · F (pantalla) |
| D14 | Subir foto (cuando exista R2): imagen válida, archivo falso, archivo grande | Solo entra la válida, en WebP | F (bloqueado por el bucket) |
| D15 | Canales: conectar ML y TikTok, vincular, encender y apagar sincronización, cambiar colchón, **desconectar** | Apagada no publica; desconectar deja de mover stock | A `fase5`, `fase6` · F (colchón, desconectar) |
| D16 | Token de ML o TikTok que ya no se puede refrescar | Estado "requiere autorizar" + alerta; reconectar lo arregla | F |
| D17 | Clientas: ver lista, historial y abrir WhatsApp prellenado | Datos correctos | F |
| D18 | Atender cada tipo de alerta y marcarla como atendida | No reaparece si ya no aplica | A pgTAP `10` · F (pantalla) |
| D19 | Cambiar `config_tienda` (CLABE, WhatsApp, reservas, envío, puntos) con valores válidos y fuera de rango | Se rechaza lo inválido; la tienda refleja lo válido | F |
| D20 | Todo D4–D9 desde su teléfono | Usable | F (E2E móvil) |

### 4.4 Ayudante

| ID | Recorrido | Esperado | Estado |
|---|---|---|---|
| Y1 | Avanza entregas, genera guías, ve comprobantes, ve inventario y estado de canales | Permitido | A `fase4`, pgTAP `03` |
| Y2 | Intenta ajustar stock, cambiar precios, aprobar pagos, reembolsar, devolver, encender sincronización, conectar canales | 403 y el botón no aparece | A `fase3`, `fase5` · F (botones ocultos) |
| Y3 | La dueña le quita la cuenta mientras tiene el panel abierto | Su siguiente acción falla | F |

### 4.5 Canales (Mercado Libre y TikTok)

| ID | Recorrido | Esperado | Estado |
|---|---|---|---|
| K1 | Venta con aviso; venta con aviso perdido | Baja el stock; el cron la recupera | A `fase5`, `fase6` |
| K2 | Venta de publicación con Full / Fulfilled by TikTok | No toca el inventario físico | A `fase5` · F (TikTok) |
| K3 | Venta cancelada en ML; orden `CANCELLED` en TikTok | El stock regresa una sola vez | F |
| K4 | Venta de 2 piezas; TikTok manda 2 líneas del mismo SKU | Descuenta 2 | F |
| K5 | Una variante en 2 publicaciones de ML y 1 de TikTok | Las 3 reciben el mismo disponible − colchón | F |
| K6 | Venta de un artículo **sin vincular** | No mueve stock y queda visible para vincular | F |
| K7 | Venta de canal cuando nuestro stock ya es 0 | El stock no baja de 0; alerta de sobreventa | F |
| K8 | ML o TikTok caídos al publicar stock | Reintentos; alerta si persiste; se publica al volver | A pgTAP `10` (alerta) · F (recuperación) |

## 5. Varias personas a la vez

Lo que una sola persona probando nunca encuentra. Se hacen con dos navegadores o con un script.

| ID | Situación | Esperado | Estado |
|---|---|---|---|
| X1 | Dos clientas compran la última pieza al mismo tiempo | Una pasa, la otra ve "agotado" | A `test:concurrencia`, `fase3` |
| X2 | Última pieza: compra web y venta de ML en el mismo segundo | El stock no baja de 0; el pago web tardío cae en `pagado_sin_stock` | A pgTAP `04` (en secuencia) · F (en paralelo) |
| X3 | La dueña ajusta el stock mientras una clienta paga esa variante | No queda por debajo de lo apartado; I1–I3 | F |
| X4 | La dueña importa un Excel mientras entran pedidos | El lote detecta el cambio y no pisa las ventas | A pgTAP `03` (conflicto) · F (con pedidos reales) |
| X5 | Dueña y ayudante generan la guía del mismo pedido a la vez | Una sola guía | F |
| X6 | Dueña aprueba una transferencia en el momento en que vence su reserva | Queda `pagado` o `expirado`, nunca los dos; I3 | F |
| X7 | El cron corre mientras llegan avisos de MP, ML y TikTok | Sin bloqueos ni movimientos dobles | F |
| X8 | 30 compras seguidas mezclando métodos, entregas, puntos y canales (script) | I1–I10 al final; es el "10 compras sin descuadre" de la Fase 3, ampliado | F |
| X9 | El mismo aviso de pago llega 2 veces **a la vez** (no una tras otra) | Un solo movimiento | F |
| X10 | Doble toque simultáneo en "Pagar" | Un solo pedido | A `fase3`, pgTAP `04` |

## 6. Seguridad

### 6.1 Ya cubierto por pruebas automáticas (repetir a mano solo los marcados ★)

| Ataque | Dónde |
|---|---|
| ★ Leer pedidos, clientas o configuración (CLABE) con la llave pública | pgTAP `01`, `04` |
| ★ Ejecutar funciones de stock, pagos o puntos por RPC | pgTAP `02`, `04`, `05`, `09` |
| `UPDATE` directo de stock o de estado del pedido | pgTAP `03`, `05` |
| ★ Panel sin sesión (401), sin MFA (403), ayudante en acciones de dueña (403) | `fase3`, `fase5`, pgTAP `03` |
| Cuenta del panel usada como clienta; correo sin verificar | `fase7`, pgTAP `09` |
| ★ Clienta A lee datos de B por la API | `fase7`, pgTAP `09` |
| Precio, total, CP o envío alterados; cantidades inválidas | `fase3`, `fase4` |
| Puntos de más, en paralelo, o sin sesión | `fase7` |
| ★ Webhook de MP con firma falsa, monto distinto o pedido ajeno | `fase3` |
| Webhook de Envia sin secreto; de ML de otra app; de TikTok con firma falsa | `fase4`, `fase5`, `fase6` |
| CORS desde otro origen; ráfaga → 429; adivinar folio | `fase3` |
| Código de acceso sin Turnstile; código usado o inventado | `fase7` |

### 6.2 Huecos de seguridad encontrados (faltan)

| ID | Ataque | Esperado | Prioridad |
|---|---|---|---|
| S1 | Falsificar `x-forwarded-for` para saltarse el límite por IP (riesgo abierto en ARQUITECTURA §8) | El límite no se reinicia; si se reinicia, corregir `ipCliente` | Alta |
| S2 | Ver o descargar el comprobante de otro pedido; reusar la URL firmada después de 5 min | Denegado | Alta (cuando exista R2) |
| S3 | Subir `.html`/`.svg` renombrado, PDF con script, archivo de 50 MB, 100 archivos al mismo pedido | Rechazado y borrado; límite por pedido | Alta (cuando exista R2) |
| S4 | `cron-conciliar` sin secreto o con secreto equivocado | Rechazado | Alta |
| S5 | `state` de OAuth de ML/TikTok reusado, vencido (10 min) o de otra dueña | Rechazado | Media (A parcial en `fase5`) |
| S6 | Ayudante llama directo a `panel-stock`, `panel-catalogo` y `r2-firmar` con acciones de dueña | 403 | Alta |
| S7 | Sesión de clienta llamando a cualquier función `panel-*` y a `envios-guia` | 403 | Alta |
| S8 | Mandar `cuenta_id`, `clienta_id` o `puntos` de otra persona en `pedidos-crear` | Se ignora; manda el token | Alta |
| S9 | Texto con HTML o scripts en nombre, dirección, nota y perfil; verlo luego en el panel | Se muestra como texto | Alta |
| S10 | Enumerar correos: ¿`/cuenta` responde distinto si el correo ya existe? | Misma respuesta | Media |
| S11 | Acaparar inventario rotando teléfonos (el tope es por teléfono e IP) | Turnstile + límite por IP lo frenan; medir cuánto se puede apartar | Alta |
| S12 | Token de sesión de panel robado y usado tras cerrar sesión | Ya no sirve | Media |
| S13 | Cabeceras reales del build: CSP sin `unsafe-inline`, HSTS, anti-iframe, `Permissions-Policy` | Presentes en todas las rutas | Media |
| S14 | Buscar `sb_secret_`, tokens y la CLABE en `dist/` y en el historial de git | Nada | Alta |
| S15 | Logs de funciones tras una compra completa | Sin correos, teléfonos, direcciones ni tokens | Media |
| S16 | Aviso de canal o de pago con cuerpo gigante o JSON roto | 4xx rápido, sin tumbar la función | Media |
| S17 | Rastreo: confirmar el tope real (5 o 6 intentos) y que el bloqueo es por folio, no por IP | Coincide con ARQUITECTURA §3.3 F | Media |
| S18 | OWASP ZAP baseline; revisión de RLS tabla por tabla con anónimo, clienta, ayudante y dueña; avisos de seguridad de Supabase | Sin hallazgos altos | Alta (Fase 8) |
| S19 | Restaurar el respaldo cifrado en una BD limpia | Funciona y I1–I5 se cumplen | Alta (Fase 8) |
| S20 | Repo todavía público (pendiente T5) | Pasarlo a privado antes de usar secretos reales | Alta |

## 7. Pruebas automáticas por agregar

Playwright ya está instalado y `tests/e2e/pantallas/humo.spec.mjs` corre en el CI en cada PR a `main`. Lo que sigue, en orden:

| Prioridad | Archivo propuesto | Cubre |
|---|---|---|
| 1 | `tests/e2e/a1-invitada-tarjeta.spec` | U1, U4, U5, U13 |
| 1 | `tests/e2e/a2-duena-guia.spec` | D1, D5 |
| 1 | `tests/e2e/a4-puntos-transferencia.spec` | C1, C3, C6, U11, D7 |
| 1 | `tests/seguridad/fase8-huecos.test.mjs` | S1, S4, S6, S7, S8, S9, S16 |
| 2 | `tests/integracion/simultaneo.mjs` | X2, X3, X5, X6, X7, X9 |
| 2 | `tests/integracion/maraton.mjs` | X8 + comprobación de I1–I7 por SQL |
| 2 | `tests/seguridad/fase8-canales.test.mjs` | K3–K7, D15 (desconectar), D16, S5 |
| 2 | `tests/e2e/a5-venta-ml.spec`, `a6-cierre-cron.spec` | K1, K5, D18 |
| 3 | `tests/e2e/abandono.spec`, `movil.spec` | U7, U17, D20 |
| 3 | `tests/seguridad/fase8-archivos.test.mjs` | S2, S3, D14 (al crear los buckets de R2) |
| 3 | `supabase/tests/11_reglas.test.sql` | I1–I7 como consultas reutilizables |
| 1 | `tests/e2e/pantallas/tienda.spec` | P1–P9 (§10) |
| 1 | `tests/e2e/pantallas/panel.spec` | P10–P17 (§10) |
| 2 | `tests/e2e/pantallas/visual.spec` | Capturas de referencia (§10.3) |
| 2 | `tests/e2e/pantallas/accesibilidad.spec` | axe + teclado (§10.4) |

## 8. Orden y criterios de salida

| Etapa | Qué | Sale cuando |
|---|---|---|
| 0 | Entorno + batería automática actual | Todo en verde en local |
| 1 | §4.1 a §4.4 a mano (incluye la prueba pendiente de la Fase 2) | Todos pasan o tienen hallazgo |
| 2 | §4.5 y §5 | I1–I10 se cumplen tras X8 |
| 3 | §6 (★ a mano + huecos S1–S20) | 0 hallazgos altos abiertos |
| 4 | Automatizar §7, prioridades 1 y 2 | CI en verde con las pruebas nuevas |
| 4b | Pantallas (§10) en los 3 navegadores y 4 anchos | 0 errores de consola; capturas aprobadas; axe sin fallas graves |
| 5 | Servicios reales (ARQUITECTURA Fase 8: T1, T2, T3, T7, T8) | 10 compras sin descuadre; una semana sin descuadres en ML y TikTok |

**Bloqueos conocidos:** buckets de R2 (S2, S3, D14, U11 con archivo); cuentas de Mercado Pago, Envia, ML y TikTok (etapa 5); proyecto de staging (S1).

## 9. Formato de hallazgo

```
ID del caso:            (p. ej. X3)
Commit:                 (git rev-parse --short HEAD)
Pasos:                  1… 2… 3…
Esperado / Obtenido:
Regla rota:             (I1–I10, si aplica)
Severidad:              crítica (dinero, stock o datos de otra persona) · alta · media · baja
Evidencia:              captura, folio, hora
```

## 10. Pruebas de pantalla

Todo lo anterior prueba que el servidor responde bien. Esta sección prueba que **cada pantalla muestra lo correcto en cada estado**: cargando, vacía, con error, con datos y al terminar una acción. Se planearon leyendo `src/pages`, `src/panel` y sus textos actuales.

### 10.1 Cómo se corren

- **Herramienta:** Playwright 1.65.1 + `@axe-core/playwright` 4.14.0 (instalados el 17 nov 2026; configuración en `playwright.config.mjs`, apoyo en `tests/e2e/_apoyo.mjs`), contra `npm run dev` + Supabase local + simuladores, igual que el trabajo `integracion` del CI.
- **Navegadores:** Chromium, WebKit (equivale a Safari de iPhone) y Firefox.
- **Anchos:** 360 px (Android chico), 390 px (iPhone), 768 px (tableta) y 1280 px (laptop). El CSS cambia de diseño entre 600 y 960 px (`max-width` de 600, 700, 760, 860, 900 y 960 px en `src`), así que 768 cae justo en la zona de cambio.
- **En cada pantalla, siempre:** 0 errores en la consola; 0 violaciones de CSP; ninguna petición con respuesta 4xx/5xx que no sea parte del caso; nada se sale de la pantalla a lo ancho (sin scroll horizontal); el nombre de la dueña no aparece (I9).
- **Estados de error:** se fuerzan apagando un simulador o la función, o interceptando la petición con `page.route` para que responda 500 o tarde 10 s.
- **Selectores:** por rol y texto visible (`getByRole`, `getByText`). Donde no alcance, agregar `data-testid` (cambio menor al frontend, se acuerda con el equipo).

### 10.2 Pantalla por pantalla

#### Tienda

| ID | Pantalla (ruta) | Estados a probar | Qué se verifica |
|---|---|---|---|
| P1 | Landing (`/`) | Normal; con animaciones reducidas (`prefers-reduced-motion`) | Secciones "Tres pasos", "En ojos", "¿No sabes cuál?", "Dudas"; los botones llevan a `/tienda`, `/tono` y `/probador`; carga sin el chatbot (`VITE_CHATBOT=false`) |
| P2 | Tienda (`/tienda`) | "Cargando catálogo…"; con datos; filtro sin resultados ("No hay tonos con ese filtro."); error con botón "Reintentar"; con caché del navegador y sin red | Filtros por Familia y Efecto; graduación y "Sin graduación"; "Agotado" y "Agotado en $…"; sección Accesorios; disponible máximo 10 |
| P3 | Test de tono (`/tono`) | Recorrido completo; cambiar intensidad; volver atrás | Recomienda tonos que existen en el catálogo y llevan a su ficha |
| P4 | Probador (`/probador`) | "Cargando lookbook…"; cámara permitida; cámara negada; "Sin lentes"; cerrar | El modelo (3.7 MB) se descarga solo aquí; con cámara negada hay mensaje y salida |
| P5 | Nosotros (`/nosotros`) | Normal | Textos sin el nombre de la dueña; enlaces de contacto correctos |
| P6 | Bolsa (panel lateral) | Vacía; 1 renglón; varios; al tope de 5 por renglón y 10 por pedido; producto que se agotó mientras estaba en la bolsa | Totales iguales a los del servidor; botón para quitar; mensaje al llegar al tope |
| P7 | Caja (`/checkout`), paso 1 "¿A quién le…" | Vacío; teléfono o correo inválidos; con sesión de cuenta (datos ya llenos) | No avanza con datos inválidos; el mensaje de error está junto al campo |
| P7b | Caja, paso 2 "¿Cómo quieres…" (entrega) | "Cargando opciones de entrega…"; Metro (2 estaciones + "Otra estación"); DiDi por alcaldía; paquetería con CP válido; CP sin cobertura ("No hay paqueterías disponibles para ese código postal."); Envia caído; cotización vencida (30 min); direcciones anteriores de la cuenta | Costos iguales a `tarifas_entrega`; 5 días sin domingo y 3 horarios; al elegir una dirección anterior se recotiza |
| P7c | Caja, paso 3 "¿Cómo lo quieres…" (pago) | Mercado Pago; transferencia; "Usar mis puntos" sin cuenta (no aparece), con 0 puntos, con puntos; total que cambió (409); 4.º pedido sin pagar (429); Turnstile que no carga; doble clic en pagar | El descuento por puntos nunca toca el envío; al cambiar el total se muestra el nuevo antes de pagar; el botón se bloquea mientras procesa |
| P8 | Seguimiento (`/pedido/:clave`) | "Cargando tu pedido…"; token válido; token inventado (404); buscar por folio (`AGO-1001`) + 4 dígitos; 6.º intento (bloqueado); cada estado del pedido (los 11 de §2) | Pantalla de transferencia con CLABE y botón "Copiar CLABE"; subir comprobante (cuando exista R2) o enlace a WhatsApp; nunca muestra domicilio completo |
| P9 | Cuenta (`/cuenta`) | Sin sesión (correo); código "••••••" correcto, equivocado y vencido; "Cargando tu cuenta…"; cuenta nueva sin pedidos ("Sin lentes activos."); cuenta con pedidos ligados; perfil: guardar bien y "No se pudo guardar." | Secciones "Tus pedidos", "Movimientos de puntos", "Tu último par", "Renovación", "Direcciones de tus envíos", "Cómo sumar"; "Repetir" con producto agotado ("Sin existencias") |

#### Panel

| ID | Pantalla (ruta) | Estados a probar | Qué se verifica |
|---|---|---|---|
| P10 | Acceso (`/panel`) | "Hola de nuevo" (contraseña + Turnstile); contraseña mala; "Protege tu cuenta" (enrolar MFA con QR); "Tu código" (MFA bueno y malo); "Esta cuenta no entra al panel" (cuenta de clienta) | No se ve ningún dato del panel antes del MFA; tras 30 min sin uso regresa aquí |
| P11 | Hoy (`/panel`) | BD vacía ("Sin ventas este mes todavía.", "Sin pagos por validar."); con pedidos; con alertas ("Requiere tu atención"); con stock bajo ("Se están acabando") | Cifras de "Este mes" y "¿De dónde vienen?" iguales a la BD; botón "Abrir inventario" |
| P12 | Pedidos (`/panel/pedidos`) | "Cargando…"; "No hay pedidos aquí."; error con "Reintentar"; filtros; pedido de cada canal (web, ML, TikTok) | Ficha del pedido: botones que cambian según estado y rol (aprobar, rechazar, cancelar, reembolsar, devolver, generar y descargar guía, WhatsApp prellenado); confirmación antes de reembolsar; el pedido se actualiza sin recargar |
| P13 | Inventario (`/panel/inventario`) | Normal; "Agotado"; ajuste con motivo; ajuste rechazado; importar Excel con errores, bien y "No se pudo leer el archivo; usa .xlsx o .csv."; exportar | Vista previa antes de aplicar; el historial muestra el movimiento nuevo |
| P14 | Catálogo (`/panel/catalogo`) | Alta; editar precio ("No se pudo guardar el precio"); desactivar; Accesorios; subir foto (cuando exista R2) | El cambio aparece en la tienda tras recargar |
| P15 | Clientas (`/panel/clientas`) | Vacía; con clientas; clienta "Sin nombre" | Historial y puntos coinciden con la BD |
| P16 | Canales (`/panel/canales`) | "Sin conectar."; conectar (sale y regresa del OAuth del simulador); "Tus productos en…"; vincular por "SKU de la tienda"; "Vinculadas (n)"; logística Full; encender sincronización con "Confirmar"; "No se pudo completar."; desconectar | Encender pide confirmación; colchón visible |
| P17 | Panel visto por la ayudante | Las 6 vistas | Los botones de dueña no aparecen (ajustar stock, precios, aprobar, reembolsar, devolver, sincronización, conectar) |

### 10.3 Comparación visual (capturas de referencia)

- Playwright guarda una captura de referencia de P1, P2, P7–P9 y P11–P13 en 390 px y 1280 px, con datos fijos de la semilla y la hora congelada.
- En cada PR compara contra la referencia; una diferencia mayor al 0.2 % de los píxeles falla y muestra las dos imágenes. Las animaciones (GSAP, Lenis) se apagan con `prefers-reduced-motion` para que las capturas no varíen.
- Cuando el cambio de diseño es a propósito, se actualiza la referencia en el mismo PR (`--update-snapshots`) y alguien del equipo la aprueba.

### 10.4 Accesibilidad y uso con teclado

- `@axe-core/playwright` en todas las pantallas de §10.2: 0 violaciones "serious" o "critical".
- Se puede comprar de punta a punta solo con teclado (Tab, Enter, Espacio, Esc), con el foco visible en todo momento.
- Cada campo de la caja y del acceso tiene etiqueta; los errores se anuncian (`aria-live`) y no dependen solo del color.
- El modal del pedido en el panel atrapa el foco y se cierra con Esc.
- Texto ampliado al 200 %: nada se corta en la caja ni en el panel.

### 10.5 Rendimiento visible

- Lighthouse en móvil sobre P1 y P2: LCP menor a 2.5 s (meta de ARQUITECTURA §3.4).
- La primera carga de `/tienda` no descarga `exceljs`, `jspdf` ni el modelo de MediaPipe (ARQUITECTURA §3.4); se verifica con la lista de peticiones de Playwright.
