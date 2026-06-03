import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, unlinkSync, existsSync } from "fs";
import path from "path";
import { processProductImage } from "@/lib/image-processor";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const EXTS = ["webp", "jpg", "jpeg", "png"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file       = formData.get("file")       as File   | null;
    const rawId      = formData.get("identifier") as string | null;
    const tipo       = formData.get("tipo")       as string | null;

    if (!file || !rawId || !tipo) {
      return NextResponse.json({ error: "Faltan campos requeridos." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Formato no válido. Usa JPG, PNG o WebP." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Imagen muy grande (máx. 10 MB)." }, { status: 400 });
    }

    // Sanitize identifier
    const identifier = rawId.replace(/[^a-zA-Z0-9._\-]/g, "");
    if (!identifier) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "public", "productos", identifier);
    mkdirSync(dir, { recursive: true });

    // Elimina archivos anteriores del mismo tipo (cualquier extensión)
    for (const ext of EXTS) {
      const old = path.join(dir, `${tipo}.${ext}`);
      if (existsSync(old)) unlinkSync(old);
    }

    // ── Procesamiento de imagen ──────────────────────────────────────────
    // Siempre guardamos como PNG tras el pipeline de fondo blanco
    const rawBuffer  = Buffer.from(await file.arrayBuffer());
    const cleanBuffer = await processProductImage(rawBuffer);
    const filename   = `${tipo}.png`;
    writeFileSync(path.join(dir, filename), cleanBuffer);

    return NextResponse.json({
      ok:  true,
      url: `/productos/${identifier}/${filename}?v=${Date.now()}`,
    });
  } catch (err) {
    console.error("[upload-image]", err);
    return NextResponse.json({ error: "Error interno al subir la imagen." }, { status: 500 });
  }
}
