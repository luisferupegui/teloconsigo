/**
 * Reprocesa motherboards/impresoras/portatiles desde los pristinos
 * (public/lineas-orig) BLANQUEANDO el fondo gris-claro a blanco puro antes de
 * recortar. Corrige el "recuadro gris" de las imágenes cuyo fondo no era #FFF.
 * No-op para las que ya tenían fondo blanco. Conectividad protege el producto.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const PAD = 28, EDGE = 600;
const CATS = ["portatiles", "impresoras", "motherboards"];

function whitenBg(data, w, h) {
  const N = w * h;
  const isBg = (idx) => {
    const i = idx * 4;
    if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) return false;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return Math.min(r, g, b) >= 230 && Math.max(r, g, b) - Math.min(r, g, b) <= 14;
  };
  const set = (idx) => { const i = idx * 4; data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; stack[sp++] = idx; };
  const stack = new Uint32Array(N);
  let sp = 0;
  for (let x = 0; x < w; x++) { const t = x, b = (h - 1) * w + x; if (isBg(t)) set(t); if (isBg(b)) set(b); }
  for (let y = 0; y < h; y++) { const l = y * w, r = y * w + (w - 1); if (isBg(l)) set(l); if (isBg(r)) set(r); }
  let n = sp;
  while (sp > 0) {
    const idx = stack[--sp];
    const x = idx % w, y = (idx / w) | 0;
    if (x > 0 && isBg(idx - 1)) { set(idx - 1); n++; }
    if (x < w - 1 && isBg(idx + 1)) { set(idx + 1); n++; }
    if (y > 0 && isBg(idx - w)) { set(idx - w); n++; }
    if (y < h - 1 && isBg(idx + w)) { set(idx + w); n++; }
  }
  return n;
}

async function writeWithRetry(p, buf, tries = 6) {
  for (let i = 0; i < tries; i++) {
    try { await fs.promises.writeFile(p, buf); return; }
    catch (e) { if (i === tries - 1) throw e; await new Promise((r) => setTimeout(r, 250 * (i + 1))); }
  }
}

let fixed = 0, total = 0;
for (const cat of CATS) {
  const origDir = path.join(root, "public", "lineas-orig", cat);
  const destDir = path.join(root, "public", "lineas", cat);
  if (!fs.existsSync(origDir)) continue;
  for (const f of fs.readdirSync(origDir).filter((x) => x.endsWith(".png")).sort()) {
    total++;
    const { data, info } = await sharp(path.join(origDir, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const filled = whitenBg(data, info.width, info.height);
    let buf = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
    try { buf = await sharp(buf).trim({ threshold: 12 }).toBuffer(); } catch { /* nada */ }
    const out = await sharp(buf)
      .resize({ width: EDGE - 2 * PAD, height: EDGE - 2 * PAD, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
      .sharpen({ sigma: 1, m1: 0.6, m2: 2.2 })
      .flatten({ background: "#ffffff" })
      .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: "#ffffff" })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await writeWithRetry(path.join(destDir, f), out);
    if (filled > 0) { fixed++; }
  }
}
console.log(`Reprocesadas ${total} imágenes (${fixed} tenían fondo gris → blanqueadas).`);
