import { NextResponse } from "next/server";
import { loadActiveProducts, loadMargins, withMargins } from "@/lib/supplier-catalog";

export const dynamic = "force-dynamic";

// Solo productos de listas ACTIVAS, con margen aplicado.
export async function GET() {
  const products = loadActiveProducts();
  const margins = loadMargins();
  return NextResponse.json(withMargins(products, margins));
}
