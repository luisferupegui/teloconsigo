#!/usr/bin/env node
/**
 * scripts/init-volume.js
 *
 * Se ejecuta ANTES de `next start` en Railway (ver railway.toml).
 * Propósito: si el volumen persistente montado en /app/data está vacío
 * (primer deploy), copia los archivos JSON por defecto desde data-defaults/.
 *
 * En despliegues posteriores, los archivos ya existen en el volumen
 * y este script no hace nada (preserva los datos del admin panel).
 */

const fs   = require("fs");
const path = require("path");

const ROOT     = path.resolve(__dirname, "..");
const DEFAULTS = path.join(ROOT, "data-defaults");
const DATA     = path.join(ROOT, "data");

const FILES = [
  "products-business.json",
  "products.json",
  "supplier-lists.json",
  "margins.json",
  "supplier-catalog.json",
];

// Asegura que el directorio data/ exista (necesario cuando el volumen es nuevo)
if (!fs.existsSync(DATA)) {
  fs.mkdirSync(DATA, { recursive: true });
}

let copiados = 0;

for (const file of FILES) {
  const dest = path.join(DATA, file);
  const src  = path.join(DEFAULTS, file);

  if (!fs.existsSync(dest)) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`[init-volume] ✓ data/${file}`);
      copiados++;
    } else {
      // Crea un archivo vacío para que la app no rompa
      fs.writeFileSync(dest, file.includes("products-business") ? "[]" : "{}");
      console.log(`[init-volume] ~ data/${file} (vacío, no había default)`);
      copiados++;
    }
  }
}

if (copiados > 0) {
  console.log(`[init-volume] Volumen inicializado con ${copiados} archivo(s).`);
} else {
  console.log("[init-volume] Datos ya existentes — no se copió nada.");
}
