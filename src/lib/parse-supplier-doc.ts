import "server-only";
import JSZip from "jszip";

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
function looksLikePrice(s: string): boolean {
  if (!s) return false;
  const t = s.trim();
  if (/\$/.test(t) && /\d/.test(t)) return true;          // tiene símbolo $
  if (!/^[\d.,\s]+$/.test(t)) return false;               // no es numérico puro
  const digits = t.replace(/[^\d]/g, "");
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
const NON_TECH = /\b(caf[eé]|chemex|grano|molido|tostad|honey|alimento|az[uú]car|panela|bebida)\b/i;

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

// ── Núcleo: filas de celdas → productos ────────────────────────────────────────

/** Recorre cada fila buscando celdas de precio; el nombre es la celda de texto
 *  inmediatamente a la izquierda y la referencia (SKU) la anterior si es un código. */
function productsFromCells(rows: string[][]): ParsedProduct[] {
  const out: ParsedProduct[] = [];
  const seen = new Set<string>();

  for (const cells of rows) {
    for (let i = 0; i < cells.length; i++) {
      if (!looksLikePrice(cells[i])) continue;
      // Si la celda siguiente también parece precio, esta es probablemente un
      // código (no el precio) → la saltamos para no emparejar mal.
      if (i + 1 < cells.length && looksLikePrice(cells[i + 1])) continue;

      const precio = parsePrecio(cells[i]);
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

      out.push({
        nombre,
        marca: inferMarca(nombre),
        categoria: inferCategoria(nombre),
        precio_costo: precio,
        referencia,
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

/**
 * Motor unificado: dado un conjunto de filas (de tabla Word, hoja Excel o CSV en
 * párrafos), si hay una fila de encabezado "Marca … Precio" parsea por COLUMNAS
 * EXPLÍCITAS (respeta marca/categoría y captura specs). Si no, cae a la heurística
 * posicional de siempre (precio + nombre a la izquierda) para proveedores sin encabezado.
 */
function productsFromRows(rows: string[][]): ParsedProduct[] {
  const headerIdx = rows.findIndex(isHeaderRow);
  if (headerIdx === -1) return productsFromCells(rows);

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
    if (!looksLikePrice(precioRaw)) continue;
    const precio = parsePrecio(precioRaw);
    if (precio < 1000) continue;
    if (NON_TECH.test(nombre)) continue;

    const marca = (cells[idxMarca] ?? "").trim() || inferMarca(nombre);
    const catLabel = (cells[idxCat] ?? "").trim();
    const categoria = catLabel ? slugCategoria(catLabel) : inferCategoria(nombre);

    // Specs estructuradas (las trae el .xlsx; el .docx CSV no, van en el nombre).
    const specs: Record<string, string> = {};
    for (const { i, label } of specCols) {
      const v = (cells[i] ?? "").trim();
      if (v && v.toLowerCase() !== "n/a") specs[label] = v;
    }

    const key = nombre.toLowerCase() + "|" + precio;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      nombre, marca, categoria, precio_costo: precio, referencia: "",
      specs: Object.keys(specs).length ? specs : undefined,
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
  return productsFromRows(rows);
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

  const allRows: string[][] = [];
  for (const sf of sheetNames) {
    const sx = await zip.file(sf)!.async("string");
    allRows.push(...rowsFromXlsx(sx, shared));
  }
  return productsFromRows(allRows);
}

// ── Dispatcher por extensión ───────────────────────────────────────────────────

export async function parseSupplierDoc(buffer: Buffer, filename: string): Promise<ParsedProduct[]> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".docx")) return parseDocx(buffer);
  if (lower.endsWith(".xlsx")) return parseXlsx(buffer);
  throw new Error("Formato no soportado. Usa .docx o .xlsx (Word o Excel).");
}
