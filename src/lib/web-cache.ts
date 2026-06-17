import "server-only";
import fs from "fs";
import path from "path";

// Caché PERSISTENTE de cotizaciones web (Serper/IA) → costo cero en repeticiones.
// - Por CONSULTA: evita volver a buscar lo mismo (mismo query) durante el TTL.
// - Por PRODUCTO (nombre/modelo): lo usa registrarPedido para recuperar el costo.
// Refresco "lazy": una entrada vencida se vuelve a pedir SOLO cuando alguien la
// consulta de nuevo (no se gasta Serper en productos que nadie pide).

const CACHE_PATH = path.join(process.cwd(), "data", "web-cache.json");
export const WEB_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días

/** Producto cotizado (lo que cotizar_web devuelve a Andrea). */
export type QuoteProducto = {
  nombre?: string; marca?: string; modelo?: string; specs?: string;
  precioCOP: number; costoUSD: number; costoTotalCOP: number; fuente: string;
  origen?: "us" | "co"; // "co" = conseguido en Colombia web; "us" = importado EE.UU.
};

/** Comparación de mercado local (solo admin). */
export type LocalData = {
  precioMercadoLocal?: number;
  fuenteLocal?: string;
  cantidadListados?: number;
  siteLocal?: string;
};

/** Entrada por-producto que recupera registrarPedido. */
export type WebQuote = {
  ts: number;
  costoUSD: number;
  urlCompra: string;
  precioCOP: number;
  costoTotalCOP: number;
  origen?: "us" | "co";
} & LocalData;

type QueryEntry = { ts: number; productos: QuoteProducto[] } & LocalData;
type CacheFile = { queries: Record<string, QueryEntry>; products: Record<string, WebQuote> };

function load(): CacheFile {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
    return { queries: raw.queries ?? {}, products: raw.products ?? {} };
  } catch {
    return { queries: {}, products: {} };
  }
}
function save(c: CacheFile) {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(c, null, 2), "utf-8");
  } catch {
    /* best-effort */
  }
}
function prune(c: CacheFile) {
  const now = Date.now();
  for (const k of Object.keys(c.queries)) if (now - c.queries[k].ts > WEB_CACHE_TTL) delete c.queries[k];
  for (const k of Object.keys(c.products)) if (now - c.products[k].ts > WEB_CACHE_TTL) delete c.products[k];
}

export function cacheKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Devuelve el resultado cacheado de una consulta si está FRESCO (< 7 días). */
export function getCachedQuery(consulta: string): QueryEntry | null {
  const e = load().queries[cacheKey(consulta)];
  return e && Date.now() - e.ts < WEB_CACHE_TTL ? e : null;
}

/** Guarda el resultado de una consulta e indexa cada producto por nombre, modelo Y url.
 *  La URL es la clave más estable: no cambia cuando Andrea reformatea el nombre al registrar. */
export function saveQuote(consulta: string, productos: QuoteProducto[], local: LocalData): void {
  const c = load();
  prune(c);
  const ts = Date.now();
  c.queries[cacheKey(consulta)] = { ts, productos, ...local };
  for (const p of productos) {
    const entry: WebQuote = {
      ts, costoUSD: p.costoUSD, urlCompra: p.fuente,
      precioCOP: p.precioCOP, costoTotalCOP: p.costoTotalCOP,
      origen: p.origen, ...local,
    };
    for (const key of [p.modelo, p.nombre, p.fuente]) {
      const norm = key ? cacheKey(key) : "";
      if (norm.length >= 3) c.products[norm] = entry;
    }
  }
  save(c);
}

/** Recupera el costo/precio de un producto (para registrarPedido).
 *  Busca por nombre, modelo, URL de compra (más estable) y fuzzy por nombre. */
export function getWebQuote(nombre: string, modelo?: string, urlCompra?: string): WebQuote | null {
  const c = load();
  const now = Date.now();
  // 1) Exacto: modelo, nombre, url
  for (const key of [modelo, nombre, urlCompra]) {
    const norm = key ? cacheKey(key) : "";
    const e = norm ? c.products[norm] : undefined;
    if (e && now - e.ts < WEB_CACHE_TTL) return e;
  }
  // 2) Fuzzy por nombre (cubre reformateos de Andrea)
  const target = cacheKey(nombre);
  if (target.length >= 6) {
    for (const k of Object.keys(c.products)) {
      const e = c.products[k];
      if (now - e.ts > WEB_CACHE_TTL) continue;
      if (k.length >= 6 && (target.includes(k) || k.includes(target))) return e;
    }
  }
  return null;
}

/** Invalida una consulta/producto (refresco manual) o todo el caché. */
export function invalidateCache(term?: string): number {
  const c = load();
  if (!term) {
    const n = Object.keys(c.queries).length + Object.keys(c.products).length;
    save({ queries: {}, products: {} });
    return n;
  }
  const k = cacheKey(term);
  let n = 0;
  for (const map of [c.queries, c.products] as Record<string, { ts: number }>[]) {
    for (const key of Object.keys(map)) {
      if (key === k || key.includes(k) || k.includes(key)) { delete map[key]; n++; }
    }
  }
  save(c);
  return n;
}
