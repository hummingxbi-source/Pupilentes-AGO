import { manejar } from './manejador.ts';

Deno.serve((req) => manejar(req));
