/**
 * scripts/reprocess-images.mjs
 *
 * Re-procesa TODAS las imágenes de producto en /public/productos/ aplicando el
 * MISMO pipeline de fondo blanco puro que el endpoint de subida del admin.
 *
 * ⚠️  Fuente de la verdad del algoritmo: src/lib/image-processor.ts
 *     Si ajustas los parámetros allí, replícalos aquí (no se pueden importar:
 *     ese módulo es "server-only" y este script corre con node plano).
 *
 * Uso:            node scripts/reprocess-images.mjs
 * Uso (dry-run):  node scripts/reprocess-images.mjs --dry
 */

import sharp from "sharp";
import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, "..");
const BASE_DIR  = path.join(ROOT, "public", "productos");
const DRY_RUN   = process.argv.includes("--dry");

const PADDING  = 32;
const OUT_SIZE = 600;
const IMG_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// ── Parámetros del removedor de fondo (espejo de image-processor.ts) ──────────
const NEUTRAL_TOL = 22;
const LIGHT_FLOOR = 202;
const STEP_FLOOR  = 190;
const STEP_TOL    = 22;
const SNAP_WHITE  = 246;

// ── Pipeline (espejo de processProductImage) ──────────────────────────────────
async function processImage(inputPath) {
  const input = readFileSync(inputPath);

  const { data, info } = await sharp(input)
    .rotate()
    .flatten({ background: "#ffffff" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h, channels } = info;
  const N = w * h;
  const removed = new Uint8Array(N);
  const visited = new Uint8Array(N);
  const queue   = new Int32Array(N);
  let head = 0, tail = 0;

  const satOf = (i) => { const r = data[i], g = data[i + 1], b = data[i + 2]; return Math.max(r, g, b) - Math.min(r, g, b); };
  const minOf = (i) => { const r = data[i], g = data[i + 1], b = data[i + 2]; return Math.min(r, g, b); };
  const isNeutral = (i) => satOf(i) <= NEUTRAL_TOL;

  const seed = (p) => {
    const i = p * channels;
    if (!visited[p] && isNeutral(i) && minOf(i) >= LIGHT_FLOOR) { visited[p] = 1; removed[p] = 1; queue[tail++] = p; }
  };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + (w - 1)); }

  while (head < tail) {
    const p = queue[head++];
    const pmin = minOf(p * channels);
    const px = p % w, py = (p / w) | 0;
    const neighbors = [py > 0 ? p - w : -1, py < h - 1 ? p + w : -1, px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1];
    for (const n of neighbors) {
      if (n < 0 || visited[n]) continue;
      const ni = n * channels;
      if (!isNeutral(ni)) continue;
      const nmin = minOf(ni);
      const lightCard = nmin >= LIGHT_FLOOR;
      const softGrad  = nmin >= STEP_FLOOR && Math.abs(nmin - pmin) <= STEP_TOL;
      if (lightCard || softGrad) { visited[n] = 1; removed[n] = 1; queue[tail++] = n; }
    }
  }

  for (let p = 0; p < N; p++) {
    const i = p * channels;
    if (removed[p]) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255; }
    else if (isNeutral(i) && minOf(i) >= SNAP_WHITE) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; }
  }

  const cleaned = await sharp(Buffer.from(data), { raw: { width: w, height: h, channels } })
    .flatten({ background: "#ffffff" }).png().toBuffer();

  let trimmed = cleaned;
  try { trimmed = await sharp(cleaned).trim({ threshold: 18 }).toBuffer(); } catch { /* uniforme */ }

  return sharp(trimmed)
    .flatten({ background: "#ffffff" })
    .resize(OUT_SIZE - PADDING * 2, OUT_SIZE - PADDING * 2, { fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
    .sharpen({ sigma: 0.8, m1: 0.5, m2: 2 })
    .flatten({ background: "#ffffff" })
    .extend({ top: PADDING, bottom: PADDING, left: PADDING, right: PADDING, background: "#ffffff" })
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}

// ── Iteración de carpetas ─────────────────────────────────────────────────────
async function run() {
  if (!existsSync(BASE_DIR)) {
    console.log("⚠️  No existe /public/productos/. Nada que procesar.");
    return;
  }

  const productDirs = readdirSync(BASE_DIR).filter((name) => statSync(path.join(BASE_DIR, name)).isDirectory());
  let processed = 0, errors = 0;

  for (const dir of productDirs) {
    const dirPath = path.join(BASE_DIR, dir);
    const files = readdirSync(dirPath).filter((f) => IMG_EXTS.has(path.extname(f).toLowerCase()));

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const outPath  = path.join(dirPath, path.basename(file, path.extname(file)) + ".png");

      if (DRY_RUN) { console.log(`[dry] ${dir}/${file}`); continue; }

      try {
        const clean = await processImage(filePath);
        writeFileSync(outPath, clean);
        if (path.extname(file).toLowerCase() !== ".png") unlinkSync(filePath); // elimina original no-PNG
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
