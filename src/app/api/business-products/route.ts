import { NextResponse } from "next/server";
import { loadBusinessProducts } from "@/lib/products";
import { resolveProductImage } from "@/lib/product-images";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = loadBusinessProducts().map((p) => ({
    ...p,
    imageUrl: resolveProductImage(p.referencia ?? p.slug, "card"),
  }));
  return NextResponse.json(products);
}
