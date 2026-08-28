import "server-only";
import { lineasDePdf } from "./bloques";
import { parseCompumax } from "./compumax";
import { parseCompuoriente } from "./compuoriente";
import type { ResultadoParser } from "./tipos";

// ─── Qué proveedor es esta lista ─────────────────────────────────────────────
//
// Se decide por el CONTENIDO del PDF, no por el nombre del archivo: el archivo
// se llama como quiera quien lo descargue, pero el catálogo siempre se nombra a
// sí mismo. Así una "Lista agosto (1).pdf" se reconoce igual.

export type MotorPdf = { id: string; nombre: string; parse: (b: Buffer) => Promise<ResultadoParser> };

const MOTORES: { id: string; nombre: string; huella: RegExp; parse: MotorPdf["parse"] }[] = [
  { id: "compumax",     nombre: "Compumax",     huella: /\bcompumax\b/i,     parse: parseCompumax },
  { id: "compuoriente", nombre: "Compuoriente", huella: /\bcompuoriente\b|\bpower group\b/i, parse: parseCompuoriente },
];

export type Deteccion = { motor: MotorPdf | null; muestra: string };

/** Identifica el proveedor leyendo las primeras páginas del PDF. */
export async function detectarProveedor(buffer: Buffer): Promise<Deteccion> {
  const lineas = await lineasDePdf(buffer);
  // Con las primeras 400 líneas basta y sobra: la marca aparece en la portada y
  // en el encabezado de cada página.
  const muestra = lineas.slice(0, 400).join(" ");
  const encontrado = MOTORES.find((m) => m.huella.test(muestra));
  return {
    motor: encontrado ? { id: encontrado.id, nombre: encontrado.nombre, parse: encontrado.parse } : null,
    muestra: muestra.slice(0, 160),
  };
}
