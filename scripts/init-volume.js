#!/usr/bin/env node
/**
 * scripts/init-volume.js
 *
 * Se ejecuta ANTES de `next start` en Railway (ver railway.toml).
 *
 * Propósito: inicializar los volúmenes persistentes en el PRIMER deploy.
 *   - /app/data           ← catálogo JSON, usuarios, etc.
 *   - /app/public/productos ← imágenes de productos subidas por el admin
 *
 * En despliegues posteriores los archivos ya existen → no hace nada.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// ── 1. Inicializar archivos JSON de datos ─────────────────────────────────────

const DATA_DEFAULTS = path.join(ROOT, "data-defaults");
const DATA_DIR      = path.join(ROOT, "data");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DATA_FILES = [
  "products-business.json",
  "products.json",
  "supplier-lists.json",
  "margins.json",
  "supplier-catalog.json",
];

let copiados = 0;

for (const file of DATA_FILES) {
  const dest = path.join(DATA_DIR, file);
  if (!fs.existsSync(dest)) {
    const src = path.join(DATA_DEFAULTS, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    } else {
      // Fallback: archivo vacío para que la app no rompa
      fs.writeFileSync(dest, file === "products-business.json" ? "[]" : "{}");
    }
    console.log(`[init-volume] ✓ data/${file}`);
    copiados++;
  }
}

// ── 2. Inicializar imágenes de productos ──────────────────────────────────────

const IMG_DEFAULTS = path.join(ROOT, "public", "productos-defaults");
const IMG_DIR      = path.join(ROOT, "public", "productos");

if (fs.existsSync(IMG_DEFAULTS)) {
  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

  for (const ref of fs.readdirSync(IMG_DEFAULTS)) {
    const srcDir  = path.join(IMG_DEFAULTS, ref);
    const destDir = path.join(IMG_DIR, ref);

    if (!fs.statSync(srcDir).isDirectory()) continue;
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    for (const file of fs.readdirSync(srcDir)) {
      const dest = path.join(destDir, file);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(path.join(srcDir, file), dest);
        copiados++;
      }
    }
  }
  if (copiados > 0) {
    console.log(`[init-volume] ✓ imágenes de productos copiadas`);
  }
}

// ── Resumen ───────────────────────────────────────────────────────────────────

if (copiados > 0) {
  console.log(`[init-volume] Volumen inicializado (${copiados} elemento(s)).`);
} else {
  console.log("[init-volume] Datos ya existentes — sin cambios.");
}
