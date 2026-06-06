import { NextRequest, NextResponse } from "next/server";
import { loadActiveProducts, loadMargins, applyMargin } from "@/lib/supplier-catalog";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 80;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();

  const active = loadActiveProducts();
  const margins = loadMargins();

  // Sin consulta: devolvemos solo los totales (para el estado inicial del buscador).
  if (!q) {
    return NextResponse.json({
      query: "",
      totalActiveProducts: active.length,
      matches: [],
    });
  }

  const tokens = norm(q).split(/\s+/).filter(Boolean);

  const matched = active.filter((p) => {
    const haystack = norm(`${p.nombre} ${p.marca} ${p.referencia ?? ""}`);
    return tokens.every((t) => haystack.includes(t));
  });

  const withFinal = matched.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    marca: p.marca,
    categoria: p.categoria,
    referencia: p.referencia ?? "",
    specs: p.specs ?? {},
    precio_costo: p.precio_costo,
    precio_final: applyMargin(p.precio_costo, p.categoria, margins),
    margen: margins[p.categoria] ?? margins.default ?? 0.35,
    proveedor: p.proveedor,
    listaId: p.listaId,
    listaNombre: p.listaNombre,
    esMasBarato: false,
  }));

  // Ordena por costo ascendente y marca el más barato (decisión de abastecimiento).
  withFinal.sort((a, b) => a.precio_costo - b.precio_costo);
  if (withFinal.length > 0) withFinal[0].esMasBarato = true;

  return NextResponse.json({
    query: q,
    totalActiveProducts: active.length,
    matches: withFinal.slice(0, MAX_RESULTS),
  });
}
