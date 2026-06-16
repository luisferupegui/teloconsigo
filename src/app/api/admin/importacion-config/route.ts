import { NextRequest, NextResponse } from "next/server";
import { loadImportConfig, saveImportConfig } from "@/lib/importacion";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(loadImportConfig());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    saveImportConfig(body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
