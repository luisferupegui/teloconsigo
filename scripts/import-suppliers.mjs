/**
 * import-suppliers.mjs
 *
 * Lee listas de precios de proveedores (PDF local o URL) y extrae
 * productos corporativos mapeados al esquema de teloconsigo.co.
 *
 * Uso:
 *   node scripts/import-suppliers.mjs ledacom   <ruta-local.pdf>
 *   node scripts/import-suppliers.mjs infoshop  <url-o-ruta.pdf>
 *   node scripts/import-suppliers.mjs merge     (combina todos los suppliers)
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { createWriteStream } from "fs";
import path from "path";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SUPPLIERS_DIR = path.join(ROOT, "data", "suppliers");
const DATA_DIR = path.join(ROOT, "data");

if (!existsSync(SUPPLIERS_DIR)) mkdirSync(SUPPLIERS_DIR, { recursive: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parsePrecio(str) {
  if (!str) return null;
  const clean = str.replace(/[$.]/g, "").replace(",", ".").trim();
  const n = parseFloat(clean);
  return isNaN(n) ? null : Math.round(n);
}

async function downloadPdf(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    const tmpPath = path.join(SUPPLIERS_DIR, "_tmp_download.pdf");
    const file = createWriteStream(tmpPath);
    proto.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        downloadPdf(res.headers.location).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(tmpPath); });
    }).on("error", reject);
  });
}

async function extractText(filePath) {
  const buf = readFileSync(filePath);
  const data = await pdfParse(buf);
  return data.text;
}

// ─── Parser Ledacom ───────────────────────────────────────────────────────────
// Detecta bloques de portátiles, PCs, monitores, tablets y licencias

function parseLedacom(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const products = [];

  // Categorías que nos interesan (según modelo de negocio)
  const SECTIONS = {
    portatil: /portátiles|portátil corporativo|equipos corporativos/i,
    pc: /equipos sff|equipos mff|all.in.one|ensamblados|escritorio/i,
    monitor: /monitores/i,
    tablet: /tablets/i,
    licencia: /licenciamiento|windows|office|kaspersky|eset/i,
  };

  // Precios con formato $X.XXX.XXX o $X,XXX,XXX
  const PRICE_RE = /\$\s?([\d.,]+)/g;
  const REF_RE = /Referencia[:\s]+(\S+)/i;

  let currentCategory = null;
  let buffer = [];

  const flushBuffer = () => {
    if (buffer.length < 2) { buffer = []; return; }
    const block = buffer.join(" ");
    const prices = [...block.matchAll(PRICE_RE)].map((m) => parsePrecio(m[1])).filter(Boolean);
    if (prices.length === 0) { buffer = []; return; }

    const refMatch = block.match(REF_RE);
    const ref = refMatch ? refMatch[1] : null;

    // Detectar marca
    let marca = "Genérico";
    for (const m of ["Lenovo", "Dell", "HP", "Asus", "Acer", "Samsung", "Epson", "Dahua", "AOC", "Microsoft", "Kaspersky", "ESET"]) {
      if (block.includes(m)) { marca = m; break; }
    }

    // Nombre: primera línea del buffer que no sea precio ni "Referencia"
    const nombre = buffer.find((l) => !l.match(/^\$/) && !l.match(/^Ref/i) && l.length > 5) || buffer[0];

    const precio = prices[prices.length - 1]; // último precio = precio real

    products.push({
      id: ref || slugify(nombre).slice(0, 30),
      slug: slugify(nombre),
      nombre,
      marca,
      categoria: currentCategory || "otros",
      referencia: ref,
      precio,
      precioDesde: precio, // usado para mostrar "Desde $X"
      proveedor: "ledacom",
      specs: extractSpecs(block),
      rawBlock: block.slice(0, 400),
    });

    buffer = [];
  };

  for (const line of lines) {
    // Detectar cambio de sección
    for (const [cat, re] of Object.entries(SECTIONS)) {
      if (re.test(line)) { flushBuffer(); currentCategory = cat; break; }
    }

    // Nueva entrada de producto: línea de Referencia marca nuevo bloque
    if (/^Referencia[:\s]/i.test(line)) {
      flushBuffer();
    }

    buffer.push(line);
  }
  flushBuffer();

  return products.filter((p) => p.precio && p.precio > 100_000);
}

function extractSpecs(block) {
  const specs = {};
  const matchers = [
    [/Procesador[:\s]+(.+?)(?=Ram|Almacenamiento|Pantalla|S\.O|$)/i, "procesador"],
    [/Ram[:\s]+(.+?)(?=Almacenamiento|Pantalla|S\.O|$)/i, "ram"],
    [/Almacenamiento[:\s]+(.+?)(?=Pantalla|S\.O|$)/i, "almacenamiento"],
    [/Pantalla[:\s]+(.+?)(?=S\.O|Conectividad|$)/i, "pantalla"],
    [/S\.O[:\s]+(.+?)(?=Garantía|$)/i, "so"],
    [/Garantía[:\s]+(.+?)(?=\n|$)/i, "garantia"],
  ];
  for (const [re, key] of matchers) {
    const m = block.match(re);
    if (m) specs[key] = m[1].trim().slice(0, 80);
  }
  return specs;
}

// ─── Parser Infoshop ──────────────────────────────────────────────────────────
// Infoshopcorp tiene un formato similar a Ledacom

function parseInfoshop(text) {
  // Reutiliza la misma lógica base, ajustada para el formato Infoshop
  return parseLedacom(text); // El parser genérico funciona para ambos
}

// ─── Mapeo a categorías de negocio ────────────────────────────────────────────

const USE_CASE_MAP = {
  // portátiles → subcategorías por uso
  portatil: (p) => {
    const n = (p.nombre + " " + (p.specs?.procesador || "")).toLowerCase();
    if (/thinkpad|expertbook|pro|inspiron.*pro|elitebook/i.test(n)) return "portatil-ejecutivo";
    if (/gaming|tuf|rtx|gtx|legion|victus/i.test(n)) return "portatil-gaming";
    return "portatil-oficina";
  },
  pc: () => "pc-empresarial",
  monitor: () => "monitor",
  tablet: () => "tablet-empresarial",
  licencia: () => "licencia",
  otros: () => null,
};

function mapToBusinessCatalog(products) {
  return products
    .map((p) => {
      const mapper = USE_CASE_MAP[p.categoria] || (() => null);
      const usoCaso = mapper(p);
      if (!usoCaso) return null;
      return { ...p, usoCaso };
    })
    .filter(Boolean);
}

// ─── Merge final ──────────────────────────────────────────────────────────────

function mergeAllSuppliers() {
  const sources = [
    path.join(SUPPLIERS_DIR, "ledacom-raw.json"),
    path.join(SUPPLIERS_DIR, "infoshop-raw.json"),
  ];

  let all = [];
  for (const src of sources) {
    if (existsSync(src)) {
      const items = JSON.parse(readFileSync(src, "utf-8"));
      all = all.concat(items);
    }
  }

  const business = mapToBusinessCatalog(all);

  // Deduplica por referencia
  const seen = new Set();
  const deduped = business.filter((p) => {
    const key = p.referencia || p.slug;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const outPath = path.join(DATA_DIR, "products-business.json");
  writeFileSync(outPath, JSON.stringify(deduped, null, 2), "utf-8");
  console.log(`✓ Merged ${deduped.length} business products → ${outPath}`);
  return deduped;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const [,, command, source] = process.argv;

async function run() {
  if (command === "merge") {
    mergeAllSuppliers();
    return;
  }

  if (!source) {
    console.error("Uso: node scripts/import-suppliers.mjs <ledacom|infoshop|merge> [ruta-o-url]");
    process.exit(1);
  }

  let filePath = source;

  if (source.startsWith("http://") || source.startsWith("https://")) {
    console.log(`⬇ Descargando PDF desde ${source}…`);
    filePath = await downloadPdf(source);
    console.log(`   Guardado en ${filePath}`);
  } else if (!existsSync(source)) {
    console.error(`Error: no se encuentra el archivo ${source}`);
    process.exit(1);
  }

  console.log(`📄 Extrayendo texto del PDF…`);
  const text = await extractText(filePath);

  let products;
  if (command === "ledacom") {
    console.log(`🔍 Parseando formato Ledacom…`);
    products = parseLedacom(text);
  } else if (command === "infoshop") {
    console.log(`🔍 Parseando formato Infoshop…`);
    products = parseInfoshop(text);
  } else {
    console.error("Comando no reconocido. Usa: ledacom | infoshop | merge");
    process.exit(1);
  }

  const outFile = path.join(SUPPLIERS_DIR, `${command}-raw.json`);
  writeFileSync(outFile, JSON.stringify(products, null, 2), "utf-8");
  console.log(`✓ ${products.length} productos extraídos → ${outFile}`);

  // Auto-merge
  mergeAllSuppliers();
}

run().catch((err) => { console.error(err); process.exit(1); });
