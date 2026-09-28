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
      // RENOMBRAR LA REFERENCIA, con su foto detrás. VA PRIMERO: todos los pasos de abajo
      // buscan el producto POR su referencia, así que la identidad tiene que estar bien
      // antes de tocar nada más — y así la misma migración que renombra puede corregir el
      // producto llamándolo ya por su nombre nuevo.
      //
      // Una card publicada clonando otra se queda con la referencia de la original, y esa
      // referencia se le enseña al cliente ("Ref. ATH-M50X" en un dron), nombra la carpeta
      // de su foto y es como se le pide el producto al equipo. Cambiarla en el catálogo y
      // dejar la foto donde estaba deja la card sin imagen, así que las dos cosas van
      // juntas y aquí, que es el único sitio que toca el volumen de producción.
      //
      // NO se renombra si la referencia nueva ya existe: serían dos productos con la misma
      // identidad, y a partir de ahí cualquiera de los dos puede ganar un pedido.
      for (const cambio of m.renombrarReferencia ?? []) {
        const { de, a } = cambio;
        if (!de || !a || de === a) continue;
        const p = catalogo.find((x) => refDe(x) === de);
        if (!p) continue;
        if (catalogo.some((x) => refDe(x) === a)) {
          console.warn(`[init-volume] ⚠ no renombro ${de} → ${a}: esa referencia ya existe`);
          continue;
        }
        p.referencia = a;
        if (p.id === de) p.id = a;
        // El slug es la URL del producto. Si venía del producto clonado, lleva su nombre
        // ("/producto/audifonos-...-ath-m50x" para un dron) y hay que rehacerlo.
        if (cambio.slug) p.slug = cambio.slug;

        // La carpeta de imágenes se nombra aquí y no con la constante de más abajo:
        // `const` no se puede usar antes de su línea, y este bloque va primero.
        const fotos = path.join(ROOT, "public", "productos");
        const viejo = path.join(fotos, de);
        const nuevo = path.join(fotos, a);
        try {
          if (fs.existsSync(viejo) && !fs.existsSync(nuevo)) {
            fs.renameSync(viejo, nuevo);
            console.log(`[init-volume]   foto ${de} → ${a}`);
          }
        } catch (err) {
          // La foto se puede volver a subir desde el panel; el catálogo no se deja a medias
          // por eso. Se avisa y se sigue.
          console.warn(`[init-volume] ⚠ no pude mover la foto de ${de}: ${err.message}`);
        }
        tocados++;
      }

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

      // CORREGIR un producto que YA está allá. Es la excepción a la regla de arriba, y se
      // usa para arreglar un dato que está mal a la vista del cliente.
      //
      // Hizo falta con el ASUS TUF: se publicó reutilizando la ficha de un ExpertBook, y la
      // card anunciaba "AMD Ryzen" y una pantalla de 14" en un portátil que es Intel Core 5
      // de 16". Las specs no se podían tocar desde el panel —ya sí— y el catálogo del
      // repositorio no llega a producción, así que no había por dónde.
      //
      // Se tocan SOLO los campos que la migración nombra, no el producto entero: el precio,
      // las banderas y el orden que el admin haya puesto se quedan como están. Y se aplica
      // una vez, como todo aquí: si mañana él edita esa ficha, manda la suya.
      for (const arreglo of m.corregir ?? []) {
        const p = catalogo.find((x) => refDe(x) === arreglo.referencia);
        if (!p) continue;
        // Las claves que empiezan por guion bajo son notas para quien lea la migracion
        // —por qué se corrige esto—, no campos del producto: no viajan al catalogo.
        const { referencia, specs, specsReemplazar, ...campos } = arreglo;
        // Las notas se quitan TAMBIÉN de dentro de las specs. Antes solo se limpiaban los
        // campos de primer nivel, así que una nota escrita dentro de `specs` —el sitio
        // natural para explicar por qué se corrige una spec— se habría publicado en la
        // ficha, como una característica más del producto.
        const sinNotas = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith("_")));
        for (const k of Object.keys(campos)) if (k.startsWith("_")) delete campos[k];
        Object.assign(p, campos);
        // `specs` MEZCLA (corrige un dato y deja el resto); `specsReemplazar` SUSTITUYE la
        // ficha entera. Hizo falta porque mezclar no puede BORRAR: la card del dron DJI se
        // publicó reutilizando la ficha de unos audífonos y arrastraba "Cerrados over-ear",
        // "drivers 45 mm" y "Tres cables desmontables" — specs de audífonos en un dron, a
        // la vista del cliente. No hay valor de dron que ponerle a "drivers"; esas claves
        // sobran, no están mal.
        if (specsReemplazar) p.specs = sinNotas(specsReemplazar);
        else if (specs) p.specs = { ...p.specs, ...sinNotas(specs) };
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
