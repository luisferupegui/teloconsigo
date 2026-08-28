import "server-only";
// Se importa el módulo interno, NO la raíz "pdf-parse": su index.js corre un bloque de
// debug al cargarse que lee un PDF de prueba inexistente y rompe el build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

// ─── Lectura de catálogos PDF por BLOQUES ────────────────────────────────────
//
// Compumax y Compuoriente no publican tablas: publican una FICHA por producto,
// donde cada dato viene como "Etiqueta: valor". El importador que ya teníamos
// busca un nombre a la izquierda de un precio —el patrón de una tabla— y por eso
// devolvía cero productos en estas dos listas, aunque el PDF tiene todo el texto.
//
// Aquí se leen como lo que son: bloques de campos etiquetados.
//
// EL DETALLE QUE LO HACE FUNCIONAR: el extractor de texto corta las líneas por
// ancho de columna, así que un valor largo se parte en varias líneas y solo la
// primera lleva la etiqueta:
//
//     Memoria:   SODIMM 8GB BUS DE
//     2666 (2*4GB)              ← esto sigue siendo la memoria
//
// Una línea SIN etiqueta continúa el campo anterior. Sin esa regla, media
// especificación se perdería y la otra media quedaría como producto suelto.

/** Todas las líneas de texto del PDF, limpias y sin vacías. */
export async function lineasDePdf(buffer: Buffer): Promise<string[]> {
  const data = await pdfParse(buffer);
  return String(data?.text ?? "")
    .split("\n")
    .map((l: string) => l.replace(/ /g, " ").trim())
    .filter(Boolean);
}

/** Una etiqueta al inicio de línea: "Disco Duro: SSD512GB". Se admiten paréntesis
 *  porque los proveedores anotan alternativas: "Board (2 opc): MSI / ASUS". */
const ETIQUETA = /^([A-Za-zÁÉÍÓÚÑÜáéíóúñü][A-Za-zÁÉÍÓÚÑÜáéíóúñü .\/]{1,34}(?:\([^)]{1,18}\))?)\s*:\s*(.*)$/;

/** Una línea que es SOLO un precio: "$1.599.000". */
const ES_SOLO_PRECIO = /^\$\s*[\d][\d.,]{3,}\s*$/;

export type Campo = { etiqueta: string; valor: string };

/** Convierte las líneas de un bloque en campos, uniendo las continuaciones.
 *  Las líneas sueltas de antes del primer campo se devuelven aparte: en estas
 *  listas suelen ser la referencia o el nombre de familia del producto. */
export function camposDeBloque(lineas: string[]): { campos: Campo[]; sueltas: string[] } {
  const campos: Campo[] = [];
  const sueltas: string[] = [];

  for (const linea of lineas) {
    const m = linea.match(ETIQUETA);
    if (m) {
      campos.push({ etiqueta: normalizarEtiqueta(m[1]), valor: m[2].trim() });
      continue;
    }
    // El precio NUNCA es continuación de una spec. En Compuoriente va en su
    // propia línea, al final del bloque, y sin esta guarda acababa pegado al
    // último campo: "Almacenamiento: SATA / HIKSEMI 512GB … $1.599.000".
    // Un precio metido dentro de una especificación es un dato corrupto que
    // después nadie sabe de dónde salió.
    if (ES_SOLO_PRECIO.test(linea)) { sueltas.push(linea); continue; }

    if (campos.length === 0) { sueltas.push(linea); continue; }
    // Continuación del último campo. Si el campo venía vacío ("Procesador:" y el
    // valor en la línea siguiente), esta línea ES el valor.
    const ultimo = campos[campos.length - 1];
    ultimo.valor = ultimo.valor ? `${ultimo.valor} ${linea}` : linea;
  }

  for (const c of campos) c.valor = c.valor.replace(/\s{2,}/g, " ").trim();
  return { campos, sueltas };
}

/** "Disco Duro" → "disco duro"; "Board (2 opc)" → "board". La variante entre
 *  paréntesis es una nota del proveedor, no parte del nombre del campo. */
function normalizarEtiqueta(bruta: string): string {
  return bruta
    .replace(/\([^)]*\)/g, "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();
}

/** Precio colombiano dentro de un texto: "$ 1.732.500" → 1732500.
 *  Devuelve `null` si no hay ninguno o si la cifra no es plausible. */
export function precioDeTexto(texto: string): number | null {
  const m = texto.match(/\$\s*([\d][\d.,]{3,})/);
  if (!m) return null;
  // En Colombia el punto separa miles. Se descartan los decimales si los hubiera.
  const limpio = m[1].replace(/\./g, "").replace(/,\d{1,2}$/, "").replace(/,/g, "");
  const n = Number(limpio);
  // Por debajo de $1.000 no es un precio de catálogo: suele ser un número de
  // modelo o una medida que arrastró el símbolo.
  return Number.isFinite(n) && n >= 1000 ? n : null;
}

/** Parte una lista de líneas en bloques, empezando uno nuevo cada vez que
 *  `esInicio` reconoce una línea. Lo anterior al primer inicio se descarta:
 *  es la carátula del catálogo (direcciones, avisos legales, índice). */
export function partirEnBloques(
  lineas: string[],
  esInicio: (linea: string) => boolean,
): string[][] {
  const bloques: string[][] = [];
  let actual: string[] | null = null;
  for (const linea of lineas) {
    if (esInicio(linea)) {
      if (actual) bloques.push(actual);
      actual = [linea];
    } else if (actual) {
      actual.push(linea);
    }
  }
  if (actual) bloques.push(actual);
  return bloques;
}

/** Busca el primer campo cuya etiqueta empiece por alguno de los nombres dados. */
export function campo(campos: Campo[], ...nombres: string[]): string | undefined {
  for (const n of nombres) {
    const c = campos.find((x) => x.etiqueta === n) ?? campos.find((x) => x.etiqueta.startsWith(n));
    if (c?.valor) return c.valor;
  }
  return undefined;
}
