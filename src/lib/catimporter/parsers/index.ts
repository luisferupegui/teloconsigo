import "server-only";
import { lineasDePdf } from "./bloques";
import { parseCompumax } from "./compumax";
import { parseCompuoriente } from "./compuoriente";
import { parseLedacom } from "./ledacom";
import type { ResultadoParser } from "./tipos";

// ─── Qué proveedor es esta lista ─────────────────────────────────────────────
//
// Se decide por el CONTENIDO del PDF, no por el nombre del archivo: el archivo
// se llama como quiera quien lo descargue, pero el catálogo siempre se nombra a
// sí mismo. Así una "Lista agosto (1).pdf" se reconoce igual.

export type MotorPdf = { id: string; nombre: string; parse: (b: Buffer) => Promise<ResultadoParser> };

const MOTORES: { id: string; nombre: string; huella: RegExp; parse: MotorPdf["parse"] }[] = [
  { id: "compumax",     nombre: "Compumax",     huella: /\bcompumax\b/gi,     parse: parseCompumax },
  { id: "compuoriente", nombre: "Compuoriente", huella: /\bcompuoriente\b|\bpower group\b/gi, parse: parseCompuoriente },
  { id: "ledacom",      nombre: "Ledacom",      huella: /\bledacom\b/gi,      parse: parseLedacom },
];

export type Deteccion = { motor: MotorPdf | null; muestra: string };

/** Identifica el proveedor leyendo el contenido del PDF.
 *
 *  GANA EL QUE MÁS SE NOMBRA, no el primero de la lista. Un mayorista vende las
 *  marcas de los demás: el catálogo de Ledacom menciona "Power Group" cuatro
 *  veces, y con una detección por orden de aparición se lo habría quedado el
 *  motor de Compuoriente —que no sabe leerlo— y la lista habría vuelto a dar
 *  cero. Contando menciones no hay empate posible: Ledacom se nombra 18 veces
 *  en su propio catálogo, y Compuoriente 299 en el suyo. */
export async function detectarProveedor(buffer: Buffer): Promise<Deteccion> {
  const lineas = await lineasDePdf(buffer);
  const texto = lineas.join(" ");

  let mejor: (typeof MOTORES)[number] | null = null;
  let mejorPuntaje = 0;
  for (const m of MOTORES) {
    const puntaje = (texto.match(m.huella) ?? []).length;
    if (puntaje > mejorPuntaje) { mejor = m; mejorPuntaje = puntaje; }
  }

  return {
    motor: mejor ? { id: mejor.id, nombre: mejor.nombre, parse: mejor.parse } : null,
    muestra: `${mejor?.id ?? "sin motor"} (${mejorPuntaje} menciones)`,
  };
}
