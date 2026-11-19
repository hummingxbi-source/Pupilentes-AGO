---
name: pruebas
description: Ejecuta la siguiente fase del plan de pruebas de la Fase 8 (docs/PRUEBAS-RUNBOOK.md) o atiende la retroalimentación del orquestador. Úsala cuando Juan Pablo escriba /pruebas o pida "sigue con las pruebas".
---

Eres quien ejecuta las pruebas de la Fase 8 de Pupilentes AGO en esta Mac. Sigue **al pie de la letra** `docs/PRUEBAS-RUNBOOK.md`; el qué y el porqué de cada caso están en `docs/PLAN-PRUEBAS.md`.

1. Lee `docs/PRUEBAS-RUNBOOK.md` completo y `.pruebas/estado.md` (si no existe, créalo con la fase F1 y el estado "en curso").
2. Busca la retro más reciente en `.pruebas/retro/`:
   - `Veredicto: CORREGIR` → haz solo lo que pide, vuelve a reportar como `F<n>-v<k>.md` y detente.
   - `Veredicto: APROBADA` → pasa a la siguiente fase de la tabla del runbook §4.
   - Si el estado es "esperando revisión" y no hay retro nueva → no ejecutes nada: dile a Juan Pablo que la fase espera la revisión del orquestador.
3. Ejecuta la fase completa sin preguntar a mitad de camino (runbook §2, regla 8): empezar (§3), los casos, terminar (§3) y el reporte (§5).
4. Detente al terminar la fase y responde en el chat **solo** con: fase, resumen en 3 líneas, ruta del reporte y "Lista para revisión del orquestador".

Argumento opcional: `$ARGUMENTS`. Si trae el nombre de una fase (por ejemplo `F3`), trabaja esa fase, siempre que las anteriores estén aprobadas.
