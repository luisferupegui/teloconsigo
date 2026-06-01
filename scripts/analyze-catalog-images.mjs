/**
 * analyze-catalog-images.mjs (solo lectura, no modifica nada)
 * Reporta: imágenes repetidas (varias líneas → mismo archivo), líneas sin
 * imagen, y rutas cuyo archivo no existe en disco.
 */
import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "src", "lib", "categories.ts");
const text = fs.readFileSync(file, "utf8");
const lines = text.split("\n");

let curCat = null;
const cats = [];
const byCat = {};
for (const line of lines) {
  const cat = line.match(/^ {4}slug: "([^"]+)",\s*$/);              // slug de categoría (línea propia)
  if (cat) { curCat = cat[1]; cats.push(curCat); byCat[curCat] = []; continue; }
  const lin = line.match(/\{\s*marca: "([^"]+)",\s*nombre: "([^"]+)",\s*slug: "([^"]+)"(?:,\s*imagen: `\$\{L\}\/([^`]+)`)?/);
  if (lin && curCat) byCat[curCat].push({ marca: lin[1], nombre: lin[2], slug: lin[3], img: lin[4] || null });
}

const all = cats.flatMap((c) => byCat[c].map((l) => ({ ...l, cat: c })));
const withImg = all.filter((l) => l.img);
const missing = all.filter((l) => !l.img);

// duplicados: archivo usado por >1 línea
const usage = {};
for (const l of withImg) (usage[l.img] ??= []).push(l);
const dups = Object.entries(usage).filter(([, ls]) => ls.length > 1);

// archivos en disco que no existen
const broken = [...new Set(withImg.map((l) => l.img))].filter(
  (img) => !fs.existsSync(path.join(process.cwd(), "public", "lineas", img)),
);

console.log(`RESUMEN: ${cats.length} categorías · ${all.length} líneas · ${withImg.length} con imagen · ${missing.length} SIN imagen · ${new Set(withImg.map((l) => l.img)).size} archivos únicos\n`);

console.log(`══ IMÁGENES REPETIDAS (${dups.length} archivos compartidos por varias referencias) ══`);
for (const [img, ls] of dups.sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${img}  ←  ${ls.length} refs: ${ls.map((l) => `${l.marca} ${l.nombre}`).join(" | ")}`);
}

console.log(`\n══ LÍNEAS SIN IMAGEN (${missing.length}) ══`);
const mByCat = {};
for (const l of missing) (mByCat[l.cat] ??= []).push(`${l.marca} ${l.nombre}`);
for (const [c, ls] of Object.entries(mByCat)) console.log(`  [${c}] ${ls.join(" | ")}`);

console.log(`\n══ RUTAS ROTAS (archivo no existe en disco) (${broken.length}) ══`);
for (const b of broken) console.log(`  ${b}`);
