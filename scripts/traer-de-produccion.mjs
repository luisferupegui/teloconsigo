#!/usr/bin/env node
/**
 * scripts/traer-de-produccion.mjs
 *
 *   npm run traer
 *
 * Pone el entorno local igual que la web publicada: el catálogo (orden de las vitrinas,
 * nombres, precios, banderas) y las fotos de producto.
 *
 * Existe porque el catálogo NO viaja en el repositorio. El volumen de Railway se monta
 * SOBRE /app/data y /app/public/productos, así que lo que manda en producción es lo que
 * vive en el volumen y gestiona el panel: el orden que se acomoda con las flechas, la
 * ficha que se corrige, la foto que se sube. Nada de eso llega aquí solo, y sin esto el
 * entorno de pruebas se va pareciendo cada vez menos a la tienda de verdad.
 *
 * En la otra dirección viaja por migraciones (data-defaults/migraciones), no copiando el
 * archivo: producción tiene productos que aquí no existen.
 *
 * Qué NO hace:
 *  - No borra productos. Lo que solo existe aquí (un borrador sin publicar, una prueba)
 *    se conserva al final de la lista.
 *  - No sube nada. Las fotos se suben desde el panel de producción, que es donde el
 *    volumen las guarda de verdad.
 */

import fs from "fs";
import path from "path";

const BASE = process.env.PROD_URL ?? "https://teloconsigo-production.up.railway.app";
const CATALOGO = path.join("data", "products-business.json");
const IMAGENES = path.join("public", "productos");
const EXTS = ["png", "webp", "jpg", "jpeg"];

const refDe = (p) => String(p.referencia ?? p.slug ?? p.id ?? "");
const carpeta = (ref) => ref.replace(/[^a-zA-Z0-9._-]/g, "");

// ── 1. Catálogo ──────────────────────────────────────────────────────────────

let publicados;
try {
  const r = await fetch(`${BASE}/api/business-products`);
  if (!r.ok) throw new Error(`respondió ${r.status}`);
  const cuerpo = await r.json();
  publicados = Array.isArray(cuerpo) ? cuerpo : (cuerpo.productos ?? cuerpo.products ?? []);
} catch (err) {
  console.error(`✗ No pude leer el catálogo de ${BASE}: ${err.message}`);
  process.exit(1);
}

if (publicados.length === 0) {
  console.error("✗ Producción devolvió cero productos. No toco nada: sospecha antes que destrozo.");
  process.exit(1);
}

const local = JSON.parse(fs.readFileSync(CATALOGO, "utf8"));
const enProduccion = new Set(publicados.map(refDe));
// `imageUrl` y `url` los calcula el servidor al servir; no son parte del catálogo.
const limpios = publicados.map(({ imageUrl, url, ...resto }) => resto);
const soloLocales = local.filter((p) => !enProduccion.has(refDe(p)));

fs.writeFileSync(CATALOGO, JSON.stringify([...limpios, ...soloLocales], null, 2));
console.log(`catálogo · ${limpios.length} de producción + ${soloLocales.length} que solo existen aquí`);

// ── 2. Fotos ─────────────────────────────────────────────────────────────────
//
// Se prueba la ruta directa por referencia en vez de fiarse del campo `imageUrl` del API:
// se ha visto llegar sin él una foto que la web sí estaba mostrando.

let nuevas = 0, cambiadas = 0, iguales = 0;
const sinFoto = [];

for (const p of publicados) {
  const ref = carpeta(refDe(p));
  if (!ref) continue;
  let tiene = false;

  for (const tipo of ["card", "detalle"]) {
    for (const ext of EXTS) {
      let r;
      try { r = await fetch(`${BASE}/productos/${ref}/${tipo}.${ext}`); } catch { continue; }
      if (!r.ok || !(r.headers.get("content-type") ?? "").startsWith("image/")) continue;

      const buf = Buffer.from(await r.arrayBuffer());
      const destino = path.join(IMAGENES, ref, `${tipo}.${ext}`);
      tiene = true;

      if (fs.existsSync(destino)) {
        if (fs.readFileSync(destino).equals(buf)) { iguales++; break; }
        fs.writeFileSync(destino, buf);
        cambiadas++;
        console.log(`  ↻ ${ref}/${tipo}.${ext}`);
        break;
      }
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, buf);
      nuevas++;
      console.log(`  + ${ref}/${tipo}.${ext}`);
      break;
    }
  }

  if (!tiene && (p.destacado || p.enAccesorios)) sinFoto.push(`${ref} · ${(p.nombre ?? "").slice(0, 44)}`);
}

console.log(`fotos · ${nuevas} nuevas, ${cambiadas} actualizadas, ${iguales} ya iguales`);

if (sinFoto.length > 0) {
  console.log(`\nCards del home que siguen sin foto EN PRODUCCIÓN (${sinFoto.length}) — se ven con el recuadro de color:`);
  for (const s of sinFoto) console.log(`  · ${s}`);
}
