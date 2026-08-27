import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { processProductImage } from "@/lib/image-processor";
import { setLineaImagen } from "@/lib/categories";
import { deleteLineImage, SUBIDAS_DIR, SUBIDAS_URL } from "@/lib/line-images";

const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
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

    // Se guarda en `data/lineas-img/` (volumen persistente en Railway), NO en
    // `public/lineas/`. Ver src/lib/line-images.ts para el porqué.
    const dir = path.join(SUBIDAS_DIR, categoria);
    mkdirSync(dir, { recursive: true });

    // Fuera cualquier versión anterior de esta misma línea, esté donde esté.
    deleteLineImage(categoria, slug);

    const rawBuffer   = Buffer.from(await file.arrayBuffer());
    const cleanBuffer = await processProductImage(rawBuffer);
    const filename    = `${slug}.png`;
    writeFileSync(path.join(dir, filename), cleanBuffer);

    // El catálogo también apunta a su imagen: si se queda con la anterior, esa es la que
    // sale en cuanto el archivo con el slug no esté (otro entorno, un borrado…).
    const url = `${SUBIDAS_URL}/${categoria}/${filename}`;
    setLineaImagen(categoria, slug, url);

    return NextResponse.json({ ok: true, url: `${url}?v=${Date.now()}` });
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
    const deleted = deleteLineImage(categoria, slug);
    // Y se quita también la referencia del catálogo. Sin esto, borrar la imagen de una
    // línea que nunca se re-subió (las que traen su archivo con nombre propio, tipo
    // "hdd-externo.png") no borraba nada: el panel decía "Imagen eliminada" y al
    // recargar la imagen seguía ahí.
    setLineaImagen(categoria, slug, null);
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    console.error("[delete-line-image]", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
