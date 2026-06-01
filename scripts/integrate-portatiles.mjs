/**
 * Integra los 35 portátiles (23 reemplazos + 12 nuevos): recorta, afila,
 * fondo blanco, guarda en public/lineas/portatiles/<slug>.png, respalda el
 * original y conecta `imagen` en categories.ts para los que faltaban.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = "C:/Users/AVIDEMO/Desktop/teloconsigo.co/Fotos Nuevas/Portátiles";
const root = process.cwd();
const DEST = path.join(root, "public", "lineas", "portatiles");
const ORIG = path.join(root, "public", "lineas-orig", "portatiles");
fs.mkdirSync(DEST, { recursive: true });
fs.mkdirSync(ORIG, { recursive: true });

const PAD = 28, EDGE = 600;
const map = [
  ["Lenovo_IdeaP-1780345507974.png", "lenovo-ideapad"],
  ["Lenovo_Think-1780345460356.png", "lenovo-thinkpad"],
  ["Lenovo_Legio-1780345665657.png", "lenovo-legion"],
  ["Lenovo_Yoga_-1780345536687.png", "lenovo-yoga"],
  ["Lenovo_LOQ_g-1780345522352.png", "lenovo-loq"],
  ["ASUS_VivoBo-1780345672333.png", "asus-vivobook"],
  ["ASUS_ZenBoo-1780345394379.png", "asus-zenbook"],
  ["ASUS_TUF_Ga-1780345515001.png", "asus-tuf-gaming"],
  ["ASUS_ROG_St-1780345500440.png", "asus-rog-strix"],
  ["ASUS_Expert-1780345529860.png", "asus-expertbook"],
  ["HP_laptop_o-1780345385913.png", "hp-essential"],
  ["HP_laptop_o-1780345436930.png", "hp-pavilion"],
  ["HP_Victus_g-1780345703933.png", "hp-victus"],
  ["HP_OMEN_gam-1780344907060.png", "hp-omen"],
  ["HP_laptop_o-1780345402734.png", "hp-probook"],
  ["HP_EliteBoo-1780345416667.png", "hp-elitebook"],
  ["Acer_Aspire-1780345427018.png", "acer-aspire"],
  ["Acer_Nitro_-1780345490934.png", "acer-nitro"],
  ["Acer_Predat-1780344936402.png", "acer-predator"],
  ["Acer_Swift_-1780345700290.png", "acer-swift"],
  ["Acer_Travel-1780345607642.png", "acer-travelmate"],
  ["MSI_Modern_-1780344629461.png", "msi-modern"],
  ["MSI_Katana_-1780344925624.png", "msi-katana"],
  ["MSI_Cyborg_-1780344945711.png", "msi-cyborg"],
  ["MSI_Stealth-1780345254317.png", "msi-stealth"],
  ["MSI_Raider_-1780345261639.png", "msi-raider"],
  ["Dell_Inspiro-1780345245871.png", "dell-inspiron"],
  ["Dell_Latitud-1780345269430.png", "dell-latitude"],
  ["Dell_Vostro_-1780344957450.png", "dell-vostro"],
  ["Dell_XPS_pre-1780344976965.png", "dell-xps"],
  ["Dell_Alienwa-1780345299396.png", "dell-alienware"],
  ["Dell_Precisi-1780345280319.png", "dell-precision"],
  ["Microsoft_Su-1780345349699.png", "surface-laptop"],
  ["Microsoft_Su-1780345288175.png", "surface-pro"],
  ["Microsoft_Su-1780345309006.png", "surface-studio"],
];

let ok = 0, miss = 0;
for (const [src, slug] of map) {
  const s = path.join(SRC, src);
  if (!fs.existsSync(s)) { console.error(`✗ falta ${src}`); miss++; continue; }
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
console.log(`Imágenes procesadas: ${ok}/${map.length}` + (miss ? ` (faltaron ${miss})` : ""));

// ── Conectar `imagen` en categories.ts para los que faltaban ──
const catsPath = path.join(root, "src", "lib", "categories.ts");
let cats = fs.readFileSync(catsPath, "utf8");
let wired = 0;
for (const [, slug] of map) {
  if (cats.includes(`/portatiles/${slug}.png`)) continue;        // ya conectado (existentes)
  const needle = `slug: "${slug}" },`;                            // formato de los faltantes (sin imagen)
  if (!cats.includes(needle)) { console.error(`✗ sin needle: ${slug}`); continue; }
  cats = cats.replace(needle, `slug: "${slug}", imagen: \`$\{L}/portatiles/${slug}.png\` },`);
  wired++;
}
fs.writeFileSync(catsPath, cats);
console.log(`Conectadas nuevas en categories.ts: ${wired}`);
