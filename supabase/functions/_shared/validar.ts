// Validación de entrada con zod y límite de tamaño (ARQUITECTURA §6.1 regla 5).

import { z } from './deps.ts';
import { ErrorHttp } from './http.ts';

export { z };

/** Lee el cuerpo JSON con tope de bytes y lo valida contra el esquema. */
export async function leerJson<T extends z.ZodType>(req: Request, esquema: T, maxBytes = 16_384): Promise<z.infer<T>> {
  const tipo = req.headers.get('content-type') ?? '';
  if (!tipo.includes('application/json')) throw new ErrorHttp(415, 'se_espera_json');
  const declarado = Number(req.headers.get('content-length') ?? '0');
  if (declarado > maxBytes) throw new ErrorHttp(413, 'cuerpo_demasiado_grande');

  const texto = await leerTextoConTope(req, maxBytes);
  let crudo: unknown;
  try { crudo = JSON.parse(texto); } catch { throw new ErrorHttp(400, 'json_invalido'); }

  const r = esquema.safeParse(crudo);
  if (!r.success) {
    const campos = r.error.issues.map((i) => i.path.join('.') || '(raíz)').slice(0, 10);
    throw new ErrorHttp(400, 'datos_invalidos', 'Revisa: ' + campos.join(', '));
  }
  return r.data;
}

async function leerTextoConTope(req: Request, maxBytes: number): Promise<string> {
  if (!req.body) return '';
  const lector = req.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await lector.cancel(); throw new ErrorHttp(413, 'cuerpo_demasiado_grande'); }
    partes.push(value);
  }
  const todo = new Uint8Array(total);
  let i = 0;
  for (const p of partes) { todo.set(p, i); i += p.byteLength; }
  return new TextDecoder().decode(todo);
}
