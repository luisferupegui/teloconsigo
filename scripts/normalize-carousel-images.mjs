/**
 * normalize-carousel-images.mjs
 *
 * Toma cada PNG de public/carousel/ y lo normaliza para que todos los
 * productos aparezcan al mismo tamaño visual con base alineada al fondo.
 *
 * Pasos por imagen:
 *   1. Asegura canal alpha.
 *   2. Si el fondo es blanco (no transparente), lo convierte a transparente
 *      reemplazando todos los pixels casi-blancos con alpha=0.
 *   3. Recorta los bordes transparentes (sólo queda el producto).
 *   4. Escala el producto para que su lado mayor sea PRODUCT_SCALE × CANVAS.
 *   5. Crea un canvas cuadrado TARGET_SIZE × TARGET_SIZE con el producto
 *      centrado horizontalmente y anclado al fondo.
 *   6. Guarda como PNG comprimido en public/carousel/ (sobrescribe).
 *
 * Resultado: TODAS las cards muestran productos del mismo tamaño visual,
 * con la misma base de apoyo, sin importar el aspect ratio original.
 */

import sharp from "sharp";
import fs   from "node:fs/promises";
import path from "node:path";

const CAROUSEL_DIR  = path.join(process.cwd(), "public", "carousel");
const BACKUP_DIR    = path.join(process.cwd(), "public", "carousel-orig");
const TARGET_SIZE   = 600;     // px finales (cuadrado)
/* ── Normalización por ÁREA ──────────────────────────────────────────────
   El ojo percibe el "tamaño" de un objeto por su área visible, no por
   su lado mayor. Si normalizamos por lado mayor (la versión anterior),
   un producto cuadrado al 92 % del canvas ocupa 92² = 8 464 unidades²
   mientras que uno con aspect ratio 2:1 al 92 % de ancho ocupa sólo
   92 × 46 = 4 232 unidades² (la mitad). Por eso "monitores" y
   "auriculares" (casi cuadrados) se veían más grandes que "teclados"
   o "refrigeración" (anchos planos).
   ─ Solución: forzar la MISMA ÁREA a todos los productos. ── */
const TARGET_AREA   = 150_000; // px² uniformes para todos los productos

/* ── Ajustes finos por imagen ────────────────────────────────────────────
   El área uniforme resuelve el 95% de los casos, pero no todo lo que ocupa
   la misma caja se percibe igual de grande: una ilustración con varios
   objetos sueltos deja huecos entre ellos y "pesa" menos en el ojo que un
   producto macizo del mismo tamaño. Medido sobre el set, la tinta real
   dentro de la caja va del 38% (kits de streaming) al 87% (motherboards).

   El factor multiplica el área objetivo SOLO de la imagen indicada. Los
   topes MAX_W/MAX_H se siguen respetando, así que un factor alto no puede
   romper el encuadre. Sin entrada aquí, el factor es 1. ── */
const AJUSTES = {
  "accesorios.png": 1.20, // +20% de área ≈ +10% de tamaño lineal
};

const MAX_W         = TARGET_SIZE * 0.90; // 540 px - tope ancho
const MAX_H         = TARGET_SIZE * 0.72; // 432 px - tope alto
const WHITE_THR     = 240;     // umbral para detectar fondo blanco
const TRIM_THR      = 8;       // umbral para trim de alpha

/* ─── Detecta si el PNG tiene fondo blanco (no alpha) ─── */
async function hasWhiteBackground(buf) {
  const { data, info } = await sharp(buf)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  // Muestreamos las 4 esquinas
  const corners = [
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1],
  ];
  let whiteCount = 0;
  for (const [x, y] of corners) {
    const i = (y * info.width + x) * ch;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const a = ch === 4 ? data[i + 3] : 255;
    if (a > 200 && r > WHITE_THR && g > WHITE_THR && b > WHITE_THR) whiteCount++;
  }
  return whiteCount >= 3; // 3 de 4 esquinas blancas → fondo blanco
}

/* ─── Convierte fondo blanco a transparente ─── */
async function whiteToTransparent(buf) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // info.channels = 4 garantizado por ensureAlpha
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i], g = out[i + 1], b = out[i + 2];
    // Suave: si es casi-blanco, alpha proporcional a la oscuridad
    const minRGB = Math.min(r, g, b);
    if (minRGB >= WHITE_THR) {
      out[i + 3] = 0;
    } else if (minRGB >= 220) {
      // Edge anti-aliasing → semi-transparente para no perder bordes
      out[i + 3] = Math.round(out[i + 3] * (WHITE_THR - minRGB) / 20);
    }
  }
  return await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/* ─── Pipeline por imagen ─── */
async function normalize(file) {
  const inputPath  = path.join(CAROUSEL_DIR, file);
  const backupPath = path.join(BACKUP_DIR, file);

  // 1. Usar SIEMPRE el backup como fuente si existe — evita degradación
  //    por re-procesamiento sucesivo.
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  let sourcePath = inputPath;
  try {
    await fs.access(backupPath);
    sourcePath = backupPath;
  } catch {
    // primer run: aún no hay backup → crearlo
    await fs.copyFile(inputPath, backupPath);
  }

  let buf = await fs.readFile(sourcePath);

  // 2. Detectar y limpiar fondo blanco si aplica
  if (await hasWhiteBackground(buf)) {
    buf = await whiteToTransparent(buf);
  }

  // 3. Trim alpha
  buf = await sharp(buf)
    .ensureAlpha()
    .trim({ threshold: TRIM_THR })
    .png()
    .toBuffer();

  const m = await sharp(buf).metadata();

  // 4. Escala POR ÁREA: todos los productos tienen la misma área visual.
  //    Si la escala calculada hace que alguna dimensión supere su tope,
  //    se aplica un factor de ajuste para mantener el aspect ratio
  //    pero quedar dentro de los límites del canvas.
  const areaObjetivo = TARGET_AREA * (AJUSTES[file] ?? 1);
  let scale  = Math.sqrt(areaObjetivo / (m.width * m.height));
  let newW   = m.width  * scale;
  let newH   = m.height * scale;

  let cap = 1;
  if (newW > MAX_W) cap = Math.min(cap, MAX_W / newW);
  if (newH > MAX_H) cap = Math.min(cap, MAX_H / newH);
  if (cap < 1) {
    newW *= cap;
    newH *= cap;
  }
  newW = Math.round(newW);
  newH = Math.round(newH);

  buf = await sharp(buf)
    .resize(newW, newH, { fit: "fill" })
    .png()
    .toBuffer();

  // 5. Padding al canvas final — producto centrado horizontal,
  //    anclado al fondo con un pequeño "respiro" (4% del canvas)
  const bottomPad = Math.round(TARGET_SIZE * 0.04);
  const topPad    = TARGET_SIZE - newH - bottomPad;
  const horizPad  = TARGET_SIZE - newW;
  const leftPad   = Math.floor(horizPad / 2);
  const rightPad  = horizPad - leftPad;

  await sharp(buf)
    .extend({
      top:    Math.max(0, topPad),
      bottom: Math.max(0, bottomPad),
      left:   Math.max(0, leftPad),
      right:  Math.max(0, rightPad),
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    // Paleta de 192 colores: sobre la ilustración más compleja del set baja el archivo
    // de 175 KB a 54 KB con un error medio de 0,27 sobre 255 — invisible incluso en los
    // degradados oscuros, que es donde se notaría.
    .png({ compressionLevel: 9, palette: true, colors: 192 })
    .toFile(inputPath);

  return {
    file,
    orig:    `${m.width}×${m.height}`,
    product: `${newW}×${newH}`,
    area:    newW * newH,
  };
}

/* ─── Main ─── */
// Con un nombre de archivo como argumento se normaliza SOLO esa imagen. Sirve para
// reemplazar una sin volver a tocar las otras diecisiete.
const soloEste = process.argv[2];
const files = (await fs.readdir(CAROUSEL_DIR)).filter(
  (f) => f.endsWith(".png") && (!soloEste || f === soloEste),
);
if (soloEste && files.length === 0) {
  console.error(`No existe public/carousel/${soloEste}`);
  process.exit(1);
}

console.log(`Normalizando ${files.length} imágenes a ${TARGET_SIZE}×${TARGET_SIZE}px (área uniforme ${TARGET_AREA} px²)…`);
console.log(`Backup → ${BACKUP_DIR}`);
console.log("");

for (const file of files) {
  try {
    const r = await normalize(file);
    console.log(`  ✓  ${r.file.padEnd(32)}  ${r.orig} → producto ${r.product}  (área ${r.area.toLocaleString()} px²)`);
  } catch (err) {
    console.error(`  ✗  ${file}:  ${err.message}`);
  }
}

console.log("\nListo. Recarga la página para ver los productos perfectamente alineados.");
