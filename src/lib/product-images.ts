import "server-only";
import { existsSync, statSync } from "fs";
import path from "path";

const EXTS = ["webp", "jpg", "jpeg", "png"] as const;

export function resolveProductImage(
  identifier: string | undefined | null,
  tipo: "card" | "detalle"
): string | null {
  if (!identifier) return null;
  for (const ext of EXTS) {
    const abs = path.join(
      process.cwd(),
      "public",
      "productos",
      identifier,
      `${tipo}.${ext}`
    );
    if (existsSync(abs)) {
      const v = Math.floor(statSync(abs).mtimeMs);
      return `/productos/${identifier}/${tipo}.${ext}?v=${v}`;
    }
  }
  return null;
}
