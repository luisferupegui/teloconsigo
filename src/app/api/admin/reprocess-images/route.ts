import { NextResponse } from "next/server";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { processProductImage } from "@/lib/image-processor";

function collectImages(dir: string): string[] {
  const files: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectImages(full));
      } else if (/\.(png|jpg|jpeg|webp)$/i.test(entry.name)) {
        files.push(full);
      }
    }
  } catch {
    // directory doesn't exist — skip silently
  }
  return files;
}

export async function POST() {
  const publicDir = path.join(process.cwd(), "public");
  const scanDirs  = [
    path.join(publicDir, "productos"),
    path.join(publicDir, "lineas"),
    path.join(process.cwd(), "data", "lineas-img"),
  ];

  const files = scanDirs.flatMap(collectImages);

  let ok     = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const file of files) {
    try {
      const input  = readFileSync(file);
      const output = await processProductImage(input);
      // Siempre guardamos como PNG (el procesador devuelve PNG)
      const outPath = file.replace(/\.(jpg|jpeg|webp)$/i, ".png");
      writeFileSync(outPath, output);
      ok++;
    } catch (err) {
      failed++;
      errors.push(
        `${path.relative(publicDir, file)}: ${err instanceof Error ? err.message : "error desconocido"}`
      );
    }
  }

  return NextResponse.json({ ok, failed, total: files.length, errors });
}
