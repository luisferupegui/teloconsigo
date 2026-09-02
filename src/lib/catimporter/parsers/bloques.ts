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

/**
 * Rótulo de otro recuadro de la página.
 *
 * En estos catálogos la ficha del equipo convive con paneles de accesorios que
 * el extractor de texto deja pegados detrás del último campo. Un valor acababa
 * así:
 *
 *   Monitor: 23.8" Compumax 144HZ FHD TARJETA DE VIDEO MSI GEFORCE RTX 3050
 *            VENTUS 2X 6G OC REFRIGERACION LIQUIDA 240MM
 *
 * El monitor es 23.8" 144HZ FHD; lo demás son los títulos de los dos recuadros
 * siguientes. Donde aparece uno de estos rótulos, el valor terminó.
 *
 * Se distingue del valor porque son títulos de sección SIN dos puntos: la
 * "Fuente de Poder:" del equipo lleva etiqueta y se reconoce como campo, y la
 * "FUENTE DE PODER" del panel de al lado no.
 */
const ROTULO_DE_PANEL =
  /^(tarjeta de video|refrigeraci[oó]n|ventilador(es)?\b|disipador(es)?\b|equipos?\s|opciones\s|modelos\s|partes para pc|caj[oó]n\s)/i;

export type Campo = { etiqueta: string; valor: string };

/**
 * Convierte las líneas de un bloque en campos, uniendo las continuaciones. Las
 * líneas sueltas de antes del primer campo se devuelven aparte: en estas listas
 * suelen ser la referencia o el nombre de familia del producto.
 *
 * `maxContinuacion` — cuántas líneas sin etiqueta puede absorber un campo antes
 * de darlo por cerrado.
 *
 * Hace falta un tope porque el texto plano del PDF intercala la ficha con
 * paneles que en la página están en otro sitio, y esos caen detrás del último
 * campo. Al cliente le llegaba así:
 *
 *   Pantalla: ACER 23,8 KA242Y MSI GEFORCE RTX 5050 8G VENTUS
 *
 * El monitor es "ACER 23,8 KA242Y"; lo demás es el panel de tarjetas de video
 * de al lado. Lo mismo le pasaba a la fuente de poder, que se tragaba la
 * refrigeración líquida de la ficha vecina.
 *
 * El tope lo pone CADA LECTOR porque depende de cómo esté maquetado su
 * catálogo, y ponerlo global rompía uno para arreglar el otro: con 1, la
 * "Conectividad: Wi-Fi 6 + Bluetooth Cámara Teclado en español" de Compumax
 * —que es de verdad— se quedaba en "Wi-Fi 6 + Bluetooth".
 */
export function camposDeBloque(
  lineas: string[],
  maxContinuacion = 1,
): { campos: Campo[]; sueltas: string[] } {
  const campos: Campo[] = [];
  const sueltas: string[] = [];
  let continuaciones = 0;

  for (const linea of lineas) {
    const m = linea.match(ETIQUETA);
    if (m) {
      campos.push({ etiqueta: normalizarEtiqueta(m[1]), valor: m[2].trim() });
      continuaciones = 0;
      continue;
    }
    // El precio NUNCA es continuación de una spec. En Compuoriente va en su
    // propia línea, al final del bloque, y sin esta guarda acababa pegado al
    // último campo: "Almacenamiento: SATA / HIKSEMI 512GB … $1.599.000".
    // Un precio metido dentro de una especificación es un dato corrupto que
    // después nadie sabe de dónde salió.
    if (ES_SOLO_PRECIO.test(linea)) { sueltas.push(linea); continue; }

    if (campos.length === 0) { sueltas.push(linea); continue; }
    // Aquí empieza otro recuadro de la página: el valor terminó.
    if (ROTULO_DE_PANEL.test(linea)) { sueltas.push(linea); continuaciones = maxContinuacion; continue; }
    // Pasado el tope, la línea ya no es de este campo: es texto de otra parte
    // de la página que el extractor dejó aquí. Se aparta en vez de ensuciarlo.
    if (continuaciones >= maxContinuacion) { sueltas.push(linea); continue; }
    // Continuación del último campo. Si el campo venía vacío ("Procesador:" y el
    // valor en la línea siguiente), esta línea ES el valor.
    const ultimo = campos[campos.length - 1];
    ultimo.valor = ultimo.valor ? `${ultimo.valor} ${linea}` : linea;
    continuaciones++;
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
  // El índice y el arreglo completo van como argumentos porque hay catálogos en
  // los que la línea sola no basta para saber si abre una ficha: Compuoriente
  // usa "EQUIPO" tanto para abrir un equipo como de rótulo encima del precio, y
  // solo se distinguen mirando si la línea siguiente es una referencia.
  esInicio: (linea: string, indice: number, lineas: string[]) => boolean,
): string[][] {
  const bloques: string[][] = [];
  let actual: string[] | null = null;
  for (const [i, linea] of lineas.entries()) {
    if (esInicio(linea, i, lineas)) {
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
