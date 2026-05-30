/**
 * Elimina fondos grises/cuadriculados embebidos en PNGs de líneas de producto.
 * Convierte píxeles grises (R≈G≈B, valor >150) en blanco puro.
 * Ejecutar: node scripts/fix-grey-backgrounds.mjs
 */
import sharp from "sharp";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..", "public", "lineas");

async function collectPngs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...await collectPngs(full));
    else if (e.name.toLowerCase().endsWith(".png")) files.push(full);
  }
  return files;
}

async function fixGreyBackground(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()          // garantiza canal alpha
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info; // channels = 4 (RGBA)
  let modified = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];

    // Píxel transparente → blanco opaco
    if (a < 30) {
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
      modified++;
      continue;
    }

    // Píxel gris (R≈G≈B, claro) → blanco
    // Tolerancia: canales dentro de ±18 entre sí, todos > 155
    const minC = Math.min(r, g, b);
    const maxC = Math.max(r, g, b);
    if (minC > 155 && (maxC - minC) < 18) {
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
      modified++;
    }
  }

  if (modified === 0) return { file: filePath.split("lineas")[1], modified: 0 };

  await sharp(data, { raw: { width, height, channels } })
    .png({ quality: 95, compressionLevel: 6 })
    .toFile(filePath + ".tmp");

  // Renombrar: reemplazar original
  const { rename } = await import("fs/promises");
  await rename(filePath + ".tmp", filePath);

  return { file: filePath.split("lineas")[1], modified };
}

async function main() {
  const pngs = await collectPngs(ROOT);
  console.log(`\nProcesando ${pngs.length} imágenes…\n`);

  let totalFixed = 0;
  for (const png of pngs) {
    const { file, modified } = await fixGreyBackground(png);
    if (modified > 0) {
      console.log(`  ✓  ${file}  (${modified.toLocaleString()} px corregidos)`);
      totalFixed++;
    }
  }
  console.log(`\n✅ Listo. ${totalFixed} imágenes modificadas de ${pngs.length} totales.\n`);
}

main().catch(console.error);
