import "server-only";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import type { Product, BusinessProduct } from "./products-types";
import { resolveProductImage } from "./product-images";
import { HOME_MIN, HOME_MAX } from "./products-types";

export type { Product, BusinessProduct } from "./products-types";
export { formatCOP, slugify } from "./products-types";
export { HOME_MIN, HOME_MAX };

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
export const getProductById = (id: string) =>
  loadProducts().find((p) => p.id === id);

// ─── Business / Corporate catalog ────────────────────────────────────────────
const BUSINESS_FILE = path.join(process.cwd(), "data", "products-business.json");

export function saveBusinessProducts(products: BusinessProduct[]) {
  writeFileSync(BUSINESS_FILE, JSON.stringify(products, null, 2), "utf-8");
}

export function loadBusinessProducts(): BusinessProduct[] {
  try {
    if (!existsSync(BUSINESS_FILE)) return [];
    const raw = readFileSync(BUSINESS_FILE, "utf-8");
    return JSON.parse(raw) as BusinessProduct[];
  } catch {
    return [];
  }
}

// Solo productos visibles en la web (toggle `publicado`). Default: visible.
export function loadPublishedBusinessProducts(): BusinessProduct[] {
  return loadBusinessProducts().filter((p) => p.publicado !== false);
}

// ─── Cards del home (Destacados / Accesorios & Esenciales) ────────────────────
// Reglas: máximo 12 por sección; mínimo 4 (si hay menos elegidos, se auto-rellena
// con publicados — priorizando los que tienen imagen y, opcionalmente, ciertos
// segmentos). Así el home nunca se ve vacío ni roto.
const homeRef = (p: BusinessProduct) => p.referencia ?? p.slug ?? p.id;

export function pickHomeCards(
  all: BusinessProduct[],
  isChosen: (p: BusinessProduct) => boolean,
  opts: { preferSegmentos?: string[]; exclude?: Set<string> } = {},
): BusinessProduct[] {
  const chosen = all.filter(isChosen).slice(0, HOME_MAX);
  if (chosen.length >= HOME_MIN) return chosen;

  // Backfill hasta el mínimo, sin repetir lo ya elegido ni lo excluido.
  const used = new Set<string>([...chosen.map(homeRef), ...(opts.exclude ?? [])]);
  const prefer = opts.preferSegmentos ?? [];
  const hasImg = (p: BusinessProduct) =>
    resolveProductImage(homeRef(p), "card") != null;
  const pool = all.filter((p) => !used.has(homeRef(p)));
  const rank = (p: BusinessProduct) =>
    (hasImg(p) ? 0 : 10) + (prefer.includes(p.segmento ?? "") ? -1 : 0);
  pool.sort((a, b) => rank(a) - rank(b));

  return [...chosen, ...pool.slice(0, HOME_MIN - chosen.length)];
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
