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

`tests/e2e` está vacía y Playwright aún no está instalado. Orden propuesto:

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

## 8. Orden y criterios de salida

| Etapa | Qué | Sale cuando |
|---|---|---|
| 0 | Entorno + batería automática actual | Todo en verde en local |
| 1 | §4.1 a §4.4 a mano (incluye la prueba pendiente de la Fase 2) | Todos pasan o tienen hallazgo |
| 2 | §4.5 y §5 | I1–I10 se cumplen tras X8 |
| 3 | §6 (★ a mano + huecos S1–S20) | 0 hallazgos altos abiertos |
| 4 | Automatizar §7, prioridades 1 y 2 | CI en verde con las pruebas nuevas |
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
