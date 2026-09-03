import { NextRequest, NextResponse } from "next/server";
import {
  analizarPromociones,
  aplicarPrecios,
  quitarDePromocion,
} from "@/lib/promociones-sync";
import { proponerRelleno, publicarCandidatos, SECCIONES } from "@/lib/promociones-relleno";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — qué le pasa hoy a la vitrina. No escribe nada.
export async function GET() {
  try {
    return NextResponse.json({
      ...analizarPromociones(),
      // La propuesta de relleno para TODAS las secciones: la pantalla decide
      // cuáles enseña, y así una sola llamada sirve para las dos mitades.
      relleno: proponerRelleno(SECCIONES.map((s) => s.id)),
    });
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
    const { accion, referencias, seccion } = (await req.json()) as {
      accion?: string;
      referencias?: string[];
      seccion?: string;
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
    if (accion === "publicar") {
      if (!seccion) return NextResponse.json({ error: "Falta la sección" }, { status: 400 });
      return NextResponse.json({ ok: true, ...publicarCandidatos(seccion, referencias) });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error aplicando cambios";
    console.error("[promociones POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
