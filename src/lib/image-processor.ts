import "server-only";
import sharp from "sharp";

const PADDING  = 32;
const OUT_SIZE = 600;

// ── Parámetros del removedor de fondo (validados en scripts/test-processor.mjs) ──
const NEUTRAL_TOL = 22;   // saturación máx (max-min) para considerar un pixel "gris/neutro".
                          // Por encima = tiene color = producto → NUNCA se elimina.
const LIGHT_FLOOR = 202;  // gris neutro ≥ esto = fondo o "tarjeta gris" → se elimina aunque
                          // haya un borde duro entre el blanco y la tarjeta.
const STEP_FLOOR  = 190;  // el seguimiento de gradiente (viñetas/sombras suaves) solo desciende
                          // hasta aquí; protege productos plateados/metálicos (< 190).
const STEP_TOL    = 22;   // salto máx entre vecinos para seguir un gradiente suave.
const SNAP_WHITE  = 246;  // gris neutro ≥ esto que sobrevivió → blanco puro (mata ruido JPEG).

/**
 * Pipeline de limpieza de imágenes de producto → fondo BLANCO PURO.
 *
 * Removedor de fondo por CONECTIVIDAD desde las 4 aristas, con dos garantías:
 *   1. Solo elimina píxeles NEUTROS (R≈G≈B). Cualquier pixel con color es
 *      producto y jamás se toca → un producto colorido nunca se daña.
 *   2. Un vecino se elimina si:
 *        · es claro y neutro (min ≥ LIGHT_FLOOR) → fondo blanco o "tarjeta gris",
 *          se cruza incluso un borde duro (esto es lo que mata el "recuadro gris"); o
 *        · continúa un gradiente suave (|Δmin| ≤ STEP_TOL) PERO sin bajar de
 *          STEP_FLOOR → sigue viñetas/sombras leves sin entrar a un producto
 *          plateado u oscuro.
 *
 * Resultado: el fondo (blanco, gris uniforme, o tarjeta gris flotando en blanco)
 * queda en blanco puro; el producto se conserva intacto y en alta definición.
 */
export async function processProductImage(input: Buffer): Promise<Buffer> {
  // Decodifica respetando EXIF, aplana transparencia sobre blanco y pasa a RGBA crudo.
  const { data, info } = await sharp(input)
    .rotate()
    .flatten({ background: "#ffffff" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h, channels } = info;
  const N = w * h;

  const removed = new Uint8Array(N); // 1 = fondo → se pinta blanco
  const visited = new Uint8Array(N);
  const queue   = new Int32Array(N);
  let head = 0, tail = 0;

  const satOf = (i: number) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return Math.max(r, g, b) - Math.min(r, g, b);
  };
  const minOf = (i: number) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return Math.min(r, g, b);
  };
  const isNeutral = (i: number) => satOf(i) <= NEUTRAL_TOL;

  // ── Semilla: aristas que son neutras y claras (fondo seguro) ──────────────────
  const seed = (p: number) => {
    const i = p * channels;
    if (!visited[p] && isNeutral(i) && minOf(i) >= LIGHT_FLOOR) {
      visited[p] = 1;
      removed[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + (w - 1)); }

  // ── Flood-fill por conectividad ───────────────────────────────────────────────
  while (head < tail) {
    const p  = queue[head++];
    const pmin = minOf(p * channels);
    const px = p % w, py = (p / w) | 0;

    const neighbors = [
      py > 0     ? p - w : -1,
      py < h - 1 ? p + w : -1,
      px > 0     ? p - 1 : -1,
      px < w - 1 ? p + 1 : -1,
    ];

    for (const n of neighbors) {
      if (n < 0 || visited[n]) continue;
      const ni = n * channels;
      if (!isNeutral(ni)) continue;             // tiene color → producto → nunca
      const nmin = minOf(ni);

      const lightCard = nmin >= LIGHT_FLOOR;                                  // tarjeta/fondo claro
      const softGrad  = nmin >= STEP_FLOOR && Math.abs(nmin - pmin) <= STEP_TOL; // viñeta/sombra leve

      if (lightCard || softGrad) {
        visited[n] = 1;
        removed[n] = 1;
        queue[tail++] = n;
      }
    }
  }

  // ── Pinta el fondo a blanco puro + snap anti-ruido de casi-blancos residuales ──
  for (let p = 0; p < N; p++) {
    const i = p * channels;
    if (removed[p]) {
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
    } else if (isNeutral(i) && minOf(i) >= SNAP_WHITE) {
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
    }
  }

  const cleaned = await sharp(Buffer.from(data), { raw: { width: w, height: h, channels } })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();

  // ── Recorte ceñido + reescalado nítido + padding uniforme → PNG final ─────────
  let trimmed = cleaned;
  try {
    trimmed = await sharp(cleaned).trim({ threshold: 18 }).toBuffer();
  } catch {
    /* imagen uniforme (todo blanco): sin recorte */
  }

  return sharp(trimmed)
    .flatten({ background: "#ffffff" })
    .resize(OUT_SIZE - PADDING * 2, OUT_SIZE - PADDING * 2, {
      fit:                "inside",
      withoutEnlargement: true,
      kernel:             "lanczos3",
    })
    .sharpen({ sigma: 0.8, m1: 0.5, m2: 2 })
    .flatten({ background: "#ffffff" })
    .extend({
      top: PADDING, bottom: PADDING,
      left: PADDING, right: PADDING,
      background: "#ffffff",
    })
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
}
