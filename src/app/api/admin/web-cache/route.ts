import { NextRequest, NextResponse } from "next/server";
import { invalidateCache } from "@/lib/web-cache";

export const dynamic = "force-dynamic";

// Invalida el caché de precios de EE.UU. para forzar precios frescos en la
// próxima cotización. Con `term` invalida ese producto/consulta; sin él, todo.
export async function POST(req: NextRequest) {
  try {
    const { term } = (await req.json().catch(() => ({}))) as { term?: string };
    const removed = invalidateCache(term && term.trim() ? term.trim() : undefined);
    return NextResponse.json({ ok: true, removed });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el caché" }, { status: 500 });
  }
}
