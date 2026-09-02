import { NextRequest, NextResponse } from "next/server";
import { importCatalog } from "@/lib/catimporter/orchestrator";
import { avisosDeImportacion } from "@/lib/supplier-catalog";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Paso 1 de la importación: LEER, sin guardar nada ────────────────────────
//
// Antes había dos importadores que guardaban a ciegas: subías el archivo y la
// lista entraba al catálogo tal cual saliera del lector. Si el lector se
// equivocaba, el error ya estaba dentro y tocaba borrar la lista y repetir.
//
// Aquí solo se lee y se devuelve lo leído. Quien importa ve qué motor se usó,
// cuántos productos salieron, cuáles necesitan revisión y qué bloques del
// documento NO llegaron a producto. Guardar es un segundo paso deliberado
// (POST a ./guardar) que solo se da si lo que se ve está bien.

const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    if (!/\.(pdf|docx|xlsx)$/i.test(file.name)) {
      return NextResponse.json({ error: "Formatos permitidos: PDF, Word (.docx) y Excel (.xlsx)" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Archivo muy grande (máx. 50 MB)" }, { status: 400 });
    }

    const proveedor = String(fd.get("proveedor") || "").trim().toLowerCase() || "sin-proveedor";
    const aplicarIva = fd.get("aplicarIva") === "true";

    const { motor, productos, descartados } = await importCatalog(
      Buffer.from(await file.arrayBuffer()),
      file.name,
      proveedor,
      aplicarIva,
    );

    if (productos.length === 0) {
      return NextResponse.json(
        { error: `No se encontró ningún producto (motor: ${motor}). Revisa que la lista tenga columnas de producto y precio.` },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      motor,
      count: productos.length,
      reviewCount: productos.filter((p) => p.requiresReview).length,
      products: productos,
      descartados,
      // Qué mirar antes de guardar: lo que no tiene precio y lo que cambió de
      // precio de forma llamativa frente a la última lista de este proveedor.
      avisos: avisosDeImportacion(
        productos.map((p) => ({ nombre: p.nombre, referencia: p.supplierCode, precio_costo: p.precio_costo })),
        proveedor,
      ),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error leyendo la lista";
    console.error("[importador/analizar]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
