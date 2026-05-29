import "server-only";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import type { Product, BusinessProduct } from "./products-types";

export type { Product, BusinessProduct } from "./products-types";
export { formatCOP, slugify } from "./products-types";

const DATA_FILE = path.join(process.cwd(), "data", "products.json");

export function loadProducts(): Product[] {
  try {
    if (!existsSync(DATA_FILE)) return [];
    const raw = readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Product[];
  } catch {
    return [];
  }
}

export function saveProducts(products: Product[]) {
  writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), "utf-8");
}

// Compat: exportamos el array para componentes existentes (server-side).
export const products: Product[] = loadProducts();

export const getAllProducts = () => loadProducts();
export const getProductBySlug = (slug: string) =>
  loadProducts().find((p) => p.slug === slug);
export const getProductsByCategory = (categoria: string) =>
  loadProducts().filter((p) => p.categoria === categoria);
export const getFeaturedProducts = () =>
  loadProducts().filter((p) => p.destacado);
export const getProductById = (id: string) =>
  loadProducts().find((p) => p.id === id);

// ─── Business / Corporate catalog ────────────────────────────────────────────
const BUSINESS_FILE = path.join(process.cwd(), "data", "products-business.json");

export function loadBusinessProducts(): BusinessProduct[] {
  try {
    if (!existsSync(BUSINESS_FILE)) return [];
    const raw = readFileSync(BUSINESS_FILE, "utf-8");
    return JSON.parse(raw) as BusinessProduct[];
  } catch {
    return [];
  }
}

export function getBusinessByUseCase(usoCaso: BusinessProduct["usoCaso"]) {
  return loadBusinessProducts().filter((p) => p.usoCaso === usoCaso);
}

export function getBusinessByCategoria(cat: BusinessProduct["categoria"]) {
  return loadBusinessProducts().filter((p) => p.categoria === cat);
}

export function getPrecioMinimo(usoCaso: BusinessProduct["usoCaso"]): number | null {
  const items = getBusinessByUseCase(usoCaso).map((p) => p.precioDesde).filter((v): v is number => v !== null);
  return items.length ? Math.min(...items) : null;
}

// ─── Legacy helpers ───────────────────────────────────────────────────────────
export function nextId(): string {
  const list = loadProducts();
  const max = list.reduce(
    (acc, p) => Math.max(acc, parseInt(p.id, 10) || 0),
    0,
  );
  return String(max + 1);
}
