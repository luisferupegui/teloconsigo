import { NextRequest, NextResponse } from "next/server";
import { buscarEnListas } from "@/lib/buscador-listas";

export const dynamic = "force-dynamic";

// Autocompletado del buscador de la web sobre las listas de proveedor.
//
// Devuelve nombre, marca y el enlace para cotizar con Andrea — nada más: ni
// precio, ni costo, ni proveedor (ver lib/buscador-listas). A propósito NO se
// anuncia en /.well-known/api-catalog: es un apoyo del buscador, no un catálogo
// para terceros, y /api/ ya está fuera del rastreo en robots.txt.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const limite = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limite")) || 8, 1), 24);
  return NextResponse.json(
    { resultados: buscarEnListas(q, limite) },
    // Un minuto en caché del navegador: mientras alguien escribe se repiten
    // prefijos ("rt", "rtx", "rtx ") y no hace falta volver a pedirlos.
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
