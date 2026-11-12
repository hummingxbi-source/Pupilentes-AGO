#!/usr/bin/env node
// Genera plantillas/catalogo.xlsx: la plantilla que llena la clienta (o el equipo) con el catálogo real.
//   node scripts/crear-plantilla.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { COLUMNAS } from '../supabase/functions/_shared/catalogo/plan.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'plantillas', 'catalogo.xlsx');

const AYUDA = {
  marca: 'Marca del proveedor. Ej.: Urban Layer, Freshlady, Renu.',
  linea: 'Línea o modelo (lentes) o nombre del accesorio. Ej.: Angeles N, Estuche con espejo.',
  tipo: 'lente o accesorio.',
  color: 'Solo lentes: color o diseño. Ej.: Blue, Wave Gray, Halloween Gato.',
  clave: 'Opcional. Identificador fijo del tono si no quieres el automático (línea + color).',
  alias: 'Nombre en español que entiende la clienta. Ej.: Azul cielo con contorno.',
  familia: 'Solo lentes: azul, verde, cafe, gris u otro.',
  intensidad: 'Solo lentes: 1 natural · 2 notorio · 3 intenso.',
  descripcion: 'Texto de la ficha (opcional).',
  duracion: 'Solo lentes: trimestral, semestral o anual.',
  graduaciones: 'Solo lentes. "neutro" = sin graduación. Rangos con "a": -0.50 a -4.00. Se separan con comas.',
  precio: 'Precio en la web, en pesos, por par (sin signo $).',
  stock: 'Pares que hay HOY de cada graduación de la fila. Solo se usa la primera vez que se carga la variante.',
  fotos: 'Nombres de archivo en la carpeta de fotos, separados con |. Ej.: angeles-blue-1.jpg|angeles-blue-2.jpg',
  destacado: 'sí si es de los más vendidos.',
  iris: 'Opcional (ilustración): aqua, avellana, azul, cafe, gris, miel, verde o violeta.',
  filtro: 'Opcional (ilustración): filtro CSS del iris. Lo llena el equipo.',
  orden: 'Opcional: número para ordenar en la tienda.',
  activo: 'sí (por defecto) o no para ocultarlo sin borrarlo.',
};
const EJEMPLOS = [
  ['Urban Layer', 'Angeles N', 'lente', 'Blue', '', 'Azul cielo con contorno', 'azul', 3, 'Azul brillante con anillo oscuro.', 'anual', 'neutro, -0.50 a -4.00', 799, 6, 'angeles-blue.jpg', 'sí', '', '', 1, 'sí'],
  ['Urban Layer', 'Angeles N', 'lente', 'Blue', '', '', 'azul', 3, '', 'anual', '-4.50 a -8.00', 799, 2, '', '', '', '', 1, 'sí'],
  ['Renu', 'Solución multipropósito Renu', 'accesorio', '', '', 'Limpia, enjuaga y conserva', '', '', '', '', '', 129, 20, 'renu.jpg', '', '', '', 1, 'sí'],
];

const wb = new ExcelJS.Workbook();
wb.creator = 'HummingX BI';
const h = wb.addWorksheet('Catalogo', { views: [{ state: 'frozen', ySplit: 1 }] });
h.columns = COLUMNAS.map((c) => ({ header: c, key: c, width: Math.max(12, Math.min(40, (AYUDA[c] || '').length / 2)) }));
h.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
h.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F1B16' } };
COLUMNAS.forEach((c, i) => { h.getRow(1).getCell(i + 1).note = AYUDA[c]; });
EJEMPLOS.forEach((r) => h.addRow(r));
const lista = (col, valores) => {
  const letra = h.getColumn(COLUMNAS.indexOf(col) + 1).letter;
  for (let f = 2; f <= 2000; f++) h.getCell(`${letra}${f}`).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${valores.join(',')}"`] };
};
lista('tipo', ['lente', 'accesorio']);
lista('familia', ['azul', 'verde', 'cafe', 'gris', 'otro']);
lista('duracion', ['trimestral', 'semestral', 'anual']);
lista('intensidad', ['1', '2', '3']);
lista('destacado', ['sí', 'no']);
lista('activo', ['sí', 'no']);

const a = wb.addWorksheet('Instrucciones');
a.columns = [{ header: 'Columna', width: 16 }, { header: 'Qué va', width: 100 }];
a.getRow(1).font = { bold: true };
COLUMNAS.forEach((c) => a.addRow([c, AYUDA[c]]));
a.addRow([]);
a.addRow(['Importante', 'Se vende siempre por PAR (1 unidad = 1 caja, misma graduación en ambos ojos).']);
a.addRow(['', 'Un mismo tono puede ocupar varias filas: una por duración o por rango de graduación con distinto stock.']);
a.addRow(['', 'Las filas de ejemplo se pueden borrar. No cambies los nombres de las columnas.']);

await wb.xlsx.writeFile(SALIDA);
// Copia pública: el panel la ofrece para descargar (Catálogo → Plantilla)
const PUBLICA = path.join(RAIZ, 'public', 'plantillas', 'catalogo.xlsx');
await (await import('node:fs/promises')).mkdir(path.dirname(PUBLICA), { recursive: true });
await wb.xlsx.writeFile(PUBLICA);
console.log(`✓ ${path.relative(RAIZ, SALIDA)} y ${path.relative(RAIZ, PUBLICA)}`);
