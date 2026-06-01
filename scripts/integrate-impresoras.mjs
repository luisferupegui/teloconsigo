/**
 * Integra las 20 impresoras: recorta margen, afila, fondo blanco, guarda en
 * public/lineas/impresoras/<slug>.png, respalda el original, conecta cada
 * `imagen` en categories.ts y borra las 5 imágenes viejas huérfanas.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = "C:/Users/AVIDEMO/Desktop/teloconsigo.co/Fotos Nuevas/Impresoras";
const root = process.cwd();
const DEST = path.join(root, "public", "lineas", "impresoras");
const ORIG = path.join(root, "public", "lineas-orig", "impresoras");
fs.mkdirSync(DEST, { recursive: true });
fs.mkdirSync(ORIG, { recursive: true });

const PAD = 28, EDGE = 600;
const map = [
  // Láser
  ["HP_LaserJet-1780239794421.png", "hp-laserjet-pro"],
  ["HP_LaserJet-1780239743933.png", "hp-laserjet-pro-mfp"],
  ["Brother_HL-L-1780239780856.png", "brother-hl-l"],
  ["Brother_MFC--1780239761294.png", "brother-mfc-l"],
  ["Canon_imageC-1780239770612.png", "canon-imageclass-lbp"],
  ["Canon_imageC-1780239752892.png", "canon-imageclass-mf"],
  ["Kyocera_ECOS-1780239906057.png", "kyocera-ecosys-pa"],
  ["Kyocera_ECOS-1780239843685.png", "kyocera-ecosys-ma"],
  ["Kyocera_ECOS-1780239878972.png", "kyocera-ecosys-color"],
  ["Kyocera_TASK-1780239872469.png", "kyocera-taskalfa"],
  // Inyección de tinta
  ["HP_DeskJet_-1780239899557.png", "hp-deskjet"],
  ["HP_Smart_Ta-1780239861453.png", "hp-smart-tank"],
  ["Brother_MFC--1780240217578.png", "brother-mfc-j"],
  ["Brother_DCP--1780240211529.png", "brother-dcp-t"],
  ["Canon_PIXMA_-1780240546518.png", "canon-pixma"],
  ["Canon_PIXMA_-1780240201794.png", "canon-pixma-g"],
  ["Epson_EcoTa-1780239920156.png", "epson-ecotank-l3000"],
  ["Epson_EcoTa-1780240192012.png", "epson-ecotank-l5000"],
  ["Epson_WorkF-1780240239528.png", "epson-workforce-pro"],
  ["Epson_Expre-1780240232985.png", "epson-expression"],
];

let ok = 0;
for (const [src, slug] of map) {
  const s = path.join(SRC, src);
  if (!fs.existsSync(s)) { console.error(`✗ falta ${src}`); continue; }
  fs.copyFileSync(s, path.join(ORIG, slug + ".png"));
  let buf = fs.readFileSync(s);
  try { buf = await sharp(buf).trim({ threshold: 12 }).toBuffer(); } catch { /* nada que recortar */ }
  const out = await sharp(buf)
    .resize({ width: EDGE - 2 * PAD, height: EDGE - 2 * PAD, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
    .sharpen({ sigma: 1, m1: 0.6, m2: 2.2 })
    .flatten({ background: "#ffffff" })
    .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(DEST, slug + ".png"), out);
  ok++;
}
console.log(`Imágenes procesadas: ${ok}/${map.length}`);

// ── Conectar `imagen` en categories.ts ──
const catsPath = path.join(root, "src", "lib", "categories.ts");
let cats = fs.readFileSync(catsPath, "utf8");
let wired = 0;
for (const [, slug] of map) {
  if (cats.includes(`/impresoras/${slug}.png`)) continue; // ya conectado
  const needle = `slug: "${slug}",`;
  if (!cats.includes(needle)) { console.error(`✗ sin needle: ${slug}`); continue; }
  const ins = needle + " imagen: `${L}/impresoras/" + slug + ".png`,";
  cats = cats.replace(needle, ins);
  wired++;
}
fs.writeFileSync(catsPath, cats);
console.log(`Conectadas en categories.ts: ${wired}`);

// ── Borrar imágenes viejas huérfanas ──
const orphans = ["epson-ecotank.png", "epson-workforce.png", "canon-maxify.png", "brother.png", "kyocera.png"];
let del = 0;
for (const f of orphans) {
  for (const base of [DEST, ORIG]) {
    const p = path.join(base, f);
    if (fs.existsSync(p)) { fs.rmSync(p); del++; }
  }
}
console.log(`Huérfanas borradas: ${del}`);
