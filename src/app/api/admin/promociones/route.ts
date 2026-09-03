import { NextRequest, NextResponse } from "next/server";
import {
  analizarPromociones,
  aplicarPrecios,
  quitarDePromocion,
} from "@/lib/promociones-sync";
import { proponerRelleno, publicarCandidatos, verificarUbicacion, SECCIONES } from "@/lib/promociones-relleno";

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
      // Publicados que están en la sección equivocada: un accesorio colado
      // entre las estaciones de trabajo rompe la promesa de la sección.
      malUbicados: verificarUbicacion(),
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

    // La actualización mensual completa: no recibe referencias porque no elige
    // nada a mano, aplica lo que el análisis y la propuesta ya calcularon.
    //
    // NO retira nada, y es a propósito. Un producto que se cayó de las listas no
    // es un producto que no se pueda vender: se consigue por web —Falabella,
    // Éxito, el mayorista de turno— y esa es media tienda. Retirar sigue siendo
    // una decisión aparte, de quien mira.
    if (accion === "refrescar") {
      const analisis = analizarPromociones();
      const actualizados = aplicarPrecios(analisis.repreciar.map((r) => r.referencia));

      let publicados = 0;
      const secciones: string[] = [];
      for (const s of proponerRelleno(SECCIONES.map((x) => x.id))) {
        if (s.candidatos.length === 0) continue;
        const r = publicarCandidatos(s.id, s.candidatos.map((c) => c.referencia));
        if (r.publicados > 0) { publicados += r.publicados; secciones.push(s.nombre); }
      }
      return NextResponse.json({ ok: true, actualizados, publicados, secciones });
    }

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
