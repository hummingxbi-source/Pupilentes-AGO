// Lectura y escritura de Excel/CSV en el navegador.
// Usa ExcelJS (npm) en lugar de `xlsx`: la versión de `xlsx` en npm (0.18.5) tiene
// vulnerabilidades sin arreglo ahí; la corregida solo se publica en la CDN de SheetJS
// (ARQUITECTURA Fase 0, [32]). ExcelJS se carga solo al usarse.

/** Convierte el valor de una celda de ExcelJS a algo plano (texto, número, fecha). */
export function valorCelda(v) {
  if (v == null) return '';
  if (typeof v !== 'object' || v instanceof Date) return v;
  if ('result' in v) return v.result ?? '';            // fórmula
  if ('richText' in v) return v.richText.map((t) => t.text).join('');
  if ('text' in v) return v.text;                       // hipervínculo
  return String(v);
}

/** Separa un CSV simple (comas o punto y coma, comillas dobles) en filas. */
export function filasCsv(texto) {
  const sep = (texto.split('\n')[0].match(/;/g) || []).length > (texto.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const filas = []; let fila = []; let celda = ''; let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { celda += '"'; i++; }
      else if (c === '"') comillas = false;
      else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(celda); celda = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(celda); filas.push(fila); fila = []; celda = '';
    } else celda += c;
  }
  if (celda !== '' || fila.length) { fila.push(celda); filas.push(fila); }
  return filas.filter((f) => f.some((x) => String(x).trim() !== ''));
}

/** Lee la primera hoja de un .xlsx o un .csv y devuelve un arreglo de filas. */
export async function leerFilas(archivo) {
  if (/\.csv$/i.test(archivo.name)) return filasCsv(await archivo.text());
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await archivo.arrayBuffer());
  const hoja = wb.worksheets[0]; if (!hoja) return [];
  const filas = [];
  hoja.eachRow({ includeEmpty: false }, (row) => {
    filas.push(row.values.slice(1).map(valorCelda)); // values[0] siempre viene vacío
  });
  return filas;
}

/** Descarga un .xlsx con una hoja a partir de un arreglo de filas. */
export async function descargarXlsx(filas, nombreHoja, nombreArchivo) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet(nombreHoja).addRows(filas);
  const blob = new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nombreArchivo });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
