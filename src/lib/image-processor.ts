/**
 * image-processor.ts
 * Procesa imágenes de producto para lograr fondo blanco limpio y profesional.
 * Pipeline: trim de fondo → fondo blanco → padding uniforme → PNG de alta calidad.
 */
import "server-only";
import sharp from "sharp";

const PADDING   = 48;   // px de espacio blanco alrededor del producto
const OUT_SIZE  = 800;  // tamaño máximo del lado mayor (mantiene aspecto)
const THRESHOLD = 25;   // tolerancia de color para considerar "mismo fondo"

/**
 * Dado un Buffer de imagen (cualquier formato), devuelve un Buffer PNG con
 * fondo blanco limpio y el producto centrado con padding uniforme.
 */
export async function processProductImage(input: Buffer): Promise<Buffer> {
  // ── 1. Leer imagen y metadata ────────────────────────────────────────────
  const base = sharp(input).rotate(); // auto-rota por EXIF

  const { width = 800, height = 800 } = await base.metadata();

  // ── 2. Samplear las 4 esquinas para detectar el color de fondo ──────────
  //    Usamos una ventana de 8×8 px en cada esquina y promediamos RGB.
  const cornerSize = Math.min(8, Math.floor(Math.min(width, height) * 0.05));

  const corners = await Promise.all([
    base.clone().extract({ left: 0,             top: 0,              width: cornerSize, height: cornerSize }).raw().toBuffer(),
    base.clone().extract({ left: width - cornerSize, top: 0,          width: cornerSize, height: cornerSize }).raw().toBuffer(),
    base.clone().extract({ left: 0,             top: height - cornerSize, width: cornerSize, height: cornerSize }).raw().toBuffer(),
    base.clone().extract({ left: width - cornerSize, top: height - cornerSize, width: cornerSize, height: cornerSize }).raw().toBuffer(),
  ]);

  // Promedio de los 4 samples (canales RGB, ignora alpha si existe)
  const avgColor = corners.reduce(
    (acc, buf) => {
      let r = 0, g = 0, b = 0;
      const pixels = buf.length >= 3 ? Math.floor(buf.length / 3) : 1;
      for (let i = 0; i < buf.length - 2; i += 3) {
        r += buf[i]; g += buf[i + 1]; b += buf[i + 2];
      }
      return { r: acc.r + r / pixels, g: acc.g + g / pixels, b: acc.b + b / pixels };
    },
    { r: 0, g: 0, b: 0 }
  );
  const bg = {
    r: Math.round(avgColor.r / 4),
    g: Math.round(avgColor.g / 4),
    b: Math.round(avgColor.b / 4),
  };

  // ── 3. Pipeline de limpieza ───────────────────────────────────────────────
  const processed = await sharp(input)
    .rotate()                                    // EXIF auto-rotate
    // Elimina píxeles de borde del color de fondo detectado
    .trim({ background: `rgb(${bg.r},${bg.g},${bg.b})`, threshold: THRESHOLD })
    // Aplana canales alpha sobre blanco (PNG transparentes → blanco)
    .flatten({ background: "#ffffff" })
    // Redimensiona manteniendo proporción, sin exceder OUT_SIZE
    .resize(OUT_SIZE - PADDING * 2, OUT_SIZE - PADDING * 2, {
      fit: "inside",
      withoutEnlargement: true,
    })
    // Añade espacio blanco uniforme alrededor del producto
    .extend({
      top: PADDING, bottom: PADDING,
      left: PADDING, right: PADDING,
      background: "#ffffff",
    })
    // Salida PNG de alta calidad, sin metadatos innecesarios
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();

  return processed;
}
