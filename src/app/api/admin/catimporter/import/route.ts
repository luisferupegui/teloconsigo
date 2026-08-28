import { NextRequest, NextResponse } from "next/server";
import { importCatalog } from "@/lib/catimporter/orchestrator";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData(); const file = fd.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    if (!/\.(pdf|docx|xlsx)$/i.test(file.name)) return NextResponse.json({ error: "Formatos permitidos: PDF, DOCX y XLSX" }, { status: 400 });
    const provider = String(fd.get("proveedor") || "sin-proveedor").trim().toLowerCase();
    const aplicarIva = fd.get("aplicarIva") === "true";
    const products = await importCatalog(Buffer.from(await file.arrayBuffer()), file.name, provider, aplicarIva);
    if (!products.length) return NextResponse.json({ error: "No se encontraron productos" }, { status: 422 });
    return NextResponse.json({ ok: true, count: products.length, products, reviewCount: products.filter(p => p.requiresReview).length });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Error importando catálogo" }, { status: 500 }); }
}
