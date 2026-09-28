import { NextRequest, NextResponse } from "next/server";
import { loadBusinessProducts, saveBusinessProducts } from "@/lib/products";
import type { BusinessProduct } from "@/lib/products-types";
import { POST as preguntarleAAndrea } from "@/app/api/asesor/route";

// ─── Revisión de precios de la vitrina ────────────────────────────────────────
//
// El dólar se mueve y los costos de las listas se mueven con él; el precio impreso en una
// card no se mueve solo. Cada tres o cuatro semanas hay que preguntarle a la realidad si
// las cards siguen pidiendo lo que valen las cosas, y esa revisión se hacía a mano, card
// por card, desde la consola.
//
// LA PREGUNTA SE LE HACE A ANDREA, POR SU CAMINO DE VERDAD. No se recalcula el precio
// aquí con una fórmula propia: se le pide la cotización tal como se la pide un cliente que
// pincha esa card —mismo contexto, mismas listas, mismas búsquedas, mismos filtros— y se
// compara con lo publicado. Cualquier otra medida sería la opinión de este archivo; la que
// importa es la que va a recibir el cliente.
//
// De ahí sale el valor real de la herramienta: además de los precios, delata las cards que
// Andrea no sabe cotizar. Una card que deriva al equipo es una venta que no se cierra, y
// desde el panel no se veía.
//
// UNA CARD POR PETICIÓN. Cotizar veinte lleva varios minutos —cada una son búsquedas web y
// una pasada del modelo—, así que el bucle lo lleva el navegador: así se ve el avance, se
// puede parar a mitad y ninguna petición se queda colgada esperando el total.
//
// GET  → las cards de la vitrina, con su precio publicado. No gasta créditos.
// POST → cotiza UNA card (la del `referencia` que llega) y devuelve qué dijo Andrea.
// PUT  → escribe los precios que el admin haya aprobado. Nada se guarda sin que él lo diga.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const refDe = (p: BusinessProduct) => p.referencia ?? p.slug ?? p.id;
const precioDe = (p: BusinessProduct) => p.precioDesde ?? p.precio ?? null;

/** Las cards tal como salen en el home, en su orden. */
function vitrina(productos: BusinessProduct[]) {
  const seccion = (
    filtro: (p: BusinessProduct) => boolean,
    orden: "ordenDestacado" | "ordenAccesorios",
    nombre: "destacado" | "accesorio",
  ) =>
    productos
      .filter(filtro)
      .sort((a, b) => ((a[orden] as number) ?? 99) - ((b[orden] as number) ?? 99))
      .map((p) => ({
        referencia: refDe(p),
        nombre: p.nombre,
        seccion: nombre,
        publicado: precioDe(p),
      }));

  return [
    ...seccion((p) => !!p.destacado && p.publicado !== false, "ordenDestacado", "destacado"),
    ...seccion((p) => !!p.enAccesorios && p.publicado !== false, "ordenAccesorios", "accesorio"),
  ];
}

export async function GET() {
  try {
    return NextResponse.json({ cards: vitrina(loadBusinessProducts()) });
  } catch (err) {
    console.error("[precios-vitrina GET]", err);
    return NextResponse.json({ error: "No se pudo leer la vitrina" }, { status: 500 });
  }
}

/** El separador con el que el asesor divide sus globos de chat. */
const SEP = String.fromCharCode(30);

/** Los precios en pesos que aparecen en una respuesta de Andrea, y los plazos de entrega.
 *
 *  Se leen del texto porque es el texto lo que se quiere medir: lo que el cliente va a ver
 *  escrito. Siete dígitos o más con separadores de miles ("$4.688.000 COP") — así no se
 *  cuela una cantidad ni un porcentaje. */
function preciosDelTexto(texto: string): { precios: number[]; entregas: string[] } {
  const precios = [...texto.matchAll(/\$\s?([\d.]{7,})\s*COP/g)]
    .map((m) => Number(m[1].replace(/\./g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  const entregas = [...new Set([...texto.matchAll(/(\d+ a \d+ días)/g)].map((m) => m[1]))];
  return { precios, entregas };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { referencia?: unknown };
    const referencia = String(body.referencia ?? "");
    const card = loadBusinessProducts().find((p) => refDe(p) === referencia);
    if (!card) {
      return NextResponse.json({ error: "Esa card ya no está en el catálogo." }, { status: 404 });
    }

    const publicado = precioDe(card);
    // El mismo cuerpo que manda el front cuando el cliente pincha "Cotiza ya mismo": el
    // contexto de la card y `autoInicio`, sin mensaje del cliente. Si se le preguntara de
    // otra forma se estaría midiendo otra conversación.
    const peticion = new Request("http://localhost/api/asesor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "assistant", content: `Vi que te interesa el ${card.nombre}.` }],
        contexto: { producto: card.nombre, ref: referencia, precio: String(publicado ?? "") },
        autoInicio: true,
      }),
    });

    const res = await preguntarleAAndrea(peticion);
    const texto = (await res.text()).replaceAll("﻿", "").split(SEP).join("\n");
    const { precios, entregas } = preciosDelTexto(texto);

    // Deriva al equipo: Andrea da el teléfono en vez de un precio. Es el peor resultado
    // posible para una card —el cliente pinchó para comprar— y por eso se reporta aparte.
    const deriva = /6686577|ventas@teloconsigo/.test(texto) && precios.length === 0;
    const cotizado = precios.length > 0 ? Math.min(...precios) : null;

    return NextResponse.json({
      referencia,
      nombre: card.nombre,
      publicado,
      cotizado,
      precios,
      entrega: entregas[0] ?? null,
      deriva,
      // Sirve para entender un número raro sin tener que repetir la cotización a mano.
      respuesta: texto.slice(0, 1500),
    });
  } catch (err) {
    console.error("[precios-vitrina POST]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `No se pudo cotizar: ${msg}` }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as { cambios?: unknown };
    const cambios = Array.isArray(body.cambios) ? body.cambios : null;
    if (!cambios || cambios.length === 0) {
      return NextResponse.json({ error: "No llegó ningún precio que cambiar." }, { status: 400 });
    }

    const pedidos = new Map<string, number>();
    for (const c of cambios) {
      const ref = String((c as { referencia?: unknown })?.referencia ?? "");
      const precio = Number((c as { precio?: unknown })?.precio);
      // Un precio de cero o negativo publicaría una card regalada; uno absurdo, una card
      // que nadie va a pinchar. Se para aquí y no en la pantalla, que es lo único que un
      // error de tecleo no puede saltarse.
      if (!ref || !Number.isFinite(precio) || precio < 1000 || precio > 200_000_000) {
        return NextResponse.json({ error: `Precio inválido para ${ref || "una card"}.` }, { status: 400 });
      }
      pedidos.set(ref, Math.round(precio));
    }

    const productos = loadBusinessProducts();
    const actualizadas: string[] = [];
    for (const p of productos) {
      const nuevo = pedidos.get(refDe(p));
      if (nuevo === undefined) continue;
      // Los dos campos, siempre juntos: `precioDesde` es el que pinta la card y `precio` el
      // que usa el resto del sitio. Dejar uno viejo es publicar dos precios del mismo
      // producto, que es justo lo que no puede pasar.
      p.precio = nuevo;
      p.precioDesde = nuevo;
      actualizadas.push(refDe(p));
    }

    if (actualizadas.length === 0) {
      return NextResponse.json(
        { error: "No reconocí ninguna de esas cards. Recarga la página e inténtalo de nuevo." },
        { status: 409 },
      );
    }

    saveBusinessProducts(productos);
    console.warn(`[precios-vitrina] ${actualizadas.length} card(s) con precio nuevo: ${actualizadas.join(", ")}`);
    return NextResponse.json({ ok: true, actualizadas: actualizadas.length });
  } catch (err) {
    console.error("[precios-vitrina PUT]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
