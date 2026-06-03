/**
 * scripts/reprocess-images.mjs
 *
 * Re-procesa todas las imágenes de producto existentes en /public/productos/
 * aplicando el pipeline de fondo blanco limpio.
 *
 * Uso:  node scripts/reprocess-images.mjs
 * Uso (dry-run):  node scripts/reprocess-images.mjs --dry
 */

import sharp from "sharp";
import { readFileSync, writeFileSync, readdirSync, statSync, renameSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, "..");
const BASE_DIR  = path.join(ROOT, "public", "productos");
const DRY_RUN   = process.argv.includes("--dry");

const PADDING   = 48;
const OUT_SIZE  = 800;
const THRESHOLD = 25;
const IMG_EXTS  = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// ── Pipeline de procesamiento ─────────────────────────────────────────────────
async function processImage(inputPath) {
  const input = readFileSync(inputPath);
  const base  = sharp(input).rotate();
  const { width = 800, height = 800 } = await base.metadata();

  const cornerSize = Math.max(4, Math.min(8, Math.floor(Math.min(width, height) * 0.05)));

  const corners = await Promise.all([
    base.clone().extract({ left: 0,                 top: 0,                  width: cornerSize, height: cornerSize }).raw().toBuffer(),
    base.clone().extract({ left: width-cornerSize,  top: 0,                  width: cornerSize, height: cornerSize }).raw().toBuffer(),
    base.clone().extract({ left: 0,                 top: height-cornerSize,  width: cornerSize, height: cornerSize }).raw().toBuffer(),
    base.clone().extract({ left: width-cornerSize,  top: height-cornerSize,  width: cornerSize, height: cornerSize }).raw().toBuffer(),
  ]);

  const avgColor = corners.reduce((acc, buf) => {
    let r = 0, g = 0, b = 0;
    const px = Math.max(1, Math.floor(buf.length / 3));
    for (let i = 0; i < buf.length - 2; i += 3) { r += buf[i]; g += buf[i+1]; b += buf[i+2]; }
    return { r: acc.r + r/px, g: acc.g + g/px, b: acc.b + b/px };
  }, { r: 0, g: 0, b: 0 });

  const bg = {
    r: Math.round(avgColor.r / 4),
    g: Math.round(avgColor.g / 4),
    b: Math.round(avgColor.b / 4),
  };

  // Si el fondo ya es blanco (r,g,b > 240) solo normalizamos con padding
  const isWhite = bg.r > 240 && bg.g > 240 && bg.b > 240;

  return sharp(input)
    .rotate()
    .trim({ background: `rgb(${bg.r},${bg.g},${bg.b})`, threshold: isWhite ? 10 : THRESHOLD })
    .flatten({ background: "#ffffff" })
    .resize(OUT_SIZE - PADDING * 2, OUT_SIZE - PADDING * 2, { fit: "inside", withoutEnlargement: true })
    .extend({ top: PADDING, bottom: PADDING, left: PADDING, right: PADDING, background: "#ffffff" })
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();
}

// ── Iteración de carpetas ─────────────────────────────────────────────────────
async function run() {
  if (!existsSync(BASE_DIR)) {
    console.log("⚠️  No existe /public/productos/. Nada que procesar.");
    return;
  }

  const productDirs = readdirSync(BASE_DIR).filter(
    (name) => statSync(path.join(BASE_DIR, name)).isDirectory()
  );

  let processed = 0, skipped = 0, errors = 0;

  for (const dir of productDirs) {
    const dirPath = path.join(BASE_DIR, dir);
    const files   = readdirSync(dirPath).filter(
      (f) => IMG_EXTS.has(path.extname(f).toLowerCase())
    );

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const outPath  = path.join(dirPath, path.basename(file, path.extname(file)) + ".png");

      if (DRY_RUN) {
        console.log(`[dry] ${dir}/${file}`);
        skipped++;
        continue;
      }

      try {
        const clean = await processImage(filePath);
        // Si el archivo original no es .png, guardamos .png y dejamos el original
        // Si ya es .png, sobreescribimos
        writeFileSync(outPath, clean);

        // Elimina el original si no era PNG (ya guardamos la versión limpia .png)
        if (path.extname(file).toLowerCase() !== ".png") {
          const { unlinkSync } = await import("fs");
          unlinkSync(filePath);
        }

        console.log(`✅  ${dir}/${file} → ${path.basename(outPath)}`);
        processed++;
      } catch (err) {
        console.error(`❌  ${dir}/${file}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\n── Resumen ──────────────────────────────`);
  console.log(`  Procesadas : ${processed}`);
  console.log(`  Errores    : ${errors}`);
  if (DRY_RUN) console.log(`  (Dry-run, no se modificó ningún archivo)`);
}

run().catch(console.error);
