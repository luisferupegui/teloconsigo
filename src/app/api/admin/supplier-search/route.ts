import { NextRequest, NextResponse } from "next/server";
import { loadActiveProducts, loadMargins, applyMargin } from "@/lib/supplier-catalog";
import { categoriaDeTermino } from "@/lib/sinonimos-categoria";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 80;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Pega la cifra a su unidad para que "16 gb" encuentre "16GB", que es como lo escriben
 *  casi todas las listas. */
const pegarUnidades = (s: string) => s.replace(/(\d)\s+(gb|tb|mb|hz|mhz|w)\b/g, "$1$2");

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

  const tokens = pegarUnidades(norm(q)).split(/\s+/).filter(Boolean);

  const matched = active.filter((p) => {
    // El texto donde se busca incluye ahora la CATEGORÍA y las specs, no solo el nombre.
    const haystack = pegarUnidades(
      norm(`${p.nombre} ${p.marca} ${p.referencia ?? ""} ${p.categoria} ${Object.values(p.specs ?? {}).join(" ")}`),
    );
    return tokens.every((t) => {
      if (haystack.includes(t)) return true;
      // "board" no aparece en "MSI PRO B650M", pero su categoría sí es motherboard.
      const cat = categoriaDeTermino(t);
      return cat !== null && p.categoria === cat;
    });
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

  // Si la búsqueda nombra una categoría, sus productos van PRIMERO. Buscar "monitor"
  // devolvía 371 resultados porque cualquier PC que incluya uno lo lleva en el nombre, y los
  // 16 monitores de verdad quedaban enterrados entre combos de escritorio.
  const categoriasPedidas = tokens.map(categoriaDeTermino).filter((c): c is string => c !== null);
  const esDeLaCategoria = (cat: string) => categoriasPedidas.length > 0 && categoriasPedidas.includes(cat);

  // Dentro de cada grupo, por costo ascendente: es una decisión de abastecimiento.
  withFinal.sort((a, b) => {
    const pa = esDeLaCategoria(a.categoria) ? 0 : 1;
    const pb = esDeLaCategoria(b.categoria) ? 0 : 1;
    return pa - pb || a.precio_costo - b.precio_costo;
  });
  // "Más barato" solo tiene sentido dentro de lo que el usuario buscaba de verdad.
  if (withFinal.length > 0) withFinal[0].esMasBarato = true;

  return NextResponse.json({
    query: q,
    totalActiveProducts: active.length,
    matches: withFinal.slice(0, MAX_RESULTS),
    // Cuántos hay en total, para que el panel avise si el corte deja resultados fuera.
    totalMatches: withFinal.length,
  });
}
