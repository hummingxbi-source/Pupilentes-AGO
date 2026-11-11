-- Semilla LOCAL (supabase db reset). No se aplica a proyectos en la nube.
-- GENERADO con `npm run semilla` desde plantillas/catalogo-semilla.csv. No editar a mano.

-- Secretos de Vault para que el cron local llame a `cron-conciliar` (ver migración *_cron.sql).
-- host.docker.internal llega a tu máquina desde el contenedor de Postgres en Docker Desktop (Mac/Windows).
-- El secreto debe ser igual a CRON_SECRET de supabase/functions/.env.
select vault.create_secret('http://host.docker.internal:55321', 'url_proyecto');
select vault.create_secret('cron-local-solo-desarrollo', 'secreto_cron');

-- Catálogo semilla (Fase 1). Catálogo de TRABAJO, no el real:
--   · Urban Layer a $799 y Freshlady a $299 / accesorios: precios vistos en Mercado Libre (8 nov 2026).
--   · Freshlady anual a $590: precio visto en TikTok Shop (8 nov 2026); que sea de esa marca es un supuesto.
--   · Tonos, alias y descripciones: los de la demo. Stock: inventado para probar agotados.
--   El catálogo real se carga con scripts/importar-catalogo.mjs cuando llegue el Drive (tarea C).

-- Catálogo semilla
-- Generado por scripts/importar-catalogo.mjs. No editar a mano.
-- Toda la lógica está en public.aplicar_catalogo (una transacción).
select public.aplicar_catalogo($plan${
 "marcas": [
  {
   "slug": "urban-layer",
   "nombre": "Urban Layer"
  },
  {
   "slug": "freshlady",
   "nombre": "Freshlady"
  },
  {
   "slug": "renu",
   "nombre": "Renu"
  },
  {
   "slug": "ago",
   "nombre": "AGO"
  }
 ],
 "productos": [
  {
   "slug": "urban-layer-angeles-n",
   "marca": "urban-layer",
   "nombre": "Angeles N",
   "tipo": "lente",
   "alias": null,
   "descripcion": null,
   "destacado": false,
   "orden": 0,
   "activo": true
  },
  {
   "slug": "urban-layer-chelsea",
   "marca": "urban-layer",
   "nombre": "Chelsea",
   "tipo": "lente",
   "alias": null,
   "descripcion": null,
   "destacado": false,
   "orden": 0,
   "activo": true
  },
  {
   "slug": "urban-layer-siri",
   "marca": "urban-layer",
   "nombre": "Siri",
   "tipo": "lente",
   "alias": null,
   "descripcion": null,
   "destacado": false,
   "orden": 0,
   "activo": true
  },
  {
   "slug": "urban-layer-ocean",
   "marca": "urban-layer",
   "nombre": "Ocean",
   "tipo": "lente",
   "alias": null,
   "descripcion": null,
   "destacado": false,
   "orden": 0,
   "activo": true
  },
  {
   "slug": "urban-layer-breeze",
   "marca": "urban-layer",
   "nombre": "Breeze",
   "tipo": "lente",
   "alias": null,
   "descripcion": null,
   "destacado": false,
   "orden": 0,
   "activo": true
  },
  {
   "slug": "urban-layer-mint",
   "marca": "urban-layer",
   "nombre": "Mint",
   "tipo": "lente",
   "alias": null,
   "descripcion": null,
   "destacado": false,
   "orden": 0,
   "activo": true
  },
  {
   "slug": "urban-layer-gemini",
   "marca": "urban-layer",
   "nombre": "Gemini",
   "tipo": "lente",
   "alias": null,
   "descripcion": null,
   "destacado": false,
   "orden": 0,
   "activo": true
  },
  {
   "slug": "urban-layer-honey",
   "marca": "urban-layer",
   "nombre": "Honey",
   "tipo": "lente",
   "alias": null,
   "descripcion": null,
   "destacado": false,
   "orden": 0,
   "activo": true
  },
  {
   "slug": "urban-layer-choco",
   "marca": "urban-layer",
   "nombre": "Choco",
   "tipo": "lente",
   "alias": null,
   "descripcion": null,
   "destacado": false,
   "orden": 0,
   "activo": true
  },
  {
   "slug": "urban-layer-cloud",
   "marca": "urban-layer",
   "nombre": "Cloud",
   "tipo": "lente",
   "alias": null,
   "descripcion": null,
   "destacado": false,
   "orden": 0,
   "activo": true
  },
  {
   "slug": "urban-layer-storm",
   "marca": "urban-layer",
   "nombre": "Storm",
   "tipo": "lente",
   "alias": null,
   "descripcion": null,
   "destacado": false,
   "orden": 0,
   "activo": true
  },
  {
   "slug": "freshlady-freshlady",
   "marca": "freshlady",
   "nombre": "Freshlady",
   "tipo": "lente",
   "alias": null,
   "descripcion": null,
   "destacado": false,
   "orden": 0,
   "activo": true
  },
  {
   "slug": "renu-solucion-multiproposito-renu",
   "marca": "renu",
   "nombre": "Solución multipropósito Renu",
   "tipo": "accesorio",
   "alias": "Limpia, enjuaga y conserva tus lentes",
   "descripcion": null,
   "destacado": false,
   "orden": 1,
   "activo": true
  },
  {
   "slug": "ago-estuche-para-lentes",
   "marca": "ago",
   "nombre": "Estuche para lentes",
   "tipo": "accesorio",
   "alias": "Estuche doble para guardar tu par",
   "descripcion": null,
   "destacado": false,
   "orden": 2,
   "activo": true
  },
  {
   "slug": "ago-estuche-con-espejo-y-pinzas",
   "marca": "ago",
   "nombre": "Estuche con espejo y pinzas",
   "tipo": "accesorio",
   "alias": "Para llevar en la bolsa",
   "descripcion": null,
   "destacado": false,
   "orden": 3,
   "activo": true
  }
 ],
 "tonos": [
  {
   "slug": "angeles-n-blue",
   "producto": "urban-layer-angeles-n",
   "color": "Blue",
   "nombre": "Angeles N Blue",
   "alias": "Azul cielo con contorno",
   "familia": "azul",
   "intensidad": 3,
   "descripcion": "Azul brillante con anillo oscuro que define la mirada. Se nota aun en ojos muy oscuros.",
   "iris": null,
   "filtro": "saturate(1.15)",
   "destacado": true,
   "orden": 1,
   "activo": true
  },
  {
   "slug": "chelsea-blue",
   "producto": "urban-layer-chelsea",
   "color": "Blue",
   "nombre": "Chelsea Blue",
   "alias": "Azul suave y luminoso",
   "familia": "azul",
   "intensidad": 2,
   "descripcion": "Azul claro con centro cálido; ilumina sin verse artificial.",
   "iris": null,
   "filtro": "brightness(1.22) saturate(.7) hue-rotate(-12deg)",
   "destacado": false,
   "orden": 2,
   "activo": true
  },
  {
   "slug": "siri-blue",
   "producto": "urban-layer-siri",
   "color": "Blue",
   "nombre": "Siri Blue",
   "alias": "Azul hielo",
   "familia": "azul",
   "intensidad": 2,
   "descripcion": "Azul casi gris con destellos plateados. Elegante para el día.",
   "iris": null,
   "filtro": "saturate(.45) brightness(1.35)",
   "destacado": false,
   "orden": 3,
   "activo": true
  },
  {
   "slug": "ocean-blue",
   "producto": "urban-layer-ocean",
   "color": "Blue",
   "nombre": "Ocean Blue",
   "alias": "Azul profundo",
   "familia": "azul",
   "intensidad": 3,
   "descripcion": "Azul marino intenso, ideal para fotos y eventos.",
   "iris": null,
   "filtro": "saturate(1.6) brightness(.68) hue-rotate(10deg)",
   "destacado": false,
   "orden": 4,
   "activo": true
  },
  {
   "slug": "breeze-green",
   "producto": "urban-layer-breeze",
   "color": "Green",
   "nombre": "Breeze Green",
   "alias": "Verde oliva natural",
   "familia": "verde",
   "intensidad": 1,
   "descripcion": "Verde con centro miel. El favorito para un cambio que parece de nacimiento.",
   "iris": null,
   "filtro": "saturate(.85) sepia(.15)",
   "destacado": true,
   "orden": 5,
   "activo": true
  },
  {
   "slug": "siri-green",
   "producto": "urban-layer-siri",
   "color": "Green",
   "nombre": "Siri Green",
   "alias": "Verde jade",
   "familia": "verde",
   "intensidad": 2,
   "descripcion": "Verde limpio con reflejos dorados alrededor de la pupila.",
   "iris": null,
   "filtro": "saturate(1.2) hue-rotate(-22deg) brightness(1.05)",
   "destacado": false,
   "orden": 6,
   "activo": true
  },
  {
   "slug": "angeles-n-green",
   "producto": "urban-layer-angeles-n",
   "color": "Green",
   "nombre": "Angeles N Green",
   "alias": "Verde con contorno",
   "familia": "verde",
   "intensidad": 3,
   "descripcion": "Verde vivo con aro definido para una mirada marcada.",
   "iris": null,
   "filtro": "saturate(1.6) brightness(.85)",
   "destacado": false,
   "orden": 7,
   "activo": true
  },
  {
   "slug": "mint-green",
   "producto": "urban-layer-mint",
   "color": "Green",
   "nombre": "Mint Green",
   "alias": "Verde menta claro",
   "familia": "verde",
   "intensidad": 2,
   "descripcion": "Verde aqua muy luminoso, para un look notorio.",
   "iris": "aqua",
   "filtro": "brightness(1.12)",
   "destacado": false,
   "orden": 8,
   "activo": true
  },
  {
   "slug": "gemini-hazel",
   "producto": "urban-layer-gemini",
   "color": "Hazel",
   "nombre": "Gemini Hazel",
   "alias": "Avellana dorado",
   "familia": "cafe",
   "intensidad": 1,
   "descripcion": "Avellana cálido con destellos verdes. Cambio sutil y muy natural.",
   "iris": null,
   "filtro": "none",
   "destacado": true,
   "orden": 9,
   "activo": true
  },
  {
   "slug": "breeze-hazel",
   "producto": "urban-layer-breeze",
   "color": "Hazel",
   "nombre": "Breeze Hazel",
   "alias": "Miel claro",
   "familia": "cafe",
   "intensidad": 2,
   "descripcion": "Miel brillante que aclara ojos oscuros sin perder calidez.",
   "iris": "miel",
   "filtro": "brightness(1.08)",
   "destacado": false,
   "orden": 10,
   "activo": true
  },
  {
   "slug": "honey-brown",
   "producto": "urban-layer-honey",
   "color": "Brown",
   "nombre": "Honey Brown",
   "alias": "Café caramelo",
   "familia": "cafe",
   "intensidad": 1,
   "descripcion": "Café caramelo, el tono más discreto del catálogo.",
   "iris": "miel",
   "filtro": "brightness(.78) saturate(.9)",
   "destacado": false,
   "orden": 11,
   "activo": true
  },
  {
   "slug": "choco",
   "producto": "urban-layer-choco",
   "color": "Chocolate",
   "nombre": "Choco Chocolate",
   "alias": "Chocolate",
   "familia": "cafe",
   "intensidad": 1,
   "descripcion": "Chocolate profundo: unifica el color y da profundidad.",
   "iris": "cafe",
   "filtro": "brightness(.85)",
   "destacado": false,
   "orden": 12,
   "activo": true
  },
  {
   "slug": "cloud-gray",
   "producto": "urban-layer-cloud",
   "color": "Gray",
   "nombre": "Cloud Gray",
   "alias": "Gris nube",
   "familia": "gris",
   "intensidad": 2,
   "descripcion": "Gris claro con textura suave; luminoso y elegante.",
   "iris": null,
   "filtro": "brightness(1.18) contrast(.95)",
   "destacado": true,
   "orden": 13,
   "activo": true
  },
  {
   "slug": "angeles-n-gray",
   "producto": "urban-layer-angeles-n",
   "color": "Gray",
   "nombre": "Angeles N Gray",
   "alias": "Gris con contorno",
   "familia": "gris",
   "intensidad": 3,
   "descripcion": "Gris con anillo oscuro; contraste alto que se nota de lejos.",
   "iris": null,
   "filtro": "contrast(1.2)",
   "destacado": false,
   "orden": 14,
   "activo": true
  },
  {
   "slug": "angeles-n-wave-gray",
   "producto": "urban-layer-angeles-n",
   "color": "Wave Gray",
   "nombre": "Angeles N Wave Gray",
   "alias": "Gris ondulado",
   "familia": "gris",
   "intensidad": 2,
   "descripcion": "Gris con fibras onduladas y centro avellana; muy natural.",
   "iris": null,
   "filtro": "sepia(.25) brightness(.98)",
   "destacado": false,
   "orden": 15,
   "activo": true
  },
  {
   "slug": "storm-gray",
   "producto": "urban-layer-storm",
   "color": "Gray",
   "nombre": "Storm Gray",
   "alias": "Gris humo",
   "familia": "gris",
   "intensidad": 3,
   "descripcion": "Gris carbón para una mirada misteriosa.",
   "iris": null,
   "filtro": "brightness(.6) contrast(1.15)",
   "destacado": false,
   "orden": 16,
   "activo": true
  },
  {
   "slug": "freshlady-azul",
   "producto": "freshlady-freshlady",
   "color": "Azul",
   "nombre": "Freshlady Azul",
   "alias": "Azul brillante",
   "familia": "azul",
   "intensidad": 3,
   "descripcion": "Línea económica para probar un cambio de color.",
   "iris": "azul",
   "filtro": null,
   "destacado": false,
   "orden": 20,
   "activo": true
  },
  {
   "slug": "freshlady-verde",
   "producto": "freshlady-freshlady",
   "color": "Verde",
   "nombre": "Freshlady Verde",
   "alias": "Verde intenso",
   "familia": "verde",
   "intensidad": 3,
   "descripcion": "Línea económica para probar un cambio de color.",
   "iris": "verde",
   "filtro": null,
   "destacado": false,
   "orden": 21,
   "activo": true
  },
  {
   "slug": "freshlady-gris",
   "producto": "freshlady-freshlady",
   "color": "Gris",
   "nombre": "Freshlady Gris",
   "alias": "Gris perla",
   "familia": "gris",
   "intensidad": 2,
   "descripcion": "Línea económica para probar un cambio de color.",
   "iris": "gris",
   "filtro": null,
   "destacado": false,
   "orden": 22,
   "activo": true
  },
  {
   "slug": "freshlady-miel",
   "producto": "freshlady-freshlady",
   "color": "Miel",
   "nombre": "Freshlady Miel",
   "alias": "Miel suave",
   "familia": "cafe",
   "intensidad": 1,
   "descripcion": "Línea económica para probar un cambio de color.",
   "iris": "miel",
   "filtro": null,
   "destacado": false,
   "orden": 23,
   "activo": true
  }
 ],
 "variantes": [
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-N",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M050",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M075",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M100",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M125",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M150",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M175",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M200",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M225",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M250",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M275",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M300",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M325",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M350",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M375",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M400",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M450",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M500",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M550",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M600",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M650",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M700",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M750",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-BLUE-ANU-M800",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-N",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M050",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M075",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M100",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M125",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M150",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M175",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M200",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M225",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M250",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M275",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M300",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M325",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M350",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M375",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M400",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M450",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M500",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M550",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M600",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M650",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M700",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M750",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-CHELSEA-BLUE-ANU-M800",
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-N",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M050",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M075",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M100",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M125",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M150",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M175",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M200",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M225",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M250",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M275",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M300",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M325",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M350",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M375",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M400",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M450",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M500",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M550",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M600",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M650",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M700",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M750",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-SIRI-BLUE-ANU-M800",
   "producto": "urban-layer-siri",
   "tono": "siri-blue",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-N",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M050",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M075",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M100",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M125",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M150",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M175",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M200",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M225",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M250",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M275",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M300",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M325",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M350",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M375",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M400",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M450",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M500",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M550",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M600",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M650",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M700",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M750",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-OCEAN-BLUE-ANU-M800",
   "producto": "urban-layer-ocean",
   "tono": "ocean-blue",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-N",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M050",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M075",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M100",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M125",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M150",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M175",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M200",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M225",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M250",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M275",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M300",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M325",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M350",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M375",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M400",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M450",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M500",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M550",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M600",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M650",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M700",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M750",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-GREEN-ANU-M800",
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-N",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M050",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M075",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M100",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M125",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M150",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M175",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M200",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M225",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M250",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M275",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M300",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M325",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M350",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M375",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M400",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M450",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M500",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M550",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M600",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M650",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M700",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M750",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-SIRI-GREEN-ANU-M800",
   "producto": "urban-layer-siri",
   "tono": "siri-green",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-N",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M050",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M075",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M100",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M125",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M150",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M175",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M200",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M225",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M250",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M275",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M300",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M325",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M350",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M375",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M400",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M450",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M500",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M550",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M600",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M650",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M700",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M750",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GREEN-ANU-M800",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-green",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-N",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M050",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M075",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M100",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M125",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M150",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M175",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M200",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M225",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M250",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M275",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M300",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M325",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M350",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M375",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M400",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M450",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M500",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M550",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M600",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M650",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M700",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M750",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-MINT-GREEN-ANU-M800",
   "producto": "urban-layer-mint",
   "tono": "mint-green",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-N",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M050",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M075",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M100",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M125",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M150",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M175",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M200",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M225",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M250",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M275",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M300",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M325",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M350",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M375",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M400",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M450",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M500",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M550",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M600",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M650",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M700",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M750",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-GEMINI-HAZEL-ANU-M800",
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-N",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M050",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M075",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M100",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M125",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M150",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M175",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M200",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M225",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M250",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M275",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M300",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M325",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M350",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M375",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M400",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M450",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M500",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M550",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M600",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M650",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M700",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M750",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-BREEZE-HAZEL-ANU-M800",
   "producto": "urban-layer-breeze",
   "tono": "breeze-hazel",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-N",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M050",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M075",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M100",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M125",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M150",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M175",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M200",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M225",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M250",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M275",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M300",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M325",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M350",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M375",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M400",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M450",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M500",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M550",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M600",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M650",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M700",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M750",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-HONEY-BROWN-ANU-M800",
   "producto": "urban-layer-honey",
   "tono": "honey-brown",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 1,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-N",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M050",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M075",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M100",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M125",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M150",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M175",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M200",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M225",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M250",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M275",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M300",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M325",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M350",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M375",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M400",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M450",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M500",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M550",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M600",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M650",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M700",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M750",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-CHOCO-CHOCOLATE-ANU-M800",
   "producto": "urban-layer-choco",
   "tono": "choco",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-N",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M050",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M075",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M100",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M125",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M150",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M175",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M200",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M225",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M250",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M275",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M300",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M325",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M350",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M375",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M400",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 6,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M450",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M500",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M550",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M600",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M650",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M700",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M750",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-CLOUD-GRAY-ANU-M800",
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 3,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-N",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M050",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M075",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M100",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M125",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M150",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M175",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M200",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M225",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M250",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M275",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M300",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M325",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M350",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M375",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M400",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 5,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M450",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M500",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M550",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M600",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M650",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M700",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M750",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-GRAY-ANU-M800",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-N",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M050",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M075",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M100",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M125",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M150",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M175",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M200",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M225",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M250",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M275",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M300",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M325",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M350",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M375",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M400",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 4,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M450",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M500",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M550",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M600",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M650",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M700",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M750",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-ANGELES-N-WAVE-GRAY-ANU-M800",
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-N",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": null,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M050",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M075",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M100",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M125",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M150",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M175",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M200",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M225",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M250",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M275",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M300",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M325",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M350",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M375",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M400",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 799,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M450",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M500",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M550",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M600",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M650",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -6.5,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M700",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -7,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M750",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -7.5,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "UL-STORM-GRAY-ANU-M800",
   "producto": "urban-layer-storm",
   "tono": "storm-gray",
   "duracion": "anual",
   "graduacion": -8,
   "precio": 799,
   "stock": 0,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-TRI-N",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "trimestral",
   "graduacion": null,
   "precio": 299,
   "stock": 8,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-N",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": null,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M050",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M075",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M100",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M125",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M150",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M175",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M200",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M225",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M250",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M275",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M300",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M325",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M350",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M375",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M400",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M450",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M500",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M550",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-AZUL-ANU-M600",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-azul",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-TRI-N",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "trimestral",
   "graduacion": null,
   "precio": 299,
   "stock": 8,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-N",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": null,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M050",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M075",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M100",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M125",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M150",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M175",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M200",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M225",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M250",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M275",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M300",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M325",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M350",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M375",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M400",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M450",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M500",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M550",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-VERDE-ANU-M600",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-verde",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-TRI-N",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "trimestral",
   "graduacion": null,
   "precio": 299,
   "stock": 8,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-N",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": null,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M050",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M075",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M100",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M125",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M150",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M175",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M200",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M225",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M250",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M275",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M300",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M325",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M350",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M375",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M400",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M450",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M500",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M550",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-GRIS-ANU-M600",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-gris",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-TRI-N",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "trimestral",
   "graduacion": null,
   "precio": 299,
   "stock": 8,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-N",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": null,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M050",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -0.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M075",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -0.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M100",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -1,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M125",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -1.25,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M150",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -1.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M175",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -1.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M200",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -2,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M225",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -2.25,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M250",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -2.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M275",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -2.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M300",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -3,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M325",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -3.25,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M350",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -3.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M375",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -3.75,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M400",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -4,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M450",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -4.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M500",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M550",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -5.5,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "FRES-FRESHLADY-MIEL-ANU-M600",
   "producto": "freshlady-freshlady",
   "tono": "freshlady-miel",
   "duracion": "anual",
   "graduacion": -6,
   "precio": 590,
   "stock": 2,
   "activo": true
  },
  {
   "sku": "RENU-SOLUCION-MULTIPROPOSITO-RENU",
   "producto": "renu-solucion-multiproposito-renu",
   "tono": null,
   "duracion": null,
   "graduacion": null,
   "precio": 129,
   "stock": 20,
   "activo": true
  },
  {
   "sku": "AGO-ESTUCHE-PARA-LENTES",
   "producto": "ago-estuche-para-lentes",
   "tono": null,
   "duracion": null,
   "graduacion": null,
   "precio": 139,
   "stock": 15,
   "activo": true
  },
  {
   "sku": "AGO-ESTUCHE-CON-ESPEJO-Y-PINZAS",
   "producto": "ago-estuche-con-espejo-y-pinzas",
   "tono": null,
   "duracion": null,
   "graduacion": null,
   "precio": 179,
   "stock": 10,
   "activo": true
  }
 ],
 "imagenes": [
  {
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-blue",
   "url": "img/fotos/clientes/angeles-n-blue.webp",
   "alt": "Angeles N Blue",
   "orden": 0
  },
  {
   "producto": "urban-layer-chelsea",
   "tono": "chelsea-blue",
   "url": "img/fotos/clientes/chelsea-blue.webp",
   "alt": "Chelsea Blue",
   "orden": 0
  },
  {
   "producto": "urban-layer-breeze",
   "tono": "breeze-green",
   "url": "img/fotos/clientes/02-verde-breeze-green.jpg",
   "alt": "Breeze Green",
   "orden": 0
  },
  {
   "producto": "urban-layer-gemini",
   "tono": "gemini-hazel",
   "url": "img/fotos/clientes/03-cafe-gemini-hazel.jpg",
   "alt": "Gemini Hazel",
   "orden": 0
  },
  {
   "producto": "urban-layer-cloud",
   "tono": "cloud-gray",
   "url": "img/fotos/clientes/04-gris-cloud-gray.jpg",
   "alt": "Cloud Gray",
   "orden": 0
  },
  {
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-gray",
   "url": "img/fotos/clientes/angeles-n-gray.webp",
   "alt": "Angeles N Gray",
   "orden": 0
  },
  {
   "producto": "urban-layer-angeles-n",
   "tono": "angeles-n-wave-gray",
   "url": "img/fotos/clientes/angeles-n-wave-gray.webp",
   "alt": "Angeles N Wave Gray",
   "orden": 0
  }
 ]
}$plan$::jsonb);
