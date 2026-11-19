# Runbook de pruebas para Claude Code (Fase 8)

> Lo ejecuta **Claude Code en la Mac del equipo**, fase por fase, con el comando `/pruebas`.
> Lo revisa el **orquestador** (Claude en el chat del proyecto), que lee los reportes directo de la carpeta y deja su
> retroalimentación en un archivo. Así nadie copia y pega entre chats.
> Qué se prueba y por qué: `docs/PLAN-PRUEBAS.md`. Aquí solo está **cómo** y **en qué orden**.

## 1. El ciclo

```
Juan Pablo → Claude Code:  /pruebas
   Claude Code lee .pruebas/estado.md y la última retro → ejecuta la fase → escribe .pruebas/reportes/F<n>.md
   → estado "esperando revisión" → SE DETIENE
Juan Pablo → orquestador:   "revisa"
   El orquestador lee el reporte, los registros y las ramas → escribe .pruebas/retro/F<n>.md (APROBADA o CORREGIR)
Juan Pablo → Claude Code:  /pruebas
   Si la retro dice CORREGIR: hace solo eso y vuelve a reportar. Si dice APROBADA: pasa a la siguiente fase.
```

`.pruebas/` está fuera de git: es la mesa de trabajo local. Lo que vale para el equipo (pruebas nuevas, arreglos,
hallazgos en `docs/PLAN-PRUEBAS.md` §11) va por ramas y PR.

## 2. Reglas para Claude Code (siempre)

1. **No toques `main`.** No hagas merge, ni `push` a `main`, ni `reset`/`rebase` de ramas ajenas. Los PR los abre Juan Pablo (si `gh` no tiene sesión, deja los enlaces `compare` en el reporte).
2. **Una rama por fase:** `pruebas/F<n>-<nombre>`, que sale de la rama de pruebas más reciente que aún no esté en `main` (hoy: `fase/8-orquestacion`), o de `main` si ya todas están unidas.
3. **Solo local.** Nada de servicios reales, nube, Vercel, Cloudflare ni secretos reales. Proveedores = los simuladores de `scripts/`.
4. **Puedes escribir pruebas** (`tests/…`) y scripts de apoyo. **No cambies código de la aplicación** (`src/`, `supabase/functions/`, migraciones existentes) dentro de la rama de la fase.
5. **Si encuentras un error de la aplicación:** repórtalo como hallazgo con el formato de PLAN-PRUEBAS §9. Si es claro y pequeño, puedes proponer el arreglo en una rama aparte `fix/H<n>-<nombre>` con una prueba que lo reproduzca **y falle sin el arreglo**; una migración nueva, nunca editar una ya aplicada. No la unas: la revisa el orquestador.
6. **Nunca debilites una prueba para que pase** (subir tiempos, quitar asserts, `skip`). Si una prueba está mal, dilo en el reporte.
7. **Registra todo con datos:** folio, comando, archivo de registro, captura. Nada de "parece que funciona".
8. **No preguntes a mitad de fase.** Decide lo razonable, anótalo en "Decisiones tomadas" del reporte y sigue. Detente solo si algo es irreversible o si falta algo que solo una persona puede dar (cuenta, decisión de negocio).
9. **Git en esta carpeta:** si queda un `.lock` en `.git` de un proceso que ya no corre, puedes quitarlo; dilo en el reporte.
10. Español en código, comentarios, commits y reportes. Los commits llevan la línea `Co-Authored-By` habitual.

## 3. Al empezar y al terminar cada fase

**Empezar:**
1. Lee `.pruebas/estado.md` y la retro más reciente en `.pruebas/retro/` (si existe).
2. Crea o cambia a la rama de la fase.
3. `bash scripts/entorno-pruebas.sh` (BD desde cero, todo arriba, batería completa). Si algo sale en rojo, **ese es el primer hallazgo**: repórtalo y detente.
4. `node scripts/revisar-reglas.mjs --foto`

**Terminar:**
1. `bash scripts/entorno-pruebas.sh` otra vez, con las pruebas nuevas incluidas: deben pasar dos corridas seguidas.
2. `node scripts/revisar-reglas.mjs` sobre la BD que dejó la fase. Hazlo **antes** de la corrida del punto 1, que reinicia la BD.
3. Commit de las pruebas nuevas en la rama de la fase y `git push -u origin <rama>`.
4. Escribe `.pruebas/reportes/F<n>.md` (formato de §5) y pon el estado en "esperando revisión".
5. **Detente** y dile a Juan Pablo: "Fase F<n> lista para revisión del orquestador".

## 4. Fases

| Fase | Qué hace Claude Code | Pruebas que deja en el repo | Se detiene si… |
|---|---|---|---|
| **F0 · Entorno** ✅ | Hecha el 19 nov (8/8 en verde, dos corridas) | `scripts/entorno-pruebas.sh` | — |
| **F1 · Personas reales** | Ejecuta **todos** los casos de PLAN §4.1 a §4.4 (invitada, cuenta, dueña, ayudante) en el navegador contra el entorno local. El panel usa las cuentas de prueba; el MFA se resuelve con TOTP generado desde el secreto, como `tests/seguridad/_comun.mjs` (`totp`). Los casos **M** (cámara del probador, sin internet) los hace si su navegador lo permite; si no, los anota como "pendiente para Juan Pablo" con pasos exactos. | `tests/e2e/flujos/*.spec.mjs`: como mínimo `a1-invitada-tarjeta`, `a2-duena-guia`, `a4-puntos-transferencia` (PLAN §7, prioridad 1), con `test` importado de `tests/e2e/_apoyo.mjs`. | Fin de fase |
| **F2 · Canales y simultáneos** | PLAN §4.5 (K1–K8) y §5 (X1–X10), con los simuladores de ML y TikTok y peticiones en paralelo. Al final, el maratón X8 y `revisar-reglas`. | `tests/integracion/simultaneo.mjs`, `tests/integracion/maraton.mjs`, `tests/seguridad/fase8-canales.test.mjs` | Fin de fase |
| **F2b · Actualizaciones mayores** | Con F1 y F2 aprobadas: una rama por PR de Dependabot (plugin-react, zustand y al final React 19). Aplica la actualización, corre la batería y las pruebas de F1 y F2 completas, y reporta qué rompe. No arregla código de la aplicación. | — | Fin de fase |
| **F3 · Seguridad** | Repite a mano los ★ de PLAN §6.1 y prueba los huecos S1–S20 de §6.2 que se puedan en local. S1 necesita staging, y S2, S3 y D14 necesitan R2: se marcan "bloqueado" con el motivo. | `tests/seguridad/fase8-huecos.test.mjs` | Fin de fase (siempre: la revisa el orquestador) |
| **F4 · Pantallas** | PLAN §10: P1–P17 en los 6 perfiles de `playwright.config.mjs`; capturas de referencia (§10.3); axe (§10.4); Lighthouse en móvil (§10.5). Las capturas nuevas **no se aprueban solas**: van en el reporte para revisión. | `tests/e2e/pantallas/tienda.spec.mjs`, `panel.spec.mjs`, `visual.spec.mjs`, `accesibilidad.spec.mjs` | Fin de fase |
| **F5 · Servicios reales** | **No la empieza.** Requiere las cuentas de Mercado Pago, Envia, Mercado Libre y TikTok (T1, T2, T7, T8) y un túnel o staging (T3). Solo deja lista la lista de qué falta. | — | Al llegar |

Al cerrar F4, deja también en el reporte la propuesta para activar en el CI (`.github/workflows/ci.yml`, trabajo `e2e`) las pruebas que hayan corrido estables.

## 5. Formato del reporte `.pruebas/reportes/F<n>.md`

```markdown
# F<n> · <nombre> — <fecha y hora> · rama <rama> @ <commit>

## Resumen
<2–3 líneas: cuántos casos, cuántos pasaron, hallazgos por severidad, si hay algo bloqueado>

## Casos
| ID | Resultado (pasó / falló / bloqueado / pendiente humano) | Evidencia (folio, archivo, captura) | Nota |

## Hallazgos            (formato PLAN-PRUEBAS §9; ID siguiente a los de §11)

## Reglas (salida de scripts/revisar-reglas.mjs)

## Batería (las dos corridas de entorno-pruebas.sh: .pruebas/resultado.txt)

## Pruebas agregadas al repo     (archivo · qué cubre · ¿estable en 2 corridas?)

## Ramas y commits     (incluye ramas fix/ y enlaces para abrir PR)

## Decisiones tomadas  (lo que decidiste sin preguntar y por qué)

## Pendiente para Juan Pablo     (solo lo que de verdad necesita a una persona, con pasos exactos)

## Preguntas para el orquestador
```

## 6. Archivos de control (en `.pruebas/`, fuera de git)

| Archivo | Lo escribe | Contenido |
|---|---|---|
| `estado.md` | Claude Code | Fase actual · estado (en curso / esperando revisión / corrigiendo / aprobada) · rama · última actualización |
| `reportes/F<n>.md` | Claude Code | El reporte de §5 (si hay correcciones: `F<n>-v2.md`, `-v3`…) |
| `retro/F<n>.md` | Orquestador | Primera línea: `Veredicto: APROBADA` o `Veredicto: CORREGIR`, y debajo qué hacer |
| `resultado.txt`, `logs/`, `cuentas.txt`, `foto.json` | Scripts | Batería, registros, cuentas de prueba, foto del stock |
