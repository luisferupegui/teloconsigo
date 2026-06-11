#!/usr/bin/env node
/**
 * scripts/optimize-static-images.mjs
 *
 * Optimiza EN SITIO (mismo path, mismo formato PNG con transparencia) las
 * imágenes ESTÁTICAS que el sitio sirve crudas o casi crudas, para bajar el peso
 * de página (LCP / Core Web Vitals) y el tamaño del deploy.
 *
 * Solo toca assets servidos por componentes; NO toca:
 *   - public/productos/  (pipeline del admin, ya livianas ~120KB)
 *   - public/lineas/      (ya ~180KB máx)
 *   - heroes              (se entregan optimizados por next/image)
 *
 * Lee a buffer ANTES de escribir para no corromper el archivo (read-then-write).
 * Idempotente: con `withoutEnlargement` no reescala hacia arriba; re-correrlo
 * solo recomprime. Los originales viven en git si se necesita revertir.
 *
 * Uso:  node scripts/optimize-static-images.mjs
 */

import sharp from "sharp";
import { readFileSync, writeFileSync, statSync, readdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");

/** Resuelve un glob simple "dir/*.png" o una lista de archivos a rutas absolutas. */
function resolveFiles(spec) {
  if (Array.isArray(spec)) return spec.map((f) => path.join(ROOT, f));
  const dir = path.join(ROOT, path.dirname(spec));
  const ext = path.extname(spec); // ".png"
  try {
    return readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith(ext))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

// Grupos a optimizar. `maxH`/`maxW` = tope de dimensión (no agranda).
const GROUPS = [
  {
    name: "Logos de marca (marquee del home — unoptimized + eager)",
    spec: "public/brands/v2-clean/*.png",
    resize: { height: 160, withoutEnlargement: true }, // se muestran ≤49px (hover)
    png: { palette: true, quality: 80, effort: 8 },
  },
  {
    name: "Logo del sitio (navbar en todas las páginas + login)",
    spec: ["public/Logo Oscuro Con Slogan.png"],
    resize: { width: 700, withoutEnlargement: true }, // se muestra ≤112px de alto
    png: { palette: true, quality: 92, effort: 8 },
  },
  {
    name: "Carrusel de categorías",
    spec: "public/carousel/*.png",
    resize: { width: 600, withoutEnlargement: true },
    png: { palette: true, quality: 80, effort: 8 },
  },
];

const kb = (n) => Math.round(n / 1024);

let totalBefore = 0;
let totalAfter = 0;
let count = 0;

for (const group of GROUPS) {
  const files = resolveFiles(group.spec);
  if (files.length === 0) {
    console.log(`\n⚠ ${group.name}: 0 archivos (¿ruta cambiada?)`);
    continue;
  }
  let gBefore = 0;
  let gAfter = 0;
  for (const file of files) {
    const before = statSync(file).size;
    const input = readFileSync(file); // a buffer ANTES de escribir
    const out = await sharp(input)
      .resize(group.resize)
      .png(group.png)
      .toBuffer();
    // Si por algún motivo quedara más grande, conservamos el original.
    if (out.length < before) {
      writeFileSync(file, out);
    }
    const after = Math.min(out.length, before);
    gBefore += before;
    gAfter += after;
    count++;
  }
  totalBefore += gBefore;
  totalAfter += gAfter;
  const pct = Math.round((1 - gAfter / gBefore) * 100);
  console.log(
    `\n✓ ${group.name}\n  ${files.length} archivos · ${kb(gBefore)}KB → ${kb(gAfter)}KB  (-${pct}%)`,
  );
}

const pctTotal = Math.round((1 - totalAfter / totalBefore) * 100);
console.log(
  `\n── Total: ${count} imágenes · ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB  (-${pctTotal}%) ──`,
);
