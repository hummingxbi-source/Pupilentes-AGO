# Plantillas de catálogo

| Archivo | Para qué |
|---|---|
| `catalogo.xlsx` | Plantilla vacía (con ejemplos e instrucciones) para cargar el **catálogo real** cuando llegue el Drive. Se regenera con `node scripts/crear-plantilla.mjs`. |
| `catalogo-semilla.csv` | Catálogo **de trabajo** de la Fase 1, en el mismo formato. De aquí sale `supabase/seed.sql` (`npm run semilla`). |

## Formato (una fila = un tono + duración + rango de graduaciones)

| Columna | Obligatoria | Qué va |
|---|---|---|
| `marca` | sí | Urban Layer, Freshlady, Renu… |
| `linea` | sí | Línea/modelo (lentes) o nombre del accesorio |
| `tipo` | sí | `lente` o `accesorio` |
| `color` | lentes | Color o diseño (Blue, Wave Gray, Halloween Gato…) |
| `clave` | no | Identificador fijo del tono; por defecto `linea + color` en minúsculas con guiones (`angeles-n-blue`) |
| `alias` | no | Nombre en español para la clienta |
| `familia` | lentes | `azul`, `verde`, `cafe`, `gris` u `otro` |
| `intensidad` | no | 1 natural · 2 notorio · 3 intenso |
| `descripcion` | no | Texto de la ficha |
| `duracion` | no | `trimestral`, `semestral` o `anual` |
| `graduaciones` | no | `neutro` = sin graduación; rangos `-0.50 a -4.00`; separados con comas. Vacío = solo neutro |
| `precio` | sí | Precio web por par, en pesos |
| `stock` | no | Pares que hay de **cada** graduación de la fila (solo se usa al crear la variante) |
| `fotos` | no | Archivos en la carpeta de fotos, separados con `\|` |
| `destacado` | no | `sí` = "más vendido" |
| `iris`, `filtro` | no | Ilustración del iris en la tienda (los llena el equipo) |
| `orden` | no | Orden en la tienda |
| `activo` | no | `no` para ocultar sin borrar |

**Escala de los rangos:** pasos de 0.25 hasta −4.00 y de 0.50 después (la de la demo). ⚠️ Confirmar con la clienta la escala de su proveedor.

**SKU automático:** `MARCA-LINEA-COLOR-DURACION-GRADUACION`, p. ej. `UL-ANGELES-N-BLUE-ANU-M150` (−1.50) o `…-N` (neutro).

## Importar

```bash
# 1) Revisar sin tocar nada
node scripts/importar-catalogo.mjs catalogo.xlsx --revisar
# 2) Cargar en la BD local (fotos a public/img/catalogo)
node scripts/importar-catalogo.mjs catalogo.xlsx --fotos ~/Desktop/fotos-ago --aplicar
# 3) Producción (Fase 9): fotos a R2 y BD de la nube
node scripts/importar-catalogo.mjs catalogo.xlsx --fotos … --destino r2 --aplicar "$DB_URL"
```

- Si hay **cualquier** error en la plantilla o en una foto, no se aplica nada y se listan las filas con problema.
- Reimportar es seguro: actualiza nombres, precios y fotos, y **nunca duplica stock**. Los ajustes de stock posteriores se hacen en el panel (Fase 2).
