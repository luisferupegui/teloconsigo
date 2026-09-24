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


// ── 1.5 Migraciones del catálogo ──────────────────────────────────────────────
//
// El volumen de Railway monta SOBRE /app/data, así que el catálogo que se edita en el
// repositorio no llega nunca a producción: allí manda el que vive en el volumen y gestiona
// el panel. Eso es lo correcto —el admin es el dueño del catálogo— pero deja un hueco.
// Un cambio de vitrina decidido aquí (sacar seis cards del home y poner las de audio
// profesional, con sus specs y su `bajoPedido`) no tenía forma de viajar, y rehacerlo a
// mano en el panel significa diez productos escritos dos veces.
//
// Copiar el archivo encima tampoco vale: producción tiene productos importados que aquí
// no existen y los perdería.
//
// Así que el cambio viaja como migración: un archivo dice qué productos deben existir y
// qué referencias salen del home, se aplica UNA vez y queda anotado en el volumen. En el
// siguiente deploy no hace nada — si el admin mueve luego esas cards desde el panel, se
// quedan como él las dejó, que para eso es su panel.

const MIGRACIONES_DIR = path.join(DATA_DEFAULTS, "migraciones");
const APLICADAS_FILE  = path.join(DATA_DIR, "migraciones-aplicadas.json");

const leerJson = (p, siFalla) => {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return siFalla; }
};

if (fs.existsSync(MIGRACIONES_DIR)) {
  const aplicadas = new Set(leerJson(APLICADAS_FILE, []));
  const pendientes = fs.readdirSync(MIGRACIONES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort() // el nombre empieza por fecha: se aplican en orden
    .map((f) => leerJson(path.join(MIGRACIONES_DIR, f), null))
    .filter((m) => m && m.id && !aplicadas.has(m.id));

  if (pendientes.length > 0) {
    const catalogoFile = path.join(DATA_DIR, "products-business.json");
    const catalogo = leerJson(catalogoFile, []);
    const refDe = (p) => p.referencia ?? p.slug ?? p.id;
    let tocados = 0;

    for (const m of pendientes) {
      // Primero se libera sitio. Cada sección del home admite 12 cards como máximo, así
      // que si entran las nuevas antes de salir las viejas, las últimas no caben.
      for (const ref of m.quitarDeVitrinas ?? []) {
        const p = catalogo.find((x) => refDe(x) === ref);
        if (p && (p.destacado || p.enAccesorios)) {
          p.destacado = false;
          p.enAccesorios = false;
          tocados++;
        }
      }
      // Un producto que ya existe NO se pisa: puede tener foto, precio corregido o un
      // nombre editado desde el panel, y eso vale más que lo que traiga la migración.
      for (const nuevo of m.productos ?? []) {
        if (catalogo.some((x) => refDe(x) === nuevo.referencia)) continue;
        catalogo.push(nuevo);
        tocados++;
      }
      aplicadas.add(m.id);
      console.log(`[init-volume] ✓ migración ${m.id}${m.descripcion ? ` — ${m.descripcion}` : ""}`);
    }

    if (tocados > 0) fs.writeFileSync(catalogoFile, JSON.stringify(catalogo, null, 2));
    fs.writeFileSync(APLICADAS_FILE, JSON.stringify([...aplicadas], null, 2));
    console.log(`[init-volume] Migraciones: ${pendientes.length} aplicada(s), ${tocados} producto(s) afectado(s).`);
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
