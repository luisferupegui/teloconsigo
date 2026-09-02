import { NextRequest, NextResponse } from "next/server";
import { loadBusinessProducts, saveBusinessProducts, HOME_MAX } from "@/lib/products";
import type { BusinessProduct } from "@/lib/products-types";
import { slugify } from "@/lib/products-types";

const ALLOWED_FIELDS = [
  "nombre", "marca", "precio", "precioDesde", "precioIvaIncluido",
  "descripcionUso", "usoCaso", "categoria", "segmento", "publicado",
  "destacado", "enAccesorios", "enPromocion",
] as const;

// Secciones del home con tope de capacidad (máx 12 cards c/u)
const HOME_SECTIONS = {
  destacado:    "Productos Destacados",
  enAccesorios: "Accesorios & Esenciales",
} as const;

// ─── Sin precio no se publica ────────────────────────────────────────────────
//
// La ficha de producto pinta el precio con `{precio && …}`: si no hay, no
// muestra nada y el producto sale a la tienda como si todo estuviera bien. Un
// cliente lo pide, Andrea lo cotiza, y no hay cifra detrás.
//
// Pasa de verdad. Algunas listas traen el precio impreso DENTRO de una imagen
// del PDF y el lector no puede leerlo: seis productos de Compuoriente y cuatro
// de Compumax llegan sin precio, marcados para revisión. Publicar uno de esos
// era un clic.
//
// La regla se aplica sobre el ESTADO RESULTANTE y no sobre el campo que se
// tocó, para que dé igual por dónde se entre: crear ya publicado, activar
// "publicado" después, destacarlo, meterlo en promoción, o borrarle el precio a
// uno que ya estaba publicado. Todos acaban en la misma comprobación.
//
// Lo que NO hace: impedir guardarlo. Un producto sin precio se puede crear y
// editar sin publicar, que es como se deja pendiente mientras se le pregunta el
// precio al proveedor.

/** Las banderas que ponen un producto delante de un cliente. */
const VITRINAS = ["publicado", "destacado", "enAccesorios", "enPromocion"] as const;

const tienePrecio = (p: Partial<BusinessProduct>) =>
  (typeof p.precio === "number" && p.precio > 0) ||
  (typeof p.precioDesde === "number" && p.precioDesde > 0);

/** El motivo por el que este producto no puede estar visible, o `null`. */
function bloqueoPorFaltaDePrecio(p: Partial<BusinessProduct>): string | null {
  if (tienePrecio(p)) return null;
  const visibles = VITRINAS.filter((f) => p[f]);
  if (visibles.length === 0) return null;
  const donde = visibles.includes("publicado")
    ? "publicar"
    : `poner en ${visibles.join(", ")}`;
  return `"${p.nombre ?? "El producto"}" no tiene precio, así que no se puede ${donde}. Complétalo primero, o guárdalo sin publicar mientras se lo pides al proveedor.`;
}

function homeLimitError(products: BusinessProduct[], flag: "destacado" | "enAccesorios"): string | null {
  const count = products.filter((p) => (p as Record<string, unknown>)[flag]).length;
  return count >= HOME_MAX
    ? `Sección "${HOME_SECTIONS[flag]}" llena (${HOME_MAX}/${HOME_MAX}). Quita una card antes de agregar otra.`
    : null;
}

// PATCH — update an existing product
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { referencia: string } & Record<string, unknown>;
    const { referencia, ...updates } = body;

    if (!referencia) {
      return NextResponse.json({ error: "Falta referencia" }, { status: 400 });
    }

    const products = loadBusinessProducts();
    const idx = products.findIndex(
      (p) => (p.referencia ?? (p as unknown as Record<string, string>).id) === referencia
    );

    if (idx === -1) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const safe: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in updates) safe[key] = updates[key];
    }

    // Tope de 12 cards por sección del home (solo al ACTIVAR una nueva)
    for (const flag of ["destacado", "enAccesorios"] as const) {
      const willEnable = safe[flag] === true;
      const wasEnabled = Boolean((products[idx] as Record<string, unknown>)[flag]);
      if (willEnable && !wasEnabled) {
        const err = homeLimitError(products, flag);
        if (err) return NextResponse.json({ error: err }, { status: 409 });
      }
    }

    // Se comprueba cómo QUEDA el producto, no lo que traía el PATCH: así también
    // se atrapa borrarle el precio a uno que ya estaba publicado.
    const resultante = { ...products[idx], ...safe } as BusinessProduct;
    const bloqueo = bloqueoPorFaltaDePrecio(resultante);
    if (bloqueo) return NextResponse.json({ error: bloqueo }, { status: 409 });

    products[idx] = resultante;
    saveBusinessProducts(products);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[product PATCH]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — create a new product (from PDF import or manual)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;

    if (!body.nombre || !body.marca) {
      return NextResponse.json({ error: "Nombre y marca son obligatorios" }, { status: 400 });
    }

    const rawRef = typeof body.referencia === "string"
      ? body.referencia.replace(/[^a-zA-Z0-9._\-]/g, "").trim()
      : "";
    const referencia = rawRef || `manual-${Date.now()}`;
    if (loadBusinessProducts().some((p) => p.referencia === referencia)) {
      return NextResponse.json({ error: "Ya existe un producto con esa referencia." }, { status: 409 });
    }

    const newProduct: BusinessProduct = {
      referencia,
      nombre:            String(body.nombre),
      marca:             String(body.marca),
      categoria:         (body.categoria as BusinessProduct["categoria"]) ?? "accesorio",
      usoCaso:           (body.usoCaso   as BusinessProduct["usoCaso"])   ?? "accesorio",
      segmento:          (body.segmento  as BusinessProduct["segmento"])  ?? "accesorios",
      publicado:         body.publicado === undefined ? true : Boolean(body.publicado),
      precio:            typeof body.precio     === "number" ? body.precio     : null,
      precioDesde:       typeof body.precioDesde === "number" ? body.precioDesde : null,
      precioIvaIncluido: Boolean(body.precioIvaIncluido),
      proveedor:         "manual",
      specs:             {},
      descripcionUso:    typeof body.descripcionUso === "string" ? body.descripcionUso : "",
      destacado:         Boolean(body.destacado),
      enAccesorios:      Boolean(body.enAccesorios),
      enPromocion:       Boolean(body.enPromocion),
      // required by type but derived
      id:   referencia,
      slug: slugify(String(body.nombre)),
    };

    const bloqueo = bloqueoPorFaltaDePrecio(newProduct);
    if (bloqueo) return NextResponse.json({ error: bloqueo }, { status: 409 });

    const products = loadBusinessProducts();
    for (const flag of ["destacado", "enAccesorios"] as const) {
      if (Boolean(body[flag])) {
        const err = homeLimitError(products, flag);
        if (err) return NextResponse.json({ error: err }, { status: 409 });
      }
    }
    products.push(newProduct);
    saveBusinessProducts(products);

    return NextResponse.json({ ok: true, referencia });
  } catch (err) {
    console.error("[product POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE — borra un producto del catálogo publicado.
// Faltaba: desde el panel solo se podía crear y editar, así que un producto importado
// por error se quedaba para siempre (o había que editar el JSON a mano).
export async function DELETE(req: NextRequest) {
  try {
    const { referencia } = (await req.json()) as { referencia?: string };
    const ref = String(referencia ?? "").trim();
    if (!ref) return NextResponse.json({ error: "Falta la referencia del producto." }, { status: 400 });

    const products = loadBusinessProducts();
    const idx = products.findIndex(
      (p) => p.referencia === ref || p.slug === ref || p.id === ref,
    );
    if (idx === -1) return NextResponse.json({ error: "No encontré ese producto." }, { status: 404 });

    const [borrado] = products.splice(idx, 1);
    saveBusinessProducts(products);
    return NextResponse.json({ ok: true, nombre: borrado.nombre });
  } catch (err) {
    console.error("[product DELETE]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
