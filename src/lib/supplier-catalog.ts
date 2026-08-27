import "server-only";
import fs from "fs";
import path from "path";

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

// ─── De la categoría de la LISTA a la categoría de PRECIO ────────────────────
//
// Las listas de proveedor archivan con su propia nomenclatura ("all-in-one",
// "perifericos", "tableta", "software"…) mientras que los márgenes del panel
// (Admin → Precios) usan la taxonomía de la tienda. Cuando una no encajaba con la
// otra, `margins[categoria]` era `undefined` y el producto caía en el margen
// "default" (35%) SIN QUE NADIE LO VIERA: la categoría tampoco salía en el panel,
// porque el panel solo lista las claves que ya están en margins.json.
//
// El daño era real y siempre en la misma dirección: 25 todo-en-uno y 5 torres de
// marca —computadores completos, margen 20%— se cotizaban al 35%, y lo mismo las
// 12 tabletas. El cliente veía un precio más alto que el del equipo equivalente
// de la categoría "escritorio".
//
// La categoría GUARDADA no se toca: sigue diciendo "all-in-one" porque de ahí sale
// el FORMATO del equipo (torre / AIO / portátil), que no es lo mismo que el margen.
const ALIAS_MARGEN: Record<string, string> = {
  "all-in-one":           "escritorio",
  "todo-en-uno":          "escritorio",
  "pc-equipos-de-marca":  "escritorio",
  "tableta":              "tablet",
  "perifericos":          "accesorios",
  "camara":               "streaming",
  "software":             "licencia",
  "fuente":               "fuente-poder",
  "psu":                  "fuente-poder",
  "grafica":              "tarjeta-grafica",
  "tarjeta-video":        "tarjeta-grafica",
  "proteccion-electrica": "proteccion",
  "ups":                  "proteccion",
};

// Dentro de "software" conviven dos márgenes distintos del panel: las licencias de
// Microsoft (25%) y los antivirus (35%). Con el nombre a la vista se distinguen.
const ES_ANTIVIRUS = /\b(antivirus|kaspersky|bitdefender|eset|norton|mcafee|avast|small business security|endpoint)\b/i;

/** Clave de margen que le corresponde a un producto: la categoría tal cual cuando
 *  el panel la conoce, y su equivalente cuando la lista la nombra de otra forma.
 *  `nombre` solo desempata dentro de una misma categoría. */
export function categoriaMargen(categoria: string, nombre?: string): string {
  const c = (categoria ?? "").toLowerCase().trim();
  if (c === "software" && nombre && ES_ANTIVIRUS.test(nombre)) return "antivirus";
  return ALIAS_MARGEN[c] ?? c;
}

export function applyMargin(costPrice: number, categoria: string, margins: Margins, nombre?: string): number {
  const margin = margins[categoriaMargen(categoria, nombre)] ?? margins.default ?? 0.35;
  return Math.ceil((costPrice * (1 + margin)) / 1000) * 1000;
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
