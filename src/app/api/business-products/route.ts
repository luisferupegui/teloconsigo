import { NextResponse } from "next/server";
import { loadPublishedBusinessProducts } from "@/lib/products";
import { resolveProductImage } from "@/lib/product-images";
import { rutaProducto } from "@/lib/seo";

export const dynamic = "force-dynamic";

// Catálogo público. Es el endpoint que anuncia `/.well-known/api-catalog`, así
// que sale SOLO lo publicado: antes devolvía `loadBusinessProducts()`, es decir
// también los borradores que el admin tenía despublicados. Hoy no hay ninguno,
// pero el día que se prepare un lanzamiento estaría filtrándose.
export async function GET() {
  const products = loadPublishedBusinessProducts().map((p) => ({
    ...p,
    imageUrl: resolveProductImage(p.referencia ?? p.slug, "card"),
    url: rutaProducto(p),
  }));
  return NextResponse.json(products);
}
