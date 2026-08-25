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

// ── 0. Re-seed del admin (recuperación de acceso) ─────────────────────────────
// admin-users.json NO se sube al repo (gitignored) ni se copia aquí: en Railway
// el admin se siembra desde ADMIN_USER / ADMIN_PASSWORD, pero SOLO cuando el
// store está vacío. Si el volumen quedó sembrado con otra clave, ya no se vuelve
// a sembrar y se pierde el acceso. Con ADMIN_RESEED=1 borramos el archivo en el
// arranque para que se re-siembre desde las variables en el próximo login.
// ⚠️ Quita ADMIN_RESEED después de recuperar el acceso, o cada deploy borrará los
//    usuarios/contraseñas que gestiones desde /admin/usuarios.
if (process.env.ADMIN_RESEED === "1") {
  const usersFile = path.join(DATA_DIR, "admin-users.json");
  if (fs.existsSync(usersFile)) {
    fs.rmSync(usersFile);
    console.log("[init-volume] ⚠ ADMIN_RESEED=1 → admin-users.json borrado; se re-sembrará desde ADMIN_USER/ADMIN_PASSWORD en el próximo login.");
  } else {
    console.log("[init-volume] ADMIN_RESEED=1 → no había admin-users.json; se sembrará desde ADMIN_USER/ADMIN_PASSWORD en el próximo login.");
  }
}

// Se siembra TODO lo que haya en data-defaults, no una lista escrita a mano.
//
// La lista fija ya falló una vez: al añadir el catálogo de categorías se creó
// data-defaults/categories.json pero nadie lo agregó aquí, y como el volumen de
// Railway monta SOBRE /app/data —tapando lo que trae el repositorio— el archivo no
// llegaba nunca. No rompía nada: loadCategories() devuelve [] cuando falta, así que
// el sitio arrancaba con el navbar, la tienda y el sitemap sin una sola categoría.
// Un fallo silencioso es peor que uno ruidoso, y leer el directorio hace que el
// próximo archivo de datos se siembre solo.
const DATA_FILES = [...new Set([
  ...(fs.existsSync(DATA_DEFAULTS) ? fs.readdirSync(DATA_DEFAULTS).filter((f) => f.endsWith(".json")) : []),
  // Estos deben existir aunque no tengan default: la app los lee al arrancar.
  "products-business.json",
  "products.json",
  "supplier-lists.json",
  "margins.json",
  "supplier-catalog.json",
])];

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
