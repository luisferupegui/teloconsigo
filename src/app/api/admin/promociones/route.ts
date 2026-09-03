import { NextRequest, NextResponse } from "next/server";
import {
  analizarPromociones,
  aplicarPrecios,
  quitarDePromocion,
} from "@/lib/promociones-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — qué le pasa hoy a la vitrina. No escribe nada.
export async function GET() {
  try {
    return NextResponse.json(analizarPromociones());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error analizando promociones";
    console.error("[promociones GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — aplica lo que se apruebe. Dos acciones separadas a propósito: cambiar
// precios y retirar productos son decisiones distintas y no tienen por qué
// tomarse a la vez.
export async function POST(req: NextRequest) {
  try {
    const { accion, referencias } = (await req.json()) as {
      accion?: string;
      referencias?: string[];
    };

    if (!Array.isArray(referencias) || referencias.length === 0) {
      return NextResponse.json({ error: "No se recibió ninguna referencia" }, { status: 400 });
    }

    if (accion === "actualizarPrecios") {
      return NextResponse.json({ ok: true, actualizados: aplicarPrecios(referencias) });
    }
    if (accion === "quitarDePromocion") {
      return NextResponse.json({ ok: true, retirados: quitarDePromocion(referencias) });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error aplicando cambios";
    console.error("[promociones POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
