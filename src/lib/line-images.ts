import "server-only";
import { existsSync, statSync, unlinkSync } from "fs";
import path from "path";

// ─── Dónde vive la imagen de una línea de producto ───────────────────────────
//
// Hay tres sitios posibles, y se miran en este orden:
//
//   1. `data/lineas-img/<categoria>/<slug>.png` — LO QUE SUBE EL PANEL.
//      Vive dentro de `data/` a propósito: en Railway ese directorio es un volumen
//      persistente, así que la imagen sobrevive al siguiente deploy. Antes se
//      guardaba en `public/lineas/`, que NO es volumen: la subida funcionaba y
//      desaparecía en el despliegue siguiente, sin que nadie lo relacionara.
//      Se sirve por `/lineas-subidas/...` → `/api/media` (ver next.config.ts).
//
//   2. `public/lineas/<categoria>/<slug>.<ext>` — subidas ANTERIORES a ese cambio.
//      Se conserva la lectura para no perder las que ya estén en el volumen actual
//      o en el repo; el panel ya no escribe aquí.
//
//   3. `linea.imagen` — la imagen que viene con el repositorio (nombre propio, tipo
//      `hdd-externo.png`). Es la de fábrica, la misma para todos los entornos.
//
// Vivía duplicado en /tienda y en /admin, con dos implementaciones que ya no eran
// idénticas. Una sola función, un solo orden de prioridad.

const EXTS = ["png", "webp", "jpg", "jpeg"] as const;

/** Directorio (volumen persistente) donde el panel guarda las imágenes de línea. */
export const SUBIDAS_DIR = path.join(process.cwd(), "data", "lineas-img");

/** Prefijo de URL de esas imágenes. `next.config.ts` lo enruta a `/api/media`. */
export const SUBIDAS_URL = "/lineas-subidas";

const conVersion = (url: string, abs: string) =>
  `${url}?v=${Math.floor(statSync(abs).mtimeMs)}`;

/** URL servible de la imagen de una línea, o `null` si no tiene ninguna.
 *  `imagenPath` es el campo `imagen` de la línea en `data/categories.json`. */
export function resolveLineImage(
  categoria: string,
  slug: string,
  imagenPath?: string,
): string | null {
  for (const ext of EXTS) {
    const abs = path.join(SUBIDAS_DIR, categoria, `${slug}.${ext}`);
    if (existsSync(abs)) return conVersion(`${SUBIDAS_URL}/${categoria}/${slug}.${ext}`, abs);
  }
  for (const ext of EXTS) {
    const abs = path.join(process.cwd(), "public", "lineas", categoria, `${slug}.${ext}`);
    if (existsSync(abs)) return conVersion(`/lineas/${categoria}/${slug}.${ext}`, abs);
  }
  if (imagenPath) {
    const abs = path.join(process.cwd(), "public", imagenPath.replace(/^\//, ""));
    if (existsSync(abs)) return conVersion(imagenPath, abs);
  }
  return null;
}

/** Borra la imagen SUBIDA de una línea (los dos sitios donde ha podido guardarse).
 *  No toca `linea.imagen`: de eso se encarga `setLineaImagen`. */
export function deleteLineImage(categoria: string, slug: string): boolean {
  let borrada = false;
  for (const dir of [path.join(SUBIDAS_DIR, categoria), path.join(process.cwd(), "public", "lineas", categoria)]) {
    for (const ext of EXTS) {
      const abs = path.join(dir, `${slug}.${ext}`);
      if (existsSync(abs)) { unlinkSync(abs); borrada = true; }
    }
  }
  return borrada;
}
