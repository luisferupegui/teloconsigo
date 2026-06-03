import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, unlinkSync, existsSync } from "fs";
import path from "path";
import { processProductImage } from "@/lib/image-processor";

const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const EXTS = ["webp", "jpg", "jpeg", "png"];
const SAFE = /^[a-zA-Z0-9_\-]+$/;

export async function POST(req: NextRequest) {
  try {
    const fd       = await req.formData();
    const file     = fd.get("file")      as File   | null;
    const categoria = fd.get("categoria") as string | null;
    const slug     = fd.get("slug")      as string | null;

    if (!file || !categoria || !slug) {
      return NextResponse.json({ error: "Faltan campos." }, { status: 400 });
    }
    if (!SAFE.test(categoria) || !SAFE.test(slug)) {
      return NextResponse.json({ error: "Identificadores inválidos." }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Formato no válido. Usa JPG, PNG o WebP." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Imagen muy grande (máx. 10 MB)." }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "public", "lineas", categoria);
    mkdirSync(dir, { recursive: true });

    // Remove any previous file with same slug (any extension)
    for (const ext of EXTS) {
      const old = path.join(dir, `${slug}.${ext}`);
      if (existsSync(old)) unlinkSync(old);
    }

    const rawBuffer   = Buffer.from(await file.arrayBuffer());
    const cleanBuffer = await processProductImage(rawBuffer);
    const filename    = `${slug}.png`;
    writeFileSync(path.join(dir, filename), cleanBuffer);

    return NextResponse.json({ ok: true, url: `/lineas/${categoria}/${filename}?v=${Date.now()}` });
  } catch (err) {
    console.error("[upload-line-image]", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { categoria, slug } = await req.json();
    if (!categoria || !slug || !SAFE.test(categoria) || !SAFE.test(slug)) {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }
    const dir = path.join(process.cwd(), "public", "lineas", categoria);
    let deleted = false;
    for (const ext of EXTS) {
      const fp = path.join(dir, `${slug}.${ext}`);
      if (existsSync(fp)) { unlinkSync(fp); deleted = true; }
    }
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    console.error("[delete-line-image]", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
