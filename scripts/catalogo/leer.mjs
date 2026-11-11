// Lee la primera hoja de un .xlsx (o un .csv) como arreglo de filas, en Node.
import { readFile } from 'node:fs/promises';
import { filasCsv, valorCelda } from '../../src/lib/excel.js';

export async function leerArchivo(ruta) {
  if (/\.csv$/i.test(ruta)) return filasCsv((await readFile(ruta, 'utf8')).replace(/^\uFEFF/, ''));
  if (!/\.xlsx$/i.test(ruta)) throw new Error('El archivo debe ser .xlsx o .csv');
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ruta);
  // La plantilla trae la hoja "Catalogo"; si no existe, se usa la primera.
  const hoja = wb.getWorksheet('Catalogo') ?? wb.worksheets[0];
  if (!hoja) return [];
  const filas = [];
  hoja.eachRow({ includeEmpty: false }, (row) => filas.push(row.values.slice(1).map(valorCelda)));
  return filas;
}
