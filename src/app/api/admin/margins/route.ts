import { NextRequest, NextResponse } from "next/server";
import { loadMargins, saveMargins } from "@/lib/supplier-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(loadMargins());
}

export async function POST(req: NextRequest) {
  try {
    const margins = await req.json();
    if (typeof margins !== "object" || margins === null) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    saveMargins(margins);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al guardar márgenes" }, { status: 500 });
  }
}
