import { NextRequest, NextResponse } from "next/server";
import { unlinkSync, existsSync } from "fs";
import path from "path";

const EXTS = ["webp", "jpg", "jpeg", "png"];

export async function DELETE(req: NextRequest) {
  try {
    const { identifier, tipo } = await req.json();

    if (!identifier || !tipo) {
      return NextResponse.json({ error: "Faltan campos." }, { status: 400 });
    }

    const safeId = String(identifier).replace(/[^a-zA-Z0-9._\-]/g, "");
    const dir    = path.join(process.cwd(), "public", "productos", safeId);
    let deleted  = false;

    for (const ext of EXTS) {
      const fp = path.join(dir, `${tipo}.${ext}`);
      if (existsSync(fp)) { unlinkSync(fp); deleted = true; }
    }

    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    console.error("[delete-image]", err);
    return NextResponse.json({ error: "Error interno al eliminar." }, { status: 500 });
  }
}
