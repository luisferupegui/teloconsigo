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
  /** Tokens del nombre real del producto, para reencontrarlo cuando Andrea lo
   *  reformatea al registrar el pedido (ver `getWebQuoteFuzzy`). */
  tokens?: string[];
} & LocalData;

type QueryEntry = { ts: number; productos: QuoteProducto[]; tokens?: string[] } & LocalData;
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

// ── Coincidencia por REFORMULACIÓN ────────────────────────────────────────────
//
// La consulta que llega a cotizar_web la REDACTA el modelo, y la redacta distinta
// cada vez ("switch UniFi USW-24-PoE" / "Ubiquiti UniFi USW-24-PoE switch 24 puertos
// PoE gestionable"). Con la clave literal cada intento era un fallo de caché → búsqueda
// nueva → otro listado de Google Shopping → el MISMO producto cotizado a otro precio
// (medido: el mismo USW-24-PoE entre $1.724.000 y $2.519.000 en minutos). Comparando
// por tokens, una reformulación cae en la misma entrada y el precio queda firme el TTL.

const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas", "para", "por",
  "con", "sin", "y", "o", "en", "al", "que", "mi", "me", "su", "lo", "es", "son",
  "necesito", "quiero", "busco", "tengo", "the", "for", "with", "and",
]);

/** Tokens normalizados y significativos de una consulta (sin tildes ni relleno). */
export function tokensConsulta(consulta: string): string[] {
  return consulta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Cuánto se parecen las palabras (sin cifras) de dos consultas: 0 a 1. */
const SIMILITUD_MIN = 0.6;

/** Descompone un token con cifra en magnitud + valor: "24"→(·,24), "250w"→(w,250),
 *  "16gb"→(gb,16), "i7"→(i,7). Las capacidades se llevan a una unidad común para que
 *  "1tb" y "512gb" NO se consideren el mismo disco. */
function partirCifra(token: string): { unidad: string; valor: number } | null {
  const m = token.match(/^([a-z]*)(\d+(?:[.,]\d+)?)([a-z]*)$/);
  if (!m) return null;
  let valor = parseFloat(m[2].replace(",", "."));
  let unidad = m[1] + m[3];
  if (unidad === "tb") { valor *= 1024; unidad = "gb"; }
  if (unidad === "mb") { valor /= 1024; unidad = "gb"; }
  return Number.isFinite(valor) ? { unidad, valor } : null;
}

/** Las cifras no se contradicen. Solo hay conflicto cuando AMBAS consultas mencionan la
 *  misma magnitud con valores distintos (24 vs 48 puertos, 16GB vs 32GB, i7 vs i5). Que
 *  una consulta añada un dato que la otra omite (ej. "250W") NO es un conflicto: es la
 *  misma petición redactada con más detalle. */
function cifrasCompatibles(a: string[], b: string[]): boolean {
  const porMagnitud = (t: string[]) => {
    const m = new Map<string, Set<number>>();
    for (const x of t) {
      const p = partirCifra(x);
      if (!p) continue;
      if (!m.has(p.unidad)) m.set(p.unidad, new Set());
      m.get(p.unidad)!.add(p.valor);
    }
    return m;
  };
  const ma = porMagnitud(a);
  const mb = porMagnitud(b);
  for (const [unidad, va] of ma) {
    const vb = mb.get(unidad);
    if (!vb) continue; // la otra consulta no menciona esa magnitud → se tolera
    if (va.size !== vb.size) return false;
    for (const v of va) if (!vb.has(v)) return false;
  }
  return true;
}

/** ¿Dos consultas piden el MISMO producto? Las cifras no pueden contradecirse y las
 *  palabras deben parecerse lo suficiente (tolera otro orden o un adjetivo de más).
 *  Exportada para poder probar los casos límite sin gastar búsquedas. */
export function mismaConsulta(a: string[], b: string[]): boolean {
  if (!cifrasCompatibles(a, b)) return false;

  const soloTexto = (t: string[]) => new Set(t.filter((x) => !/\d/.test(x)));
  const pa = soloTexto(a);
  const pb = soloTexto(b);
  // Sin palabras a ambos lados, deciden las cifras (que ya se comprobaron).
  if (pa.size === 0 || pb.size === 0) return pa.size === pb.size && a.length > 0;

  let inter = 0;
  for (const x of pa) if (pb.has(x)) inter++;
  const union = pa.size + pb.size - inter;
  return union > 0 && inter / union >= SIMILITUD_MIN;
}

/** Devuelve el resultado cacheado de una consulta si está FRESCO (< 7 días).
 *  Primero por clave exacta; si no, por reformulación equivalente. */
export function getCachedQuery(consulta: string): QueryEntry | null {
  const c = load();
  const now = Date.now();
  const fresca = (e: QueryEntry) => now - e.ts < WEB_CACHE_TTL;

  const exacta = c.queries[cacheKey(consulta)];
  if (exacta && fresca(exacta)) return exacta;

  const tokens = tokensConsulta(consulta);
  if (tokens.length === 0) return null;
  // El caché se poda a 7 días: recorrerlo es barato y evita una búsqueda de pago.
  for (const e of Object.values(c.queries)) {
    if (!fresca(e) || !Array.isArray(e.tokens)) continue;
    if (mismaConsulta(tokens, e.tokens)) return e;
  }
  return null;
}

/** Guarda el resultado de una consulta e indexa cada producto por nombre, modelo Y url.
 *  La URL es la clave más estable: no cambia cuando Andrea reformatea el nombre al registrar. */
export function saveQuote(consulta: string, productos: QuoteProducto[], local: LocalData): void {
  const c = load();
  prune(c);
  const ts = Date.now();
  c.queries[cacheKey(consulta)] = { ts, productos, tokens: tokensConsulta(consulta), ...local };
  for (const p of productos) {
    const entry: WebQuote = {
      ts, costoUSD: p.costoUSD, urlCompra: p.fuente,
      precioCOP: p.precioCOP, costoTotalCOP: p.costoTotalCOP,
      origen: p.origen, tokens: tokensConsulta(`${p.nombre ?? ""} ${p.modelo ?? ""}`),
      ...local,
    };
    for (const key of [p.modelo, p.nombre, p.fuente]) {
      const norm = key ? cacheKey(key) : "";
      if (norm.length >= 3) c.products[norm] = entry;
    }
  }
  save(c);
}

/** Coincidencia EXACTA por modelo/nombre/url, sin el fuzzy de `getWebQuote`.
 *  Se usa para FIJAR el precio de un producto ya cotizado, y ahí un falso positivo
 *  cotizaría un producto con el precio de otro — el fuzzy no es aceptable. */
export function getWebQuoteStrict(...claves: (string | undefined)[]): WebQuote | null {
  const c = load();
  const now = Date.now();
  for (const clave of claves) {
    const norm = clave ? cacheKey(clave) : "";
    const e = norm.length >= 3 ? c.products[norm] : undefined;
    if (e && now - e.ts < WEB_CACHE_TTL) return e;
  }
  return null;
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
  // 2) Fuzzy por nombre (cubre reformateos de Andrea). La contención exige tamaños
  //    COMPARABLES: el nombre de un equipo completo contiene el de sus piezas, y sin
  //    esa guarda un PC tomaba la cotización de su propio procesador.
  const target = cacheKey(nombre);
  if (target.length >= 6) {
    for (const k of Object.keys(c.products)) {
      const e = c.products[k];
      if (now - e.ts > WEB_CACHE_TTL) continue;
      if (k.length < 6 || !(target.includes(k) || k.includes(target))) continue;
      if (Math.min(k.length, target.length) / Math.max(k.length, target.length) < 0.6) continue;
      return e;
    }
  }
  return null;
}

/** Recupera la cotización de un producto cuando el nombre NO coincide literalmente.
 *
 *  Andrea reformatea el nombre al registrar: cotizó "Samsung DDR3L-1600 SODIMM 8GB/1Gx64
 *  CL11 Samsung Chip Notebook Memory" y registró "Memoria Samsung DDR3L-1600 SODIMM 8GB".
 *  La búsqueda por contención de `getWebQuote` falla ahí, porque a una cadena le sobra al
 *  principio y a la otra al final — y el pedido quedaba SIN datos de proveedor: costo,
 *  margen y enlace en blanco, sin forma de saber de dónde salió el precio.
 *
 *  Empareja por TOKENS y desempata por PRECIO, que es el dato fuerte: el cliente ya lo vio
 *  y sale de una ficha que arma el servidor. Sin ese desempate no se puede resolver "a ojo"
 *  una cotización de tres memorias casi idénticas ($80.000 / $100.000 / $120.000), así que
 *  ante ambigüedad devuelve null en vez de adivinar. */
export function getWebQuoteFuzzy(nombre: string, precioCOP?: number): WebQuote | null {
  const objetivo = tokensConsulta(nombre);
  if (objetivo.length < 2) return null;
  const objSet = new Set(objetivo);

  const c = load();
  const now = Date.now();
  // La misma entrada está indexada por nombre, modelo y url → deduplicar.
  const unicos = new Map<string, WebQuote>();
  for (const e of Object.values(c.products)) {
    if (now - e.ts > WEB_CACHE_TTL || !Array.isArray(e.tokens) || e.tokens.length === 0) continue;
    unicos.set(`${e.precioCOP}|${e.urlCompra}`, e);
  }

  const candidatos: { e: WebQuote; score: number }[] = [];
  for (const e of unicos.values()) {
    if (!cifrasCompatibles(objetivo, e.tokens!)) continue;
    const comunes = new Set(e.tokens!.filter((t) => objSet.has(t)));
    const score = comunes.size / objSet.size; // qué parte del nombre registrado se explica
    if (score >= 0.5) candidatos.push({ e, score });
  }
  if (candidatos.length === 0) return null;

  if (precioCOP != null) {
    const exactos = candidatos.filter((c2) => c2.e.precioCOP === precioCOP);
    if (exactos.length > 0) return exactos.sort((a, b) => b.score - a.score)[0].e;
  }

  candidatos.sort((a, b) => b.score - a.score);
  // Sin precio que desempate, solo se acepta un ganador CLARO.
  if (candidatos.length === 1 || candidatos[0].score - candidatos[1].score >= 0.2) return candidatos[0].e;
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
