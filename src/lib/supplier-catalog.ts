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
  /** Página del PDF donde está impreso, cuando el producto llegó sin precio.
   *  Es lo que evita tener que buscarlo a mano en un documento de 33 páginas. */
  paginaPdf?: number;
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

// ─── Repetidos entre listas ─────────────────────────────────────────────────
//
// "Repetido" son cuatro cosas distintas y solo una se resuelve descartando:
//
//   A. Mismo nombre, MISMA lista, precio distinto. Los seis "Ryzen 5 5600GT +
//      Monitor 23,8"" de Compuoriente entre $1.899.000 y $2.049.000 no son el
//      mismo producto: cambian el chasis y la board. Se quedan los seis.
//   B. Misma referencia, MISMO proveedor, listas de fechas distintas. Es el
//      precio de siempre, actualizado. Manda el de la lista más nueva.
//   C. Mismo producto en proveedores distintos. Manda el más barato, que es
//      una decisión de abastecimiento y ya la toma el buscador.
//   D. Repetido literal dentro de una lista. Se descarta al leer el documento.
//
// Aquí se resuelve SOLO el caso B, y hacía falta: sin esto, con la lista de
// junio y la de agosto activas a la vez, el buscador ordenaba por costo y ganaba
// junio por ser más barata. Se cotizaba un precio que el proveedor ya no sostiene.

/** La identidad de un producto entre listas. La referencia manda cuando la hay:
 *  es lo único que el proveedor mantiene estable de un mes al siguiente, porque
 *  el nombre lo reescriben. */
function claveDeProducto(p: SupplierProduct): string {
  const ref = (p.referencia ?? "").trim().toUpperCase();
  if (ref.length >= 4) return `ref:${ref}`;
  return `nom:${p.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim()}`;
}

/** Productos de todas las listas ACTIVAS, aplanados y con contexto de lista.
 *
 *  Cuando el mismo producto del mismo proveedor está en varias listas activas,
 *  solo cuenta el de la más reciente. Las otras no se borran —la lista sigue
 *  ahí y se puede consultar—, simplemente dejan de competir por precio. */
export function loadActiveProducts(): ActiveProduct[] {
  const activas = loadLists().filter((l) => l.activa);

  // Fecha de cada lista, para saber cuál es la vigente de cada proveedor.
  const fechaDe = new Map(activas.map((l) => [l.id, Date.parse(l.fecha) || 0]));

  const todos: ActiveProduct[] = activas.flatMap((l) =>
    l.productos.map((p) => ({ ...p, listaId: l.id, listaNombre: l.nombre })),
  );

  // Por proveedor y producto, cuál es la lista más nueva que lo trae.
  const vigente = new Map<string, number>();
  for (const p of todos) {
    const clave = `${claveProveedor(p.proveedor)}|${claveDeProducto(p)}`;
    const fecha = fechaDe.get(p.listaId) ?? 0;
    if (fecha > (vigente.get(clave) ?? -1)) vigente.set(clave, fecha);
  }

  // Se conserva todo lo que venga de la lista vigente. En plural a propósito:
  // dentro de una misma lista puede haber varios productos con la misma clave
  // (el caso A) y esos no se tocan.
  return todos.filter(
    (p) => (fechaDe.get(p.listaId) ?? 0) === vigente.get(`${claveProveedor(p.proveedor)}|${claveDeProducto(p)}`),
  );
}

// ─── Qué mirar antes de guardar una lista ───────────────────────────────────
//
// Revisar una lista entera no se hace: son 580 productos al mes. Pero tampoco
// hace falta, porque el riesgo no está repartido. Comparando la lista de junio
// de Ledacom con la de agosto: 62 productos subieron de precio y suman
// $9.057.253 de diferencia, y los DIEZ primeros por pesos concentran el 72% de
// esa cifra. Los veinte primeros, el 91%.
//
// Así que el aviso se ordena POR PESOS, no por porcentaje ni por cantidad. Por
// porcentaje el primero de la lista es un router de $143.900 y el Asus TUF de
// $2.061.000 queda enterrado; por pesos sale primero lo que de verdad cuesta
// dinero equivocarse.
//
// El porcentaje sí sirve, pero para otra cosa: un salto desproporcionado suele
// ser un error de lectura, no una subida. Por eso se marca aparte.

/** Cuánto tiene que moverse un precio para que valga la pena mirarlo. Por debajo
 *  de esto es la deriva normal de mes a mes: 46 de las 62 subidas medidas se
 *  movieron menos del 20% y avisar de todas sería ruido. */
const SALTO_MINIMO_PESOS = 50_000;
const SALTO_MINIMO_PORCENTAJE = 0.15;

/** Un salto tan grande que probablemente no es una subida sino una lectura mala
 *  ("Router inalámbrico N", de $66.000 a $209.900). */
const SALTO_SOSPECHOSO = 0.6;

export type AvisoImportacion = {
  tipo: "sin-precio" | "salto-de-precio";
  nombre: string;
  referencia: string;
  precio: number;
  precioAnterior?: number;
  diferencia?: number;
  porcentaje?: number;
  /** El salto es tan grande que conviene comprobarlo contra el PDF. */
  sospechoso?: boolean;
  listaAnterior?: string;
};

/**
 * Lo que hay que mirar de una lista recién leída, ANTES de guardarla: los
 * productos sin precio y los que cambiaron de precio de forma llamativa
 * respecto a la última lista del mismo proveedor.
 *
 * Se llama al analizar, no en una pantalla aparte, porque el momento de revisar
 * es cuando ya se tiene el documento delante.
 */
export function avisosDeImportacion(
  productos: { nombre: string; referencia?: string; precio_costo: number }[],
  proveedor: string,
): AvisoImportacion[] {
  const avisos: AvisoImportacion[] = [];

  for (const p of productos) {
    if (!(p.precio_costo > 0)) {
      avisos.push({
        tipo: "sin-precio",
        nombre: p.nombre,
        referencia: p.referencia ?? "",
        precio: 0,
      });
    }
  }

  // La lista más reciente de este proveedor es contra la que se compara.
  const prov = claveProveedor(proveedor);
  const anterior = loadLists()
    .filter((l) => claveProveedor(l.proveedor) === prov)
    .sort((a, b) => (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0))[0];

  if (anterior) {
    const previos = new Map<string, SupplierProduct>();
    for (const q of anterior.productos) previos.set(claveDeProducto(q), q);

    for (const p of productos) {
      if (!(p.precio_costo > 0)) continue;
      const antes = previos.get(claveDeProducto({ ...p, id: "", marca: "", categoria: "", proveedor: prov, importedAt: "" }));
      if (!antes?.precio_costo) continue;

      const diferencia = p.precio_costo - antes.precio_costo;
      const porcentaje = diferencia / antes.precio_costo;
      if (Math.abs(diferencia) < SALTO_MINIMO_PESOS) continue;
      if (Math.abs(porcentaje) < SALTO_MINIMO_PORCENTAJE) continue;

      avisos.push({
        tipo: "salto-de-precio",
        nombre: p.nombre,
        referencia: p.referencia ?? "",
        precio: p.precio_costo,
        precioAnterior: antes.precio_costo,
        diferencia,
        porcentaje,
        sospechoso: Math.abs(porcentaje) >= SALTO_SOSPECHOSO,
        listaAnterior: anterior.nombre,
      });
    }
  }

  // Sin precio primero —no se puede cotizar sin eso— y después por PESOS, que
  // es lo que ordena el riesgo de verdad.
  return avisos.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === "sin-precio" ? -1 : 1;
    return Math.abs(b.diferencia ?? 0) - Math.abs(a.diferencia ?? 0);
  });
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

/** El nombre del proveedor como se escribe: "compuoriente" → "Compuoriente".
 *
 *  Solo toca la primera letra y deja el resto como lo escribió quien importa,
 *  para no estropear lo que ya venía bien puesto ("Grupo Ledacom", "HP", "SAS").
 *
 *  Es un nombre para leer, no una clave: los ids y las comparaciones van en
 *  minúscula aparte, así que escribirlo distinto no rompe el emparejamiento
 *  entre listas del mismo proveedor. */
export function nombreDeProveedor(entrada: string): string {
  const limpio = entrada.trim().replace(/\s{2,}/g, " ");
  return limpio ? limpio[0].toUpperCase() + limpio.slice(1) : "";
}

/** La forma con la que se compara y se construyen los ids. */
export const claveProveedor = (p: string) => p.trim().toLowerCase();

export function generateProductId(
  nombre: string,
  proveedor: string,
  referencia?: string,
): string {
  // El id va SIEMPRE en minúscula aunque el proveedor se muestre capitalizado:
  // es una clave, y acaba en enlaces.
  const prov = claveProveedor(proveedor);
  if (referencia) return `${prov}-${referencia}`;
  const slug = nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
  return `${prov}-${slug}-${Date.now()}`;
}

export function generateListId(proveedor: string): string {
  return `lista-${claveProveedor(proveedor)}-${Date.now()}`;
}
