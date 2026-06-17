import { NextRequest, NextResponse } from "next/server";
import { loadSearchPriority, saveSearchPriority, type SearchMode } from "@/lib/search-priority";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(loadSearchPriority());
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json() as Record<string, SearchMode>;
    if (typeof data !== "object" || data === null) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    saveSearchPriority(data);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al guardar prioridades" }, { status: 500 });
  }
}
