import "server-only";
import { existsSync, statSync } from "fs";
import path from "path";

const EXTS = ["webp", "jpg", "jpeg", "png"] as const;

function buscar(identifier: string, tipo: "card" | "detalle"): string | null {
  for (const ext of EXTS) {
    const abs = path.join(process.cwd(), "public", "productos", identifier, `${tipo}.${ext}`);
    if (existsSync(abs)) {
      const v = Math.floor(statSync(abs).mtimeMs);
      return `/productos/${identifier}/${tipo}.${ext}?v=${v}`;
    }
  }
  return null;
}

/** Imagen del producto. Desde el panel se sube UNA sola (se guarda como `card`) y sirve
 *  para todo; si no existe la del tipo pedido se usa la otra. Los productos antiguos que
 *  sí tienen `card` y `detalle` separadas siguen usando cada una en su sitio. */
export function resolveProductImage(
  identifier: string | undefined | null,
  tipo: "card" | "detalle"
): string | null {
  if (!identifier) return null;
  return buscar(identifier, tipo) ?? buscar(identifier, tipo === "card" ? "detalle" : "card");
}
