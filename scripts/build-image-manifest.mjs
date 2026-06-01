/**
 * build-image-manifest.mjs (solo lectura del catálogo; escribe el manifiesto)
 * Genera IMAGENES-POR-GENERAR.md y .csv con: nombre de archivo destino +
 * prompt fotorrealista por cada referencia EN ALCANCE:
 *   - sin imagen (faltantes)
 *   - imagen compartida por ≥3 referencias (muy repetidas)
 *   - todas las de portátiles (regeneración pedida)
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const text = fs.readFileSync(path.join(root, "src", "lib", "categories.ts"), "utf8");
const lines = text.split("\n");

let curCat = null;
const all = [];
for (const line of lines) {
  const cat = line.match(/^ {4}slug: "([^"]+)",\s*$/);
  if (cat) { curCat = cat[1]; continue; }
  const lin = line.match(/\{\s*marca: "([^"]+)",\s*nombre: "([^"]+)",\s*slug: "([^"]+)"(?:,\s*imagen: `\$\{L\}\/([^`]+)`)?/);
  if (lin && curCat) all.push({ cat: curCat, marca: lin[1], nombre: lin[2], slug: lin[3], img: lin[4] || null });
}

const usage = {};
for (const l of all) if (l.img) (usage[l.img] ??= 0), usage[l.img]++;

const inScope = (l) =>
  !l.img ||                              // faltante
  (l.img && usage[l.img] >= 3) ||        // muy repetida (3-4 refs)
  (l.cat === "portatiles" && l.img);     // regeneración de portátiles

const scope = all.filter(inScope);

/* ── Prompts ───────────────────────────────────────────────────────────── */
const STYLE =
  "single product centered, filling ~85% of the frame, pure white seamless studio background (#FFFFFF), soft even diffused studio lighting, subtle soft contact shadow, ultra-sharp focus, high detail, photorealistic 4k commercial product photography, no added text or watermark overlay, no people, no extra props";

const GAMING = /alienware|omen|legion|rog|predator|nitro|victus|\btuf\b|katana|raider|stealth|cyborg|gaming|odyssey|ultragear|aorus|\bmpg\b|\bmeg\b|gammix|fury|dominator|vengeance|xpg|hero|strix/i;

const TPL = {
  portatiles: (b, n) => `Professional product photography of a ${b} ${n} laptop opened to about 110 degrees, three-quarter front-left view, slim modern chassis, screen showing a clean abstract blue desktop wallpaper`,
  motherboards: (b, n) => `Professional product photography of a ${b} ${n} ATX motherboard, three-quarter top-down view showing VRM heatsinks, PCIe slots, DDR RAM slots, M.2 heatsink covers and the rear I/O panel, intricate detail`,
  "memoria-ram": (b, n) => `Professional product photography of two ${b} ${n} DDR desktop RAM memory modules with an aluminum heat spreader, standing upright at a slight three-quarter angle`,
  "tarjetas-graficas": (b, n) => `Professional product photography of a ${b} ${n} graphics card (GPU) with a triple-fan cooler and metal backplate, three-quarter angle, premium build`,
  "fuentes-de-poder": (b, n) => `Professional product photography of a ${b} ${n} ATX modular power supply unit (PSU), three-quarter angle showing the top fan grille and the front modular cable connector sockets`,
  monitores: (b, n) => `Professional product photography of a ${b} ${n} computer monitor on its stand, three-quarter front view, thin bezels, screen displaying a vivid colorful abstract wallpaper`,
  "equipos-escritorio": (b, n) => `Professional product photography of a ${b} ${n} desktop computer tower, three-quarter front angle, modern design`,
  redes: (b, n) => `Professional product photography of a ${b} ${n} wifi router with external antennas and status LEDs, three-quarter angle`,
  "mouse-pad": (b, n) => `Professional product photography of a ${b} ${n} gaming mouse, three-quarter top view`,
  "kits-streaming": (b, n) => `Professional product photography of ${b} ${n} content-creation gear, three-quarter angle`,
};

// overrides por slug (productos de tipo distinto dentro de una marca)
const OVERRIDE = {
  "elgato-stream-deck": "Professional product photography of an Elgato Stream Deck, a compact desktop control pad with 15 customizable LCD keys, on a small stand, three-quarter angle",
  "elgato-wave": "Professional product photography of an Elgato Wave broadcast condenser USB microphone on a desktop stand, three-quarter angle",
  "elgato-cam-link": "Professional product photography of an Elgato Cam Link 4K HDMI capture USB dongle, three-quarter angle",
};

function promptFor(l) {
  if (OVERRIDE[l.slug]) return `${OVERRIDE[l.slug]}, ${STYLE}`;
  const base = (TPL[l.cat] || ((b, n) => `Professional product photography of a ${b} ${n} product, three-quarter angle`))(l.marca, l.nombre);
  const gaming = GAMING.test(`${l.marca} ${l.nombre}`) ? ", gaming aesthetic with subtle RGB lighting accents" : "";
  return `${base}${gaming}, ${STYLE}`;
}

/* ── Salida ────────────────────────────────────────────────────────────── */
const reason = (l) => (!l.img ? "FALTANTE" : usage[l.img] >= 3 ? `REPETIDA (${usage[l.img]} refs)` : "PORTÁTIL (regen)");

const byCat = {};
for (const l of scope) (byCat[l.cat] ??= []).push(l);

let md = `# Imágenes por generar — teloconsigo.co\n\n`;
md += `Total: **${scope.length} imágenes**. Generadas por ti, integradas por mí.\n\n`;
md += `## Instrucciones\n`;
md += `1. Genera cada imagen como **PNG**, relación **cuadrada o 4:3**.\n`;
md += `2. **Fondo BLANCO puro (#FFFFFF)** — NO uses fondo transparente/checkerboard (eso causó los problemas anteriores). Producto centrado llenando ~85%.\n`;
md += `3. Guarda cada archivo con el **nombre exacto** indicado, dentro de \`public/lineas-nuevas/<categoría>/<archivo>.png\`.\n`;
md += `4. Cuando termines (todas o por lotes), avísame: yo conecto cada una en \`categories.ts\`, corro el pipeline de optimización (recorte/afilado) y subo la versión de caché.\n\n`;
md += `> El **prompt** es un punto de partida en inglés (los generadores rinden mejor así). Ajusta marca/modelo si quieres mayor fidelidad.\n\n`;

let csv = "categoria,archivo_destino,marca,linea,motivo,prompt\n";
for (const [cat, ls] of Object.entries(byCat)) {
  md += `\n## ${cat}  (${ls.length})\n\n`;
  for (const l of ls) {
    const file = `lineas-nuevas/${cat}/${l.slug}.png`;
    const prompt = promptFor(l);
    md += `### \`${l.slug}.png\` — ${l.marca} ${l.nombre}  _(${reason(l)})_\n`;
    md += `${prompt}\n\n`;
    csv += `${cat},"${file}","${l.marca}","${l.nombre}","${reason(l)}","${prompt.replace(/"/g, '""')}"\n`;
  }
}

fs.writeFileSync(path.join(root, "IMAGENES-POR-GENERAR.md"), md);
fs.writeFileSync(path.join(root, "IMAGENES-POR-GENERAR.csv"), csv);

// resumen a consola
const counts = {};
for (const l of scope) counts[reason(l).split(" ")[0]] = (counts[reason(l).split(" ")[0]] || 0) + 1;
console.log(`Manifiesto generado: ${scope.length} imágenes`);
console.log("Por motivo:", counts);
console.log("Por categoría:", Object.fromEntries(Object.entries(byCat).map(([k, v]) => [k, v.length])));
console.log("\nArchivos: IMAGENES-POR-GENERAR.md  +  IMAGENES-POR-GENERAR.csv");
