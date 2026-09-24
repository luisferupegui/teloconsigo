import { NextRequest, NextResponse } from "next/server";
import { loadBusinessProducts, saveBusinessProducts } from "@/lib/products";
import type { BusinessProduct } from "@/lib/products-types";

// ─── El orden de las cards del home ──────────────────────────────────────────
//
// Las vitrinas salían en el orden en que los productos estaban escritos en el
// archivo, que es el orden en que se importaron: nadie lo eligió. El primer
// lugar de la fila es el que más se mira, así que sí importa cuál va ahí, y esa
// decisión es de quien vende, no del importador de listas.
//
// Llega la lista completa de la sección en el orden querido y se numera 0, 1,
// 2… Se reescribe entera a propósito: renumerar solo la card que se movió deja
// huecos y empates que luego resuelve el azar del archivo.
//
// Va en su propia ruta y no en el PATCH de producto porque es UNA operación
// sobre la vitrina, no doce ediciones sueltas: si se guardara producto a
// producto, un fallo a la mitad dejaría el home a medio ordenar.

const CAMPO = {
  destacado:    "ordenDestacado",
  enAccesorios: "ordenAccesorios",
} as const;

const refDe = (p: BusinessProduct) => p.referencia ?? p.slug ?? p.id;

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as { seccion?: string; referencias?: unknown };
    const seccion = String(body.seccion ?? "");

    // hasOwn y no `in`: "constructor" in CAMPO es true, y de ahí saldría un campo
    // que no es ninguna vitrina.
    if (!Object.hasOwn(CAMPO, seccion)) {
      return NextResponse.json({ error: "No conozco esa sección del home." }, { status: 400 });
    }
    if (!Array.isArray(body.referencias) || body.referencias.some((r) => typeof r !== "string")) {
      return NextResponse.json({ error: "Falta el orden de las cards." }, { status: 400 });
    }

    const campo = CAMPO[seccion as keyof typeof CAMPO];
    const posicion = new Map<string, number>();
    (body.referencias as string[]).forEach((ref, i) => posicion.set(ref, i));

    const productos = loadBusinessProducts();
    let numerados = 0;
    for (const p of productos) {
      const i = posicion.get(refDe(p));
      if (i === undefined) continue;
      (p as Record<string, unknown>)[campo] = i;
      numerados++;
    }

    // Ninguna coincidencia significa que la pantalla habla de un catálogo que ya
    // no es este —otra sesión borró esos productos, por ejemplo—. Guardar sería
    // escribir números sobre nada.
    if (numerados === 0) {
      return NextResponse.json(
        { error: "No reconocí ninguna de esas cards. Recarga la página e inténtalo de nuevo." },
        { status: 409 },
      );
    }

    saveBusinessProducts(productos);
    return NextResponse.json({ ok: true, ordenadas: numerados });
  } catch (err) {
    console.error("[home-orden PUT]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
