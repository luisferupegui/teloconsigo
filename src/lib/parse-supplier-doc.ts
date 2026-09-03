import "server-only";
import JSZip from "jszip";
import { sinVram, ramYDisco, pantallaDesdeNombre } from "./specs-nombre";
// Se importa el módulo interno, NO la raíz "pdf-parse": su index.js corre un bloque de
// debug al cargarse que lee un PDF de prueba inexistente y rompe el build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

// Extracción DETERMINISTA de listas de proveedor en Word (.docx) y Excel (.xlsx).
// No usa IA: lee directamente las celdas de las tablas, así que conserva el
// vínculo nombre↔precio sin mezclar productos (a diferencia del texto de un PDF).

export type ParsedProduct = {
  nombre: string;
  marca: string;
  categoria: string;
  precio_costo: number;
  referencia: string;
  specs?: Record<string, string>;
  /** Dudas que el propio lector quiere levantar sobre lo que acaba de leer.
   *  Se suman a los avisos del producto y lo mandan a revisión; no lo descartan
   *  ni cambian ninguno de sus datos. Un lector sabe cosas de su catálogo que
   *  la validación genérica no puede saber. */
  avisos?: string[];
};

// ── Helpers de texto ──────────────────────────────────────────────────────────

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

/** ¿La celda parece un PRECIO? Acepta "$ 1.432,000", "1.432,000" o un número
 *  puro ≥ 10.000. En Colombia . y , son separadores de miles. El umbral evita
 *  confundir los SKU de 3–4 dígitos (5195, 3010…) con precios. */
function looksLikePrice(s: string, escala = 1): boolean {
  if (!s) return false;
  const t = s.trim();
  if (/\$/.test(t) && /\d/.test(t)) return true;          // tiene símbolo $
  if (!/^[\d.,\s]+$/.test(t)) return false;               // no es numérico puro
  const digits = t.replace(/[^\d]/g, "");
  // Hoja en MILES: la celda guarda 49 y Excel muestra "$ 49,000". Aquí dos cifras ya
  // son un precio válido; lo que impide confundirlo con un código es que a un código
  // le sigue el NOMBRE del producto (ver productsFromCells).
  // Basta UNA cifra: un cable de $5.000 se guarda como "5". Lo que impide confundirlo
  // con un código es la regla posicional, no la longitud.
  if (escala > 1) return digits.length >= 1;
  if (digits.length < 4) return false;
  if (/[.,]/.test(t)) return true;                        // tiene separador de miles
  return parseInt(digits, 10) >= 10000;                   // número pelado → solo si ≥ 10.000
}

function parsePrecio(s: string): number {
  const n = parseInt(s.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

const HEADER_TOKENS = new Set([
  "cod", "valor", "unidades", "precio", "ref", "referencia", "descripcion", "descripción", "item",
]);

/** Filtra productos NO tecnológicos (este proveedor mezcla café/alimentos). */
// ⚠️ Sin `\b` al FINAL: "CAFÉ" termina en una letra acentuada, que en JavaScript no
// cuenta como carácter de palabra, así que el límite nunca se cumplía y "CAFÉ BLEND
// BOURBON" se colaba al catálogo de tecnología. El límite inicial sí se conserva.
const NON_TECH = /\b(caf[eé]|chemex|grano|molido|tostad|honey|alimento|az[uú]car|panela|bebida)/i;

// ── Marca y categoría (deducidas del nombre) ───────────────────────────────────

const MARCAS = [
  "ASRock", "Gigabyte", "MSI", "Asus", "ADATA", "Kingston", "Patriot", "Crucial", "Lexar",
  "HIKSEMI", "Hikvision", "Western Digital", "Seagate", "Corsair", "Intel", "AMD", "Nvidia",
  "Foxconn", "Logitech", "Redragon", "TP-Link", "HP", "Lenovo", "Dell", "Samsung", "Acer",
  "Thermaltake", "Cooler Master", "XPG", "EVGA", "Zotac", "Palit", "PNY", "Biostar",
];
function inferMarca(nombre: string): string {
  const up = nombre.toUpperCase();
  for (const m of MARCAS) if (up.includes(m.toUpperCase())) return m;
  return (nombre.trim().split(/\s+/)[0] ?? "").replace(/[^A-Za-z0-9]/g, "") || "Genérico";
}

// Nota: NO envolver con \b(...)\b — un \b final tras un dígito rompe el match con
// modelos como "RX 7600" (el dígito va seguido de otro dígito, no de un borde).
const CAT_RULES: [RegExp, string][] = [
  // PORTÁTIL primero: un portátil menciona GPU, disco, RAM, CPU, fuente y pantalla, así que
  // CUALQUIER regla de componente lo capturaría mal (antes caían en "almacenamiento" por el
  // "512GB"). Se detecta por la palabra explícita, o por CPU + PANTALLA de tamaño de portátil
  // (11–17"). Los escritorios con monitor dicen "MONITOR" (no "PANTALLA 1x") y los monitores/AIO
  // son de 21" en adelante, así que no caen aquí.
  [/(port[aá]til|laptop|notebook|ultrabook)/i, "portatil"],
  [/^(?=.*\b(ryzen|core\s?i[3579]|core\s?ultra|celeron|pentium|athlon|i[3579]-\d{3,4}[a-z])\b)(?=.*(pantalla\s*1[0-7]\b|\b1[0-7][.,]\d\s*("|''|pulg)))/i, "portatil"],
  [/(\brtx|\bgtx|\bradeon|\brx\s?\d|\barc\s?a\d|geforce)/i, "tarjeta-grafica"],
  // Memoria USB / pendrive ANTES que almacenamiento: en el catálogo de la tienda vive
  // en "Accesorios" (junto al hub USB-C y el Dual Drive), y de ahí sale su margen. Sin
  // esta regla la clasificación dependía de los dígitos de la capacidad: "USB 128GB"
  // encajaba en el patrón de 3-4 cifras y era almacenamiento, pero "USB 64GB" no y caía
  // en accesorios — el mismo producto con dos márgenes distintos.
  [/^(?=.*\b(usb|pendrive|flash\s?drive)\b)(?=.*\b\d{1,4}\s?[gt]b\b)(?!.*\b(ssd|nvme|hdd|m\.?2|disco|caja|adaptador|hub|cable|teclado|mouse|c[aá]mara|wifi|bluetooth)\b)/i, "accesorios"],
  [/(\bssd\b|\bnvme\b|\bm\.?2\b|\bhdd\b|\bdisco|barracuda|legend\s?\d|\bnv[123]\b|\b\d{3,4}\s?gb\b|\b\d\s?tb\b)/i, "almacenamiento"],
  [/(\bddr[345]\b|udimm|sodimm|\bram\b|memoria)/i, "memoria-ram"],
  [/(\bboard\b|motherboard|tarjeta madre|\blga\b|\bam4\b|\bam5\b|\b[bhz]\d{3}[a-z]?\b|\ba\d{3}m\b)/i, "motherboard"],
  [/(ryzen|core\s?i[3579]|pentium|celeron|procesador|\bcpu\b|threadripper)/i, "procesador"],
  [/(fuente|\bpsu\b|\b\d{3,4}\s?w\b|80\s?plus)/i, "fuente-poder"],
  [/(monitor|pulgadas|\b\d{2,3}\s?hz\b|curvo|\bips\b)/i, "monitor"],
  [/(port[aá]til|laptop|notebook)/i, "portatil"],
  [/(\bmouse\b|rat[oó]n)/i, "mouse"],
  [/(teclado|keyboard)/i, "teclado"],
  [/(aud[ií]fono|auricular|headset|diadema)/i, "auriculares"],
  [/(impresora|t[oó]ner|cartucho|multifuncional)/i, "impresora"],
  [/(router|switch|\bred\b|wifi|access point|antena)/i, "redes"],
  [/(refriger|cooler|ventilador|disipador|\bfan\b|\baio\b)/i, "refrigeracion"],
  [/(gabinete|\bcase\b|chasis|\btorre\b)/i, "escritorio"],
];
function inferCategoria(nombre: string): string {
  for (const [re, cat] of CAT_RULES) if (re.test(nombre)) return cat;
  return "accesorios";
}

// ── Correcciones que se aplican SIEMPRE, incluso cuando el documento trae su propia
//    categoría en la cabecera de sección ────────────────────────────────────────
//
// Los proveedores archivan por donde les conviene comercialmente, no por lo que la cosa
// es. Estas dos correcciones vienen de errores que llegaron hasta el cliente:
//
//   • Cinco PC COMPLETOS venían bajo "almacenamiento" (por su SSD), y al cotizar el disco
//     de una configuración se elegía el equipo entero: $2.628.000 por un SSD de 512GB.
//   • Un GABINETE vacío venía como "escritorio", y entraba en las búsquedas de equipos
//     completos como si fuera un computador.

/** Un equipo completo NOMBRA su procesador y al menos otras dos piezas. Una pieza suelta
 *  no: un SSD no menciona un Ryzen, y un procesador no menciona una board. */
function esEquipoCompleto(nombre: string): boolean {
  const n = nombre.toLowerCase();
  if (!/\b(ryzen|core\s?i[3579]|core\s?ultra|pentium|celeron|athlon|xeon|epyc)\b/.test(n)) return false;
  const piezas = [
    /\b(board|placa|motherboard|prime|[abxzh]\d{3}m?)\b/,   // placa madre
    /\b(ddr[45]|\d{1,2}\s?gb\s?(ram|ddr))\b/,               // memoria
    /\b(ssd|nvme|hdd|\d{3,4}\s?gb|\d\s?tb)\b/,             // almacenamiento
  ].filter((re) => re.test(n)).length;
  return piezas >= 2;
}

/** Una caja sin componentes: dice gabinete o chasis, o empieza por "torre".
 *
 *  NO vale buscar "case" a secas: una tablet vendida con funda se llama "Tab 10 (4/128) +
 *  Combo Case/Audífonos" y acababa reclasificada como accesorio, dejando de ser una tablet. */
function esGabinete(nombre: string): boolean {
  const n = nombre.toLowerCase().trim();
  if (/\b(ryzen|core\s?i[3579]|pentium|celeron|xeon|snapdragon|mediatek)\b/.test(n)) return false;
  return /\b(gabinete|chasis)\b/.test(n) || /^torre\b/.test(n);
}

/** Última palabra sobre la categoría de un producto importado. Corrige lo que el
 *  documento dice cuando el propio nombre lo desmiente. */
/** Specs que el NOMBRE ya declara, listas para guardar.
 *
 *  Hasta ahora se deducían en cada consulta, con dos costes: repetir el mismo trabajo en
 *  cada búsqueda y —peor— que un dato pareciera faltar cuando en realidad estaba escrito.
 *  Guardarlas al importar deja la lista buena desde el primer día y hace que el completador
 *  por web sepa de verdad qué falta y no gaste consultas de más.
 *
 *  Solo se guarda lo que el nombre AFIRMA; lo que no, se queda vacío. */
export function specsDelNombre(nombre: string, categoria: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Cada spec solo se guarda donde SIGNIFICA algo. Sin esta separación, a una "ASROCK RX
  // 7600 CHALLENGER 8GB" se le guardaba "ram: 8GB" — esos 8GB son la VRAM de la gráfica, no
  // la memoria de ningún equipo.
  const esEquipo = EQUIPO_CON_SPECS.has(categoria);
  const { ram, disco } = ramYDisco(sinVram(nombre));

  if (ram != null && (esEquipo || categoria === "memoria-ram")) out.ram = `${ram}GB`;
  if (disco != null && (esEquipo || categoria === "almacenamiento")) {
    out.almacenamiento = disco >= 1024 && disco % 1024 === 0 ? `${disco / 1024}TB` : `${disco}GB`;
  }

  // La pantalla, solo para los equipos que la llevan integrada: en una torre, unas pulgadas
  // en el nombre son las del monitor que la acompaña, no las suyas.
  if (PANTALLA_INTEGRADA.has(categoria)) {
    const p = pantallaDesdeNombre(nombre);
    if (p) out.pantalla = p;
  }
  return out;
}

const EQUIPO_CON_SPECS = new Set([
  "portatil", "escritorio", "escritorio-alto-rendimiento",
  "all-in-one", "todo-en-uno", "mini-pc", "tableta", "servidor",
]);
const PANTALLA_INTEGRADA = new Set(["portatil", "all-in-one", "todo-en-uno", "tableta"]);

export function corregirCategoria(nombre: string, categoria: string): string {
  if (esGabinete(nombre)) return "accesorios";
  // Un equipo completo archivado como pieza: se manda a escritorio, y a la gama alta si
  // trae gráfica dedicada, que es lo que decide su margen.
  const esPieza = PIEZAS.has(categoria);
  if (esPieza && esEquipoCompleto(nombre)) {
    return /\b(rtx|gtx|radeon\s+rx|\brx\s?\d{3,4})\b/i.test(nombre)
      ? "escritorio-alto-rendimiento"
      : "escritorio";
  }
  return categoria;
}

const PIEZAS = new Set([
  "almacenamiento", "memoria-ram", "tarjeta-grafica", "motherboard",
  "fuente-poder", "refrigeracion", "monitor", "accesorios",
]);

// ── Núcleo: filas de celdas → productos ────────────────────────────────────────

/** Recorre cada fila buscando celdas de precio; el nombre es la celda de texto
 *  inmediatamente a la izquierda y la referencia (SKU) la anterior si es un código. */
function productsFromCells(rows: string[][], escala = 1): ParsedProduct[] {
  const out: ParsedProduct[] = [];
  const seen = new Set<string>();

  for (const cells of rows) {
    for (let i = 0; i < cells.length; i++) {
      if (!looksLikePrice(cells[i], escala)) continue;
      // A un CÓDIGO le sigue el nombre del producto; a un PRECIO no. Es lo que
      // distingue "7024" (código) de "1398" (precio) cuando ambos son números pelados.
      // La regla anterior —"si la siguiente también parece precio, esta es un código"—
      // fallaba con tablas lado a lado: el código de la tabla vecina hacía descartar el
      // precio de la anterior, y se perdían casi todos los productos.
      if (/[a-zA-ZÁÉÍÓÚÑáéíóúñ]/.test(cells[i + 1] ?? "")) continue;

      const precio = parsePrecio(cells[i]) * escala;
      if (precio < 1000) continue;

      // Nombre: celda de texto (con letras) hasta 2 posiciones a la izquierda.
      let nombre = "";
      let nameIdx = -1;
      for (let j = i - 1; j >= 0 && j >= i - 2; j--) {
        const c = cells[j];
        if (c && !looksLikePrice(c) && /[a-zA-ZÁÉÍÓÚÑáéíóúñ]/.test(c)) { nombre = c.trim(); nameIdx = j; break; }
      }
      if (!nombre || nombre.length < 4) continue;
      if (HEADER_TOKENS.has(nombre.toLowerCase())) continue;
      if (NON_TECH.test(nombre)) continue;

      // Referencia: celda anterior al nombre, si es un código (tiene dígito, corto).
      let referencia = "";
      if (nameIdx > 0) {
        const prev = cells[nameIdx - 1]?.trim() ?? "";
        if (prev && prev !== "·" && /\d/.test(prev) && /^[A-Za-z0-9][A-Za-z0-9.\-/]{1,11}$/.test(prev) && !looksLikePrice(prev)) {
          referencia = prev;
        }
      }

      const key = nombre.toLowerCase() + "|" + precio;
      if (seen.has(key)) continue;
      seen.add(key);

      // La categoría se corrige si el nombre desmiente lo deducido, y las specs que el
      // nombre declara se guardan ya: la lista entra buena, no se repara después.
      const categoria = corregirCategoria(nombre, inferCategoria(nombre));
      const specs = specsDelNombre(nombre, categoria);
      out.push({
        nombre,
        marca: inferMarca(nombre),
        categoria,
        precio_costo: precio,
        referencia,
        specs: Object.keys(specs).length ? specs : undefined,
      });
    }
  }
  return out;
}

// ── .docx ───────────────────────────────────────────────────────────────────

function rowsFromDocx(xml: string): string[][] {
  const rows: string[][] = [];
  for (const tabla of xml.split("<w:tbl>").slice(1)) {
    const tablaXml = tabla.split("</w:tbl>")[0];
    for (const row of tablaXml.split("<w:tr").slice(1)) {
      const rowXml = row.split("</w:tr>")[0];
      const cells = rowXml
        .split("<w:tc>")
        .slice(1)
        .map((c) =>
          decodeXml([...c.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((x) => x[1]).join("")).trim(),
        );
      if (cells.length) rows.push(cells);
    }
  }
  return rows;
}

// ── Parseo por columnas explícitas (Word sin tablas / Excel con encabezado) ────
// Algunos proveedores (p. ej. Ledacom 2026) entregan la lista con columnas
// explícitas y encabezado "Marca,Referencia,Categoría,…,Precio" — en .docx como
// CSV pegado en párrafos, o en .xlsx con celdas. Cuando hay encabezado respetamos
// marca/categoría reales y capturamos specs, en vez de adivinarlas del nombre.

/** Párrafos de un document.xml como texto plano. */
function paragraphsFromDocx(xml: string): string[] {
  return [...xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)]
    .map((m) => decodeXml([...m[1].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((x) => x[1]).join("")).trim())
    .filter(Boolean);
}

/** Parsea una línea CSV (maneja campos entre comillas y "" escapado). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// Etiquetas de categoría del proveedor → slugs internos (para márgenes/filtros).
const CAT_LABEL_MAP: [RegExp, string][] = [
  [/tableta/i, "tableta"],
  [/port[aá]til/i, "portatil"],
  [/all.?in.?one|todo en uno/i, "all-in-one"],
  [/ensamblad|escritorio/i, "escritorio"],
  [/perif[eé]ric/i, "perifericos"],
  [/software|antivirus|licencia/i, "software"],
  [/servidor/i, "servidor"],
  [/(tarjeta.*v[ií]deo|gr[aá]fica|\bvideo\b)/i, "tarjeta-grafica"],
  [/c[aá]mara|seguridad|vigilancia/i, "camara"],
  [/red(es)?|router|switch/i, "redes"],
  [/almacenamiento|disco|ssd|nvme/i, "almacenamiento"],
  [/memoria|\bram\b/i, "memoria-ram"],
  [/monitor/i, "monitor"],
  [/accesori/i, "accesorios"],
];
function slugCategoria(label: string): string {
  for (const [re, slug] of CAT_LABEL_MAP) if (re.test(label)) return slug;
  const s = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "accesorios";
}

// Encabezados que son columnas BASE (no specs). El resto de columnas con título
// (Procesador, Memoria RAM, Almacenamiento, Pantalla, Otros Detalles…) → specs.
const NON_SPEC_HEADER = /^(marca|referencia|nombre|producto|modelo|descripci[oó]n|categor[ií]a|precio|valor|cod|item|sku)$/;

/** ¿Esta fila es un encabezado tipo "Marca … Precio"? */
function isHeaderRow(r: string[]): boolean {
  const low = r.map((c) => c.toLowerCase().trim());
  return low.includes("marca") && low.some((c) => /precio|valor/.test(c));
}

/** Índices de columna donde EMPIEZA cada tabla. Este proveedor pone 2 o 3 tablas lado a
 *  lado en la misma hoja ("COD | PRODUCTO | VALOR" repetido), y sin separarlas el código
 *  de la tabla vecina se confunde con el precio de la anterior. Los encabezados "COD"
 *  marcan dónde empieza cada una. */
function inicioDeTablas(rows: string[][]): number[] {
  const inicios = new Set<number>();
  for (const r of rows) {
    r.forEach((c, i) => { if (/^(cod|c[oó]digo|ref)$/i.test((c ?? "").trim())) inicios.add(i); });
  }
  return [...inicios].sort((a, b) => a - b);
}

/** Parte cada fila en las tablas que conviven en ella. Con una sola tabla no toca nada. */
function separarTablas(rows: string[][]): string[][] {
  const inicios = inicioDeTablas(rows);
  if (inicios.length <= 1) return rows;
  const ancho = Math.max(...rows.map((r) => r.length));
  const finales = [...inicios.slice(1), ancho];
  const out: string[][] = [];
  for (const r of rows) {
    inicios.forEach((ini, k) => {
      const trozo = r.slice(ini, finales[k]);
      if (trozo.some((c) => (c ?? "").trim())) out.push(trozo);
    });
  }
  return out;
}

/** ¿Los precios están en MILES? En el .xlsx la celda guarda 1398 y Excel lo MUESTRA como
 *  "$ 1.398,000" — el formato es de presentación, el valor real es 1398. Se detecta por
 *  magnitud: un precio real en pesos ronda los cientos de miles, así que una mediana por
 *  debajo de 10.000 solo puede significar que la hoja está en miles. */
function escalaDePrecios(rows: string[][]): number {
  const vals: number[] = [];
  for (const r of rows) {
    for (const c of r) {
      const t = (c ?? "").trim();
      if (/^\d{2,7}$/.test(t)) vals.push(parseInt(t, 10));
    }
  }
  if (vals.length < 10) return 1;
  vals.sort((a, b) => a - b);
  const mediana = vals[Math.floor(vals.length / 2)];
  return mediana > 0 && mediana < 10000 ? 1000 : 1;
}

/**
 * Motor unificado: dado un conjunto de filas (de tabla Word, hoja Excel o CSV en
 * párrafos), si hay una fila de encabezado "Marca … Precio" parsea por COLUMNAS
 * EXPLÍCITAS (respeta marca/categoría y captura specs). Si no, cae a la heurística
 * posicional de siempre (precio + nombre a la izquierda) para proveedores sin encabezado.
 */
function productsFromRows(rows: string[][], escala = 1): ParsedProduct[] {
  const headerIdx = rows.findIndex(isHeaderRow);
  if (headerIdx === -1) return productsFromCells(rows, escala);

  const header = rows[headerIdx];
  const low = header.map((c) => c.toLowerCase().trim());
  const find = (re: RegExp, def: number) => { const i = low.findIndex((c) => re.test(c)); return i === -1 ? def : i; };
  const idxMarca  = find(/marca/, 0);
  const idxNombre = find(/referencia|descrip|nombre|producto|modelo/, 1);
  const idxCat    = find(/categor/, 2);
  const idxPrecio = find(/precio|valor/, header.length - 1);
  const specCols = header
    .map((label, i) => ({ i, label: label.trim() }))
    .filter(({ label }) => label && !NON_SPEC_HEADER.test(label.toLowerCase()));

  const out: ParsedProduct[] = [];
  const seen = new Set<string>();
  for (let r = 0; r < rows.length; r++) {
    if (r === headerIdx) continue;
    const cells = rows[r];
    if (isHeaderRow(cells)) continue;                       // encabezados repetidos (docx multi-sección)
    if (cells.filter((c) => c.trim()).length < 2) continue; // títulos de sección, líneas sueltas

    const nombre = (cells[idxNombre] ?? "").trim();
    const precioRaw = (cells[idxPrecio] ?? cells[cells.length - 1] ?? "").trim();
    if (!nombre || nombre.length < 3 || nombre.toLowerCase() === "n/a") continue;
    if (!looksLikePrice(precioRaw, escala)) continue;
    const precio = parsePrecio(precioRaw) * escala;
    if (precio < 1000) continue;
    if (NON_TECH.test(nombre)) continue;

    const marca = (cells[idxMarca] ?? "").trim() || inferMarca(nombre);
    const catLabel = (cells[idxCat] ?? "").trim();
    // La categoría del documento manda… salvo cuando el nombre la desmiente.
    const categoria = corregirCategoria(
      nombre,
      catLabel ? slugCategoria(catLabel) : inferCategoria(nombre),
    );

    // Specs estructuradas (las trae el .xlsx; el .docx CSV no, van en el nombre).
    const specs: Record<string, string> = {};
    for (const { i, label } of specCols) {
      const v = (cells[i] ?? "").trim();
      if (v && v.toLowerCase() !== "n/a") specs[label] = v;
    }

    const key = nombre.toLowerCase() + "|" + precio;
    if (seen.has(key)) continue;
    seen.add(key);

    // Las columnas del documento mandan; el nombre solo rellena lo que ellas no traigan.
    const completas = { ...specsDelNombre(nombre, categoria), ...specs };
    out.push({
      nombre, marca, categoria, precio_costo: precio, referencia: "",
      specs: Object.keys(completas).length ? completas : undefined,
    });
  }
  return out;
}

export async function parseDocx(buffer: Buffer): Promise<ParsedProduct[]> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return [];
  const tableRows = rowsFromDocx(xml);
  // Con tablas → filas de tabla. Sin tablas → CSV en párrafos convertido a filas.
  const rows = tableRows.length > 0 ? tableRows : paragraphsFromDocx(xml).map(parseCsvLine);
  // El Word trae los precios ya escritos ("$ 1.398,000"), así que no hay escala que
  // corregir; separar las tablas lado a lado sí hace falta también aquí.
  return productsFromRows(separarTablas(rows));
}

// ── .xlsx ───────────────────────────────────────────────────────────────────

function colToIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function rowsFromXlsx(sheetXml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  for (const rowM of sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cM of rowM[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cM[1] ?? "";
      const inner = cM[2] ?? "";
      const refM = attrs.match(/\br="([A-Z]+)\d+"/);
      const typeM = attrs.match(/\bt="([a-z]+)"/);
      const type = typeM ? typeM[1] : "";

      let val = "";
      const vM = inner.match(/<v>([\s\S]*?)<\/v>/);
      const isM = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
      if (type === "inlineStr" && isM) val = isM[1];
      else if (vM) val = type === "s" ? (shared[parseInt(vM[1], 10)] ?? "") : vM[1];

      const col = refM ? colToIndex(refM[1]) : cells.length;
      cells[col] = decodeXml(val).trim();
    }
    for (let i = 0; i < cells.length; i++) if (cells[i] == null) cells[i] = "";
    if (cells.length) rows.push(cells);
  }
  return rows;
}

export async function parseXlsx(buffer: Buffer): Promise<ParsedProduct[]> {
  const zip = await JSZip.loadAsync(buffer);

  // Tabla de cadenas compartidas (Excel guarda los textos aquí y los referencia por índice).
  const ssXml = (await zip.file("xl/sharedStrings.xml")?.async("string")) ?? "";
  const shared = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    decodeXml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join("")),
  );

  const sheetNames = Object.keys(zip.files)
    .filter((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f))
    .sort();

  // Cada hoja se separa por su cuenta: pueden tener distinta cantidad de tablas.
  const allRows: string[][] = [];
  for (const sf of sheetNames) {
    const sx = await zip.file(sf)!.async("string");
    allRows.push(...separarTablas(rowsFromXlsx(sx, shared)));
  }
  return productsFromRows(allRows, escalaDePrecios(allRows));
}

// ── .pdf ────────────────────────────────────────────────────────────────────
//
// El PDF de una lista de precios es la MISMA tabla que el Word y el Excel, solo que
// dibujada. Se reconstruyen las filas a partir de las coordenadas del texto y se pasan
// por el mismo motor, para que los tres formatos no puedan dar resultados distintos.
//
// (No confundir con `parse-janus-pdf.ts`, que tiene columnas fijas calibradas para el PDF
//  concreto de Janus. Este es genérico: deduce las columnas del propio documento.)

type PdfItem = { t: string; x: number; y: number };

/** Texto del PDF con sus coordenadas, página por página. */
async function itemsDelPdf(buffer: Buffer): Promise<PdfItem[][]> {
  const paginas: PdfItem[][] = [];
  await pdfParse(buffer, {
    pagerender: async (pageData: {
      getTextContent: (o: Record<string, boolean>) => Promise<{ items: Array<{ str: string; transform: number[] }> }>;
    }) => {
      const tc = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
      paginas.push(
        tc.items
          .map((i) => ({ t: (i.str ?? "").trim(), x: Math.round(i.transform[4]), y: Math.round(i.transform[5]) }))
          .filter((i) => i.t),
      );
      return "";
    },
  });
  return paginas;
}

/** Dónde empieza cada tabla, deducido de los encabezados "COD" del propio documento.
 *  Las x se agrupan con tolerancia porque el mismo encabezado varía un pixel entre filas. */
function columnasDeTablas(items: PdfItem[]): number[] {
  const xs = items.filter((i) => /^(cod|c[oó]digo|ref)$/i.test(i.t)).map((i) => i.x).sort((a, b) => a - b);
  const grupos: number[] = [];
  for (const x of xs) {
    if (grupos.length === 0 || x - grupos[grupos.length - 1] > 40) grupos.push(x);
  }
  return grupos;
}

// Precio tal como lo dibuja el PDF: "$ 1.398,000" (o sin el símbolo).
const RE_PRECIO_PDF = /^\$?\s*[\d.]+,\d{3}$/;

/** Filas [código, nombre, precio] reconstruidas de una página. */
function filasDePagina(items: PdfItem[]): string[][] {
  const inicios = columnasDeTablas(items);
  if (inicios.length === 0) return [];
  const limites = inicios.map((ini, k) => [ini - 6, k + 1 < inicios.length ? inicios[k + 1] - 6 : Infinity] as const);

  // Agrupar por línea: los textos de una misma fila comparten la y salvo un pixel.
  const porY = new Map<number, PdfItem[]>();
  for (const it of items) {
    const clave = Math.round(it.y / 3) * 3;
    if (!porY.has(clave)) porY.set(clave, []);
    porY.get(clave)!.push(it);
  }

  const filas: string[][] = [];
  for (const y of [...porY.keys()].sort((a, b) => b - a)) {
    const linea = porY.get(y)!;
    for (const [ini, fin] of limites) {
      const enGrupo = linea.filter((i) => i.x >= ini && i.x < fin).sort((a, b) => a.x - b.x);
      if (enGrupo.length === 0) continue;

      let codigo = "";
      let precio = "";
      const nombre: string[] = [];
      for (const it of enGrupo) {
        if (RE_PRECIO_PDF.test(it.t)) { precio = it.t; continue; }
        // Código: número (o "0-0000") ANTES de que aparezca cualquier texto.
        if (!codigo && nombre.length === 0 && /^[0-9][0-9-]{0,11}$/.test(it.t)) { codigo = it.t; continue; }
        nombre.push(it.t);
      }
      const nom = nombre.join(" ").replace(/\s{2,}/g, " ").trim();
      if (nom || precio) filas.push([codigo, nom, precio]);
    }
  }
  return filas;
}

export async function parseListaPdf(buffer: Buffer): Promise<ParsedProduct[]> {
  const paginas = await itemsDelPdf(buffer);
  const filas: string[][] = [];
  for (const p of paginas) filas.push(...filasDePagina(p));
  return productsFromRows(filas);
}

// ── Dispatcher por extensión ───────────────────────────────────────────────────

export async function parseSupplierDoc(buffer: Buffer, filename: string): Promise<ParsedProduct[]> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".docx")) return parseDocx(buffer);
  if (lower.endsWith(".xlsx")) return parseXlsx(buffer);
  if (lower.endsWith(".pdf"))  return parseListaPdf(buffer);
  throw new Error("Formato no soportado. Usa .docx, .xlsx o .pdf.");
}
