/**
 * Procesa los 53 logos de /public/brands/v2/ → /public/brands/v2-clean/
 *
 * Algoritmo mejorado:
 *   1) Detecta el color de fondo automáticamente muestreando las 4 esquinas.
 *   2) Marca como transparente todo píxel cercano al color de fondo (tolerancia).
 *   3) Fade suave en el borde de transición (evita halos).
 *   4) Trim de bordes transparentes (cada logo queda ajustado a su contenido).
 */

import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "public", "brands", "v2");
const DST = join(__dirname, "..", "public", "brands", "v2-clean");

await mkdir(DST, { recursive: true });

const files = (await readdir(SRC)).filter((f) => f.endsWith(".png"));
console.log(`Procesando ${files.length} logos…\n`);

// Distancia euclidiana entre dos colores RGB
const colorDist = (r1, g1, b1, r2, g2, b2) =>
  Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);

for (const file of files) {
  const inPath  = join(SRC, file);
  const outPath = join(DST, file);

  const img    = sharp(inPath);
  const meta   = await img.metadata();
  const { width, height } = meta;
  const raw    = await img.ensureAlpha().raw().toBuffer();

  // 1) Detectar colores de fondo: agrupar 4 esquinas en clusters distintos
  //    Algunos archivos tienen DOS zonas (logo arriba + banda gris abajo),
  //    así que muestreamos cada esquina por separado.
  const m = 8;
  const cornerPx = [
    [m, m],                              // top-left
    [width - m - 1, m],                  // top-right
    [m, height - m - 1],                 // bottom-left
    [width - m - 1, height - m - 1],     // bottom-right
  ].map(([x, y]) => {
    const i = (y * width + x) * 4;
    return { r: raw[i], g: raw[i+1], b: raw[i+2] };
  });

  // Agrupar esquinas en clusters por similitud (distancia ≤ 30)
  const bgColors = [];
  cornerPx.forEach((px) => {
    const existing = bgColors.find(c => colorDist(c.r, c.g, c.b, px.r, px.g, px.b) <= 30);
    if (existing) {
      existing.count++;
      existing.r = Math.round((existing.r * (existing.count-1) + px.r) / existing.count);
      existing.g = Math.round((existing.g * (existing.count-1) + px.g) / existing.count);
      existing.b = Math.round((existing.b * (existing.count-1) + px.b) / existing.count);
    } else {
      bgColors.push({ r: px.r, g: px.g, b: px.b, count: 1 });
    }
  });

  // 2) Para cada píxel: comparar con TODOS los clusters de fondo detectados
  //    Si coincide con alguno → transparente
  const HARD = 30;
  const FADE = 55;
  for (let i = 0; i < raw.length; i += 4) {
    const r = raw[i], g = raw[i+1], b = raw[i+2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;

    // (a) Distancia mínima a cualquier color de fondo detectado
    let minDist = Infinity;
    for (const bg of bgColors) {
      const d = colorDist(r, g, b, bg.r, bg.g, bg.b);
      if (d < minDist) minDist = d;
    }

    if (minDist <= HARD) {
      raw[i+3] = 0;
      continue;
    }
    if (minDist <= FADE) {
      const factor = (minDist - HARD) / (FADE - HARD);
      raw[i+3] = Math.round(raw[i+3] * factor);
      continue;
    }

    // (b) Gris pálido genérico fuera de los clusters
    if (max > 180 && sat < 0.08) {
      if (max > 230) {
        raw[i+3] = 0;
      } else {
        const factor = (max - 180) / 50;
        raw[i+3] = Math.round(raw[i+3] * (1 - factor));
      }
    }
  }

  // 3) Smart trim por densidad de filas/columnas.
  //    ROW alto (12%) → ignora píxeles fantasma residuales en arriba/abajo.
  //    COL bajo (3%)  → preserva wordmarks anchos (Sennheiser, NETGEAR, etc.)
  //                     que tienen espacios entre letras.
  const ROW_THRESHOLD = 0.12;
  const COL_THRESHOLD = 0.03;

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
  while (top  < height && rowOpaque[top]  / width  < ROW_THRESHOLD) top++;
  while (bot  > top    && rowOpaque[bot]  / width  < ROW_THRESHOLD) bot--;
  while (left < width  && colOpaque[left] / height < COL_THRESHOLD) left++;
  while (right > left  && colOpaque[right] / height < COL_THRESHOLD) right--;
  const cropW = right - left + 1;
  const cropH = bot - top + 1;

  await sharp(raw, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: cropW, height: cropH })
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const bgStr = bgColors.map(c => `rgb(${c.r},${c.g},${c.b})×${c.count}`).join(", ");
  process.stdout.write(`  ✓ ${file}  bgs=[${bgStr}]\n`);
}

console.log(`\nListo. Archivos limpios en: ${DST}`);
