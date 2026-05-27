/**
 * Procesa los 53 logos de /public/brands/v2/ → /public/brands/v2-clean/
 *
 * Cambios v2 (fix de logos cortados):
 *   - ROW/COL_THRESHOLD bajados a 0.005 (cualquier píxel opaco cuenta) para no
 *     cortar tops/bottoms de letras y descenders.
 *   - PAD = 2px de padding tras el trim como margen de seguridad.
 *   - PRE_CROPS: permite recortar el source ANTES del procesado (p.ej. APC
 *     para quedarnos sólo con la insignia y descartar "by Schneider Electric").
 *   - Al final escribe aspect-ratios.json con los ratios reales del output.
 */

import sharp from "sharp";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "public", "brands", "v2");
const DST = join(__dirname, "..", "public", "brands", "v2-clean");

await mkdir(DST, { recursive: true });

// Recortes específicos del source ANTES del procesamiento.
// Valores en fracción [0..1] del ancho/alto original.
const PRE_CROPS = {
  // APC: descartar el banner "by Schneider Electric" del ~40% inferior.
  "43_APC_logo.png": { bottom: 0.42 },
};

// Trim ultra-conservador: cualquier fila/columna con al menos 1 píxel opaco cuenta.
const ROW_THRESHOLD = 0.005;
const COL_THRESHOLD = 0.005;
const PAD = 2;

const colorDist = (r1, g1, b1, r2, g2, b2) =>
  Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);

const files = (await readdir(SRC)).filter((f) => f.endsWith(".png"));
console.log(`Procesando ${files.length} logos…\n`);

const ratios = {};

for (const file of files) {
  const inPath = join(SRC, file);
  const outPath = join(DST, file);

  // 0) Pre-crop opcional sobre el source
  let baseImg = sharp(inPath);
  if (PRE_CROPS[file]) {
    const m = await baseImg.metadata();
    const pc = PRE_CROPS[file];
    const left = Math.round(m.width * (pc.left ?? 0));
    const top = Math.round(m.height * (pc.top ?? 0));
    const w = m.width - left - Math.round(m.width * (pc.right ?? 0));
    const h = m.height - top - Math.round(m.height * (pc.bottom ?? 0));
    const buf = await baseImg.extract({ left, top, width: w, height: h }).png().toBuffer();
    baseImg = sharp(buf);
  }

  const meta = await baseImg.metadata();
  const { width, height } = meta;
  const raw = await baseImg.ensureAlpha().raw().toBuffer();

  // 1) Detectar colores de fondo desde las 4 esquinas
  const m = 8;
  const cornerPx = [
    [m, m],
    [width - m - 1, m],
    [m, height - m - 1],
    [width - m - 1, height - m - 1],
  ].map(([x, y]) => {
    const i = (y * width + x) * 4;
    return { r: raw[i], g: raw[i + 1], b: raw[i + 2], a: raw[i + 3] };
  });

  // Si las esquinas YA son transparentes (alpha < 50) el "fondo" no aplica
  const bgColors = [];
  cornerPx.forEach((px) => {
    if (px.a < 50) return; // ya transparente, no hace falta key
    const existing = bgColors.find((c) => colorDist(c.r, c.g, c.b, px.r, px.g, px.b) <= 30);
    if (existing) {
      existing.count++;
      existing.r = Math.round((existing.r * (existing.count - 1) + px.r) / existing.count);
      existing.g = Math.round((existing.g * (existing.count - 1) + px.g) / existing.count);
      existing.b = Math.round((existing.b * (existing.count - 1) + px.b) / existing.count);
    } else {
      bgColors.push({ r: px.r, g: px.g, b: px.b, count: 1 });
    }
  });

  // 2) Background keying
  const HARD = 30;
  const FADE = 55;
  for (let i = 0; i < raw.length; i += 4) {
    const r = raw[i], g = raw[i + 1], b = raw[i + 2];

    let minDist = Infinity;
    for (const bg of bgColors) {
      const d = colorDist(r, g, b, bg.r, bg.g, bg.b);
      if (d < minDist) minDist = d;
    }

    if (minDist <= HARD) {
      raw[i + 3] = 0;
      continue;
    }
    if (minDist <= FADE) {
      const factor = (minDist - HARD) / (FADE - HARD);
      raw[i + 3] = Math.round(raw[i + 3] * factor);
      continue;
    }

    // Gris pálido residual
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (max > 180 && sat < 0.08) {
      if (max > 230) raw[i + 3] = 0;
      else raw[i + 3] = Math.round(raw[i + 3] * (1 - (max - 180) / 50));
    }
  }

  // 3) Trim CONSERVADOR (cualquier píxel con alpha > 100 cuenta como contenido)
  const rowOpaque = new Array(height).fill(0);
  const colOpaque = new Array(width).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (raw[(y * width + x) * 4 + 3] > 100) {
        rowOpaque[y]++;
        colOpaque[x]++;
      }
    }
  }

  let top = 0, bot = height - 1, left = 0, right = width - 1;
  while (top < height && rowOpaque[top] / width < ROW_THRESHOLD) top++;
  while (bot > top && rowOpaque[bot] / width < ROW_THRESHOLD) bot--;
  while (left < width && colOpaque[left] / height < COL_THRESHOLD) left++;
  while (right > left && colOpaque[right] / height < COL_THRESHOLD) right--;

  // 4) Padding de seguridad
  top = Math.max(0, top - PAD);
  bot = Math.min(height - 1, bot + PAD);
  left = Math.max(0, left - PAD);
  right = Math.min(width - 1, right + PAD);

  const cropW = right - left + 1;
  const cropH = bot - top + 1;

  await sharp(raw, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: cropW, height: cropH })
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  ratios[file] = +(cropW / cropH).toFixed(2);
  const bgStr = bgColors.map((c) => `rgb(${c.r},${c.g},${c.b})`).join("|") || "transparent";
  process.stdout.write(`  ✓ ${file.padEnd(32)} ${cropW}×${cropH} r=${ratios[file].toString().padEnd(5)} bg=${bgStr}\n`);
}

// 5) Export de aspect ratios para pegar en brand-marquee.tsx
await writeFile(
  join(__dirname, "aspect-ratios.json"),
  JSON.stringify(ratios, null, 2),
);

console.log(`\nListo. Output: ${DST}`);
console.log(`Aspect ratios: ${join(__dirname, "aspect-ratios.json")}`);
