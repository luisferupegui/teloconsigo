import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";

const PADDING  = 32;
const OUT_SIZE = 600;
const EXTS     = ["png", "webp", "jpg", "jpeg"];
const OPS      = ["rotate-cw", "rotate-ccw", "flip-h", "flip-v"] as const;
type Op = (typeof OPS)[number];

/**
 * Aplica una transformación geométrica (girar 90° / voltear) a una imagen de
 * producto YA procesada (fondo blanco limpio) y la re-encuadra centrada sobre
 * blanco. No re-ejecuta el removedor de fondo: la imagen ya está limpia, así que
 * solo rota/voltea + recorta + re-padea (sin resampleo destructivo).
 */
export async function POST(req: NextRequest) {
  try {
    const { identifier: rawId, tipo, op } = (await req.json()) as {
      identifier?: string;
      tipo?: string;
      op?: Op;
    };

    if (!rawId || !tipo || !op) {
      return NextResponse.json({ error: "Faltan campos requeridos." }, { status: 400 });
    }
    if (!OPS.includes(op)) {
      return NextResponse.json({ error: "Operación no válida." }, { status: 400 });
    }

    const identifier = rawId.replace(/[^a-zA-Z0-9._\-]/g, "");
    const safeTipo   = String(tipo).replace(/[^a-zA-Z0-9._\-]/g, "");
    if (!identifier || !safeTipo) {
      return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "public", "productos", identifier);
    const file = EXTS.map((e) => path.join(dir, `${safeTipo}.${e}`)).find((p) => existsSync(p));
    if (!file) {
      return NextResponse.json({ error: "No hay imagen para transformar." }, { status: 404 });
    }

    const input = readFileSync(file);

    // 1. Transformación geométrica (sin alpha → fondo blanco garantizado)
    let pipe = sharp(input).flatten({ background: "#ffffff" });
    if (op === "rotate-cw")  pipe = pipe.rotate(90,  { background: "#ffffff" });
    if (op === "rotate-ccw") pipe = pipe.rotate(270, { background: "#ffffff" });
    if (op === "flip-h")     pipe = pipe.flop(); // espejo horizontal
    if (op === "flip-v")     pipe = pipe.flip(); // espejo vertical
    const transformed = await pipe.png().toBuffer();

    // 2. Recorte ceñido + re-encuadre centrado sobre blanco (mantiene el tamaño)
    let trimmed = transformed;
    try {
      trimmed = await sharp(transformed).trim({ threshold: 18 }).toBuffer();
    } catch {
      /* imagen uniforme: sin recorte */
    }

    const out = await sharp(trimmed)
      .flatten({ background: "#ffffff" })
      .resize(OUT_SIZE - PADDING * 2, OUT_SIZE - PADDING * 2, {
        fit: "inside",
        withoutEnlargement: true,
        kernel: "lanczos3",
      })
      .extend({
        top: PADDING, bottom: PADDING,
        left: PADDING, right: PADDING,
        background: "#ffffff",
      })
      .png({ quality: 95, compressionLevel: 9 })
      .toBuffer();

    // Siempre guardamos como .png (igual que la subida)
    const outPath = path.join(dir, `${safeTipo}.png`);
    writeFileSync(outPath, out);
    // Si el archivo original tenía otra extensión, lo dejamos: la subida ya
    // normaliza a .png, así que en la práctica file === outPath.

    return NextResponse.json({
      ok:  true,
      url: `/productos/${identifier}/${safeTipo}.png?v=${Date.now()}`,
    });
  } catch (err) {
    console.error("[transform-image]", err);
    return NextResponse.json({ error: "Error al transformar la imagen." }, { status: 500 });
  }
}
