import "server-only";
import fs from "fs";
import path from "path";
import type { SupplierProductWithMargin } from "./supplier-catalog-client";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type SupplierProduct = {
  id: string;
  nombre: string;
  marca: string;
  categoria: string;
  precio_costo: number;
  proveedor: string;
  referencia?: string;
  specs?: Record<string, string>;
  importedAt: string;
};

/** Una lista de precios = un PDF importado. Se puede activar/desactivar. */
export type SupplierList = {
  id: string;
  nombre: string; // nombre del archivo / lista (ej: "Lista Ledacom Junio 2026.pdf")
  proveedor: string;
  fecha: string; // ISO de cuándo se importó
  paginas: number;
  caracteres: number;
  activa: boolean;
  productos: SupplierProduct[];
};

/** Producto con el contexto de la lista a la que pertenece. */
export type ActiveProduct = SupplierProduct & {
  listaId: string;
  listaNombre: string;
};

export type { SupplierProductWithMargin };

export type Margins = Record<string, number>;

const LISTS_PATH = path.join(process.cwd(), "data", "supplier-lists.json");
const MARGINS_PATH = path.join(process.cwd(), "data", "margins.json");

// ─── Listas ─────────────────────────────────────────────────────────────────

export function loadLists(): SupplierList[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(LISTS_PATH, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const LISTS_BACKUP_PATH = LISTS_PATH + ".bak";

export function saveLists(lists: SupplierList[]): void {
  // Red de seguridad: respalda el estado anterior (si tenía datos) antes de
  // sobrescribir, para poder recuperar listas borradas por error.
  try {
    if (fs.existsSync(LISTS_PATH)) {
      const prev = fs.readFileSync(LISTS_PATH, "utf-8");
      if (prev.trim() && prev.trim() !== "[]") {
        fs.writeFileSync(LISTS_BACKUP_PATH, prev, "utf-8");
      }
    }
  } catch {
    /* el backup es best-effort; no debe impedir el guardado */
  }
  fs.writeFileSync(LISTS_PATH, JSON.stringify(lists, null, 2), "utf-8");
}

/** Restaura las listas desde el último backup. Devuelve cuántas listas recuperó, o null si no hay backup. */
export function restoreListsFromBackup(): number | null {
  try {
    if (!fs.existsSync(LISTS_BACKUP_PATH)) return null;
    const raw = fs.readFileSync(LISTS_BACKUP_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    fs.writeFileSync(LISTS_PATH, JSON.stringify(parsed, null, 2), "utf-8");
    return parsed.length;
  } catch {
    return null;
  }
}

/** Agrega una nueva lista al inicio (la más reciente primero). */
export function addList(list: SupplierList): void {
  const lists = loadLists();
  lists.unshift(list);
  saveLists(lists);
}

/** Activa o desactiva una lista. Devuelve false si no existe. */
export function setListActive(id: string, activa: boolean): boolean {
  const lists = loadLists();
  const idx = lists.findIndex((l) => l.id === id);
  if (idx === -1) return false;
  lists[idx].activa = activa;
  saveLists(lists);
  return true;
}

/** Elimina productos específicos de una lista por sus IDs.
 *  Devuelve { found, deleted } — found=false si la lista no existe. */
export function deleteProductsFromList(
  listId: string,
  productIds: string[],
): { found: boolean; deleted: number } {
  const lists = loadLists();
  const idx = lists.findIndex((l) => l.id === listId);
  if (idx === -1) return { found: false, deleted: 0 };
  const idsSet = new Set(productIds);
  const before = lists[idx].productos.length;
  lists[idx].productos = lists[idx].productos.filter((p) => !idsSet.has(p.id));
  const deleted = before - lists[idx].productos.length;
  saveLists(lists);
  return { found: true, deleted };
}

/** Elimina una lista. Devuelve false si no existía. */
export function deleteList(id: string): boolean {
  const lists = loadLists();
  const next = lists.filter((l) => l.id !== id);
  if (next.length === lists.length) return false;
  saveLists(next);
  return true;
}

/** Productos de todas las listas ACTIVAS, aplanados y con contexto de lista. */
export function loadActiveProducts(): ActiveProduct[] {
  return loadLists()
    .filter((l) => l.activa)
    .flatMap((l) =>
      l.productos.map((p) => ({ ...p, listaId: l.id, listaNombre: l.nombre })),
    );
}

/** Compat: todos los productos de todas las listas (activas o no), aplanados. */
export function loadSupplierCatalog(): SupplierProduct[] {
  return loadLists().flatMap((l) => l.productos);
}

// ─── Márgenes ───────────────────────────────────────────────────────────────

export function loadMargins(): Margins {
  try {
    return JSON.parse(fs.readFileSync(MARGINS_PATH, "utf-8"));
  } catch {
    return { default: 0.35 };
  }
}

export function saveMargins(margins: Margins): void {
  fs.writeFileSync(MARGINS_PATH, JSON.stringify(margins, null, 2), "utf-8");
}

export function applyMargin(costPrice: number, categoria: string, margins: Margins): number {
  const margin = margins[categoria] ?? margins.default ?? 0.35;
  return Math.ceil((costPrice * (1 + margin)) / 1000) * 1000;
}

export function withMargins(
  products: SupplierProduct[],
  margins: Margins,
): SupplierProductWithMargin[] {
  return products.map((p) => ({
    ...p,
    precio_final: applyMargin(p.precio_costo, p.categoria, margins),
    margen: margins[p.categoria] ?? margins.default ?? 0.35,
  }));
}

// ─── Utilidades ─────────────────────────────────────────────────────────────

export function generateProductId(
  nombre: string,
  proveedor: string,
  referencia?: string,
): string {
  if (referencia) return `${proveedor}-${referencia}`;
  const slug = nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
  return `${proveedor}-${slug}-${Date.now()}`;
}

export function generateListId(proveedor: string): string {
  return `lista-${proveedor}-${Date.now()}`;
}
