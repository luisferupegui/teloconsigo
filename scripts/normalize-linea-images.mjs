/**
 * normalize-linea-images.mjs
 *
 * Las imágenes 2K de /public/lineas vienen con DOS problemas:
 *
 *   1. Fondo "checkerboard" (cuadrícula gris/blanca) horneado como píxeles
 *      OPACOS — es la rejilla de transparencia que quedó rasterizada al
 *      exportar. En la card (fondo blanco) se ve como una cuadrícula gris
 *      sucia detrás del producto. → Se elimina con flood-fill desde los
 *      bordes (el producto queda protegido por conectividad).
 *
 *   2. Son 2048–2400 px (6–7 MB) mostradas a ~190 px → downscale ~9× sin
 *      sharpening = bordes suaves. → Se reducen a 600 px lado mayor + unsharp.
 *
 * Pipeline por imagen (fuente = respaldo pristino en /public/lineas-orig):
 *   a. Respaldar el 2K original (solo la 1ª vez).
 *   b. Flood-fill del checkerboard → transparente.
 *   c. Resize a ≤600 px (lanczos3) + unsharp mask.
 *   d. Guardar PNG con alpha (Next lo sirve como WebP optimizado).
 *
 * Idempotente: siempre parte del respaldo pristino.
 * ▸ Si reprocesas, sube ASSET_V en categoria/[slug]/page.tsx para bustear caché.
 */

import sharp from "sharp";
import fs   from "node:fs/promises";
import path from "node:path";

const LINEAS_DIR = path.join(process.cwd(), "public", "lineas");
const BACKUP_DIR = path.join(process.cwd(), "public", "lineas-orig");
const MAX_EDGE   = 600;
const PAD        = 28;   // margen transparente uniforme tras recortar
const SHARPEN    = { sigma: 1, m1: 0.6, m2: 2.2 };

/* ── Quita el checkerboard de fondo por flood-fill desde los bordes.
      Clave: el checker NO se detecta solo por color (un producto BLANCO
      comparte el tono y se "comería"), sino por su ESTRUCTURA de dos tonos:
      un píxel es "checker" solo si tiene un vecino claro-neutro del OTRO
      tono (blanco↔gris) a una distancia de ~1 cuadro. Un producto blanco
      plano no tiene esa variación → se preserva. ── */
function removeCheckerBg(data, w, h) {
  const N = w * h;
  const lum = (idx) => data[idx * 4]; // r ≈ g ≈ b en zonas neutras
  const isLightNeutral = (idx) => {
    const i = idx * 4;
    if (data[i + 3] === 0) return false;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return Math.max(r, g, b) - Math.min(r, g, b) <= 22 && Math.min(r, g, b) >= 150;
  };

  // Máscara "checker-core": claro-neutro CON vecino claro-neutro de otro tono.
  const OFFS = [16, 24, 32]; // cubre cuadros ~16–32 px (2048/2400 px de origen)
  const core = new Uint8Array(N);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!isLightNeutral(idx)) continue;
      const v = lum(idx);
      let twoTone = false;
      for (const o of OFFS) {
        const cand = [];
        if (x - o >= 0) cand.push(idx - o);
        if (x + o < w)  cand.push(idx + o);
        if (y - o >= 0) cand.push(idx - o * w);
        if (y + o < h)  cand.push(idx + o * w);
        for (const n of cand) {
          if (!isLightNeutral(n)) continue;
          const d = Math.abs(v - lum(n));
          if (d >= 25 && d <= 110) { twoTone = true; break; }
        }
        if (twoTone) break;
      }
      if (twoTone) core[idx] = 1;
    }
  }

  // Flood-fill desde los bordes, solo a través de píxeles "checker-core".
  const stack = new Uint32Array(N);
  let sp = 0;
  const canFlood = (idx) => data[idx * 4 + 3] !== 0 && core[idx] === 1;
  const visit = (idx) => { data[idx * 4 + 3] = 0; stack[sp++] = idx; };
  for (let x = 0; x < w; x++) { const t = x, b = (h - 1) * w + x; if (canFlood(t)) visit(t); if (canFlood(b)) visit(b); }
  for (let y = 0; y < h; y++) { const l = y * w, r = y * w + (w - 1); if (canFlood(l)) visit(l); if (canFlood(r)) visit(r); }
  let filled = sp;
  while (sp > 0) {
    const idx = stack[--sp];
    const x = idx % w, y = (idx / w) | 0;
    if (x > 0)     { const n = idx - 1; if (canFlood(n)) { visit(n); filled++; } }
    if (x < w - 1) { const n = idx + 1; if (canFlood(n)) { visit(n); filled++; } }
    if (y > 0)     { const n = idx - w; if (canFlood(n)) { visit(n); filled++; } }
    if (y < h - 1) { const n = idx + w; if (canFlood(n)) { visit(n); filled++; } }
  }

  // Limpieza de fleco: píxeles claro-neutros sueltos pegados a zona ya
  // transparente (restos de borde del checker que no quedaron "core").
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (data[idx * 4 + 3] === 0 || !isLightNeutral(idx)) continue;
        const transNb =
          (x > 0     && data[(idx - 1) * 4 + 3] === 0) ||
          (x < w - 1 && data[(idx + 1) * 4 + 3] === 0) ||
          (y > 0     && data[(idx - w) * 4 + 3] === 0) ||
          (y < h - 1 && data[(idx + w) * 4 + 3] === 0);
        if (transNb) { data[idx * 4 + 3] = 0; filled++; }
      }
    }
  }
  return filled;
}

// Escritura robusta: en Windows libvips/AV a veces lanza EINVAL/EBUSY
// transitorio. Escribimos vía buffer + fs.writeFile con reintentos.
async function writeWithRetry(p, buf, tries = 6) {
  for (let i = 0; i < tries; i++) {
    try { await fs.writeFile(p, buf); return; }
    catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
}

async function* walk(dir, base = dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(abs, base);
    else if (entry.name.toLowerCase().endsWith(".png")) yield path.relative(base, abs);
  }
}

async function processImg(rel) {
  const workPath   = path.join(LINEAS_DIR, rel);
  const backupPath = path.join(BACKUP_DIR, rel);

  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  let sourcePath = workPath;
  try { await fs.access(backupPath); sourcePath = backupPath; }
  catch { await fs.copyFile(workPath, backupPath); }

  const input = await fs.readFile(sourcePath);
  const m = await sharp(input).metadata();

  // a. píxeles crudos RGBA del 2K
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // b. checkerboard → transparente
  const filled = removeCheckerBg(data, info.width, info.height);

  // c. resize + unsharp, manteniendo alpha
  // d. recortar el margen TRANSPARENTE (solo afecta a imágenes de las que se
  //    quitó checkerboard; en fondos blancos opacos no hay nada que recortar).
  let tBuf = data, tw = info.width, th = info.height, trimmed = false;
  try {
    const r = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (r.info.width < info.width || r.info.height < info.height) {
      tBuf = r.data; tw = r.info.width; th = r.info.height; trimmed = true;
    }
  } catch { /* nada que recortar */ }

  // e. reencuadrar: si se recortó, el producto llena el frame con un pequeño
  //    margen uniforme (queda grande y nítido en la card). Si no, resize normal.
  let pipe = sharp(tBuf, { raw: { width: tw, height: th, channels: 4 } });
  if (trimmed) {
    pipe = pipe
      .resize({ width: MAX_EDGE - 2 * PAD, height: MAX_EDGE - 2 * PAD, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
      .sharpen(SHARPEN)
      .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } });
  } else {
    pipe = pipe
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
      .sharpen(SHARPEN);
  }
  const outBuf = await pipe.png({ compressionLevel: 9 }).toBuffer();
  await writeWithRetry(workPath, outBuf);

  const out = await sharp(outBuf).metadata();
  const after = (await fs.stat(workPath)).size;
  return {
    rel,
    orig: `${m.width}×${m.height}`,
    now:  `${out.width}×${out.height}`,
    bg:   `${((filled / (info.width * info.height)) * 100).toFixed(0)}%`,
    kb:   `${Math.round(after / 1024)}KB`,
  };
}

const files = [];
for await (const rel of walk(LINEAS_DIR)) files.push(rel);

console.log(`Procesando ${files.length} imágenes: quitar checkerboard + reducir a ≤${MAX_EDGE}px + unsharp…`);
console.log(`Fuente pristina ← ${BACKUP_DIR}\n`);

let ok = 0, fail = 0;
for (const rel of files.sort()) {
  try {
    const r = await processImg(rel);
    console.log(`  ✓  ${r.rel.padEnd(46)}  ${r.orig}→${r.now}  fondo ${r.bg.padStart(3)}  ${r.kb}`);
    ok++;
  } catch (err) {
    console.error(`  ✗  ${rel}:  ${err.message}`);
    fail++;
  }
}
console.log(`\nListo: ${ok} procesadas, ${fail} fallidas.`);
