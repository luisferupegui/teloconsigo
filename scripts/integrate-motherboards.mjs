/**
 * Integra las motherboards nuevas: recorta el margen de fondo (la board llena
 * el frame), afila, deja fondo blanco, guarda en public/lineas/motherboards/
 * con el slug correcto, y respalda el original pristino en lineas-orig/.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = "C:/Users/AVIDEMO/Desktop/teloconsigo.co/Fotos Nuevas/Motherboards";
const root = process.cwd();
const DEST = path.join(root, "public", "lineas", "motherboards");
const ORIG = path.join(root, "public", "lineas-orig", "motherboards");
fs.mkdirSync(DEST, { recursive: true });
fs.mkdirSync(ORIG, { recursive: true });

const PAD = 28, EDGE = 600;
const map = [
  ["ASUS_Prime_-1780236355684.png", "asus-prime"],
  ["ASUS_TUF_Ga-1780236431580.png", "asus-tuf-gaming-board"],
  ["ASUS_ProArt-1780236400670.png", "asus-proart"],
  ["MSI_PRO_Ser-1780236410571.png", "msi-pro-series"],
  ["MSI_MPG_ATX-1780236391256.png", "msi-mpg"],
  ["MSI_MEG_ATX-1780236425385.png", "msi-meg"],
  ["GIGABYTE_Ult-1780236489034.png", "gigabyte-ultra-durable"],
  ["GIGABYTE_Gam-1780236500704.png", "gigabyte-gaming-x"],
  ["ASRock_Stee-1780236507032.png", "asrock-steel-legend"],
  ["ASRock_Taic-1780236512488.png", "asrock-taichi"],
];

for (const [src, slug] of map) {
  const s = path.join(SRC, src);
  if (!fs.existsSync(s)) { console.error(`✗ falta ${src}`); continue; }
  fs.copyFileSync(s, path.join(ORIG, slug + ".png"));      // respaldo pristino
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
  const m = await sharp(out).metadata();
  console.log(`✓ ${slug.padEnd(24)} ${m.width}x${m.height}  ${Math.round(out.length / 1024)}KB`);
}
console.log("\nListo. Recuerda conectar en categories.ts + subir ASSET_V.");
