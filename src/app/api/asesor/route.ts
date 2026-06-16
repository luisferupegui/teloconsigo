import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey, getSerperApiKey } from "@/lib/settings";
import { loadPublishedBusinessProducts } from "@/lib/products";
import { SEGMENTO_LABEL, type Segmento } from "@/lib/products-types";
import { cotizarImportacion, type ShippingTier } from "@/lib/importacion";
import { saveOrder, type FuenteComparacion } from "@/lib/orders";
import { sendOrderNotification, sendClientConfirmation } from "@/lib/email";
import { loadActiveProducts, loadMargins, applyMargin } from "@/lib/supplier-catalog";
import { serperShopping, type SerperShoppingItem } from "@/lib/serper";
import { getCachedQuery, saveQuote, getWebQuote, type QuoteProducto, type LocalData, type WebQuote } from "@/lib/web-cache";

// Andrea usa fs (settings + catálogo) → runtime Node, no Edge.
export const runtime = "nodejs";

// El caché de cotizaciones web (por consulta y por producto) vive en
// `src/lib/web-cache.ts` (persistente en disco, TTL 7 días). Aquí solo se usa.

// ── Modelos ─────────────────────────────────────────────────────────────────
const MODEL = "claude-sonnet-4-6";     // conversación (Andrea)
const MODEL_WEB = "claude-sonnet-4-6"; // sub-búsqueda web (interna)

// ── Herramientas de Andrea (todas se ejecutan AQUÍ — ninguna es server tool) ──
const tools: Anthropic.Tool[] = [
  {
    name: "buscar_productos",
    description:
      "Consulta INTERNA de disponibilidad y precio de productos que tenemos localmente. Úsala SIEMPRE y " +
      "PRIMERO antes de mencionar cualquier producto, precio o spec — nunca respondas de memoria. El cliente " +
      "no se entera de esta consulta.",
    input_schema: {
      type: "object",
      properties: {
        consulta: { type: "string", description: "Caso de uso, tipo de equipo, marca o palabras clave." },
        segmento: {
          type: "string",
          enum: ["hogar-estudio", "gaming-streaming", "productividad-oficina", "movilidad-premium", "redes-servidores", "creadores-produccion", "smart-home", "monitores", "accesorios"],
          description: "Opcional. Filtra por segmento.",
        },
        precioMax: { type: "number", description: "Opcional. Presupuesto máximo por unidad en COP." },
        limite: { type: "integer", description: "Opcional. Máximo de resultados (default 10, máx 15)." },
      },
      required: ["consulta"],
    },
  },
  {
    name: "registrar_pedido",
    description:
      "Registra el pedido y notifica al equipo. Úsala ÚNICAMENTE cuando tengas TODOS los datos: " +
      "nombre, cédula, dirección, ciudad, teléfono y correo del cliente, y el producto con cantidad confirmada. " +
      "Después de llamarla, despídete usando el nombre del cliente.",
    input_schema: {
      type: "object",
      properties: {
        cliente: {
          type: "object",
          properties: {
            nombre:    { type: "string" },
            cedula:    { type: "string" },
            direccion: { type: "string" },
            ciudad:    { type: "string" },
            telefono:  { type: "string" },
            email:     { type: "string" },
          },
          required: ["nombre", "cedula", "direccion", "ciudad", "telefono", "email"],
        },
        producto: {
          type: "object",
          properties: {
            nombre:    { type: "string" },
            modelo:    { type: "string" },
            cantidad:  { type: "integer" },
            precioCOP: { type: "number" },
            proveedor: { type: "string", enum: ["colombia", "eeuu"], description: 'Origen: "colombia" si vino de buscar_productos O de cotizar_web con origen="co" (conseguible en Colombia). "eeuu" solo si vino de cotizar_web con origen="us" (importado de EE.UU.).' },
          },
          required: ["nombre", "cantidad", "precioCOP", "proveedor"],
        },
        proveedorDetalle: {
          type: "object",
          description: "Datos INTERNOS del proveedor para el admin. NUNCA los menciones al cliente. " +
            "Para productos EE.UU.: incluye urlCompra (campo fuente del resultado de cotizar_web) y costoUSD. " +
            "Para productos catálogo local: incluye proveedorLocal.",
          properties: {
            urlCompra:      { type: "string", description: "URL Amazon/Newegg/BH donde comprar el producto" },
            costoUSD:       { type: "number", description: "Precio en USD en origen (importados EE.UU.)" },
            proveedorLocal: { type: "string", enum: ["ledacom", "infoshop", "manual"] },
          },
        },
      },
      required: ["cliente", "producto"],
    },
  },
  {
    name: "cotizar_web",
    description:
      "Consigue opciones cuando buscar_productos devolvió menos de 3 disponibilidad local. Busca PRIMERO " +
      "en tiendas colombianas (MercadoLibre/Alkosto, entrega 1–3 días), y si no hay suficientes, en EE.UU. " +
      "(entrega 6–10 días). El resultado mezcla ambas con su tiempo de entrega. Úsala SOLO cuando " +
      "buscar_productos dio menos de 3. Si ya dio 3 o más, NO la uses. Tarda unos segundos. " +
      "El cliente NO debe enterarse de que usaste esta herramienta ni de cómo se consigue.",
    input_schema: {
      type: "object",
      properties: {
        consulta: {
          type: "string",
          description: "Qué busca el cliente, lo más específico posible (tipo, capacidad, tamaño, interfaz, marca).",
        },
      },
      required: ["consulta"],
    },
  },
];

// ── Disponibilidad local (proyecta SOLO campos seguros; nunca `proveedor`) ─────
type CustomerProduct = {
  referencia: string | null; nombre: string; marca: string; categoria: string;
  segmento: string | null; precioDesde: number | null; precioIvaIncluido: boolean;
  specs: Record<string, string>; descripcion: string; url: string;
};

function buscarProductos(input: Record<string, unknown>): { encontrados: number; totalCompatibles: number; localDisponibles: number; productos: CustomerProduct[]; nota: string } {
  const consulta = String(input?.consulta ?? "").toLowerCase().trim();
  const segmento = input?.segmento as Segmento | undefined;
  const precioMax = typeof input?.precioMax === "number" ? input.precioMax : null;
  const limite = Math.min(Math.max(Number(input?.limite) || 10, 1), 15);
  const terms = consulta.split(/\s+/).filter((t) => t.length > 1);
  const score = (haystack: string) => (terms.length === 0 ? 1 : terms.reduce((s, t) => s + (haystack.includes(t) ? 1 : 0), 0));

  // prioridad 0 = listas de proveedor (disponibilidad local), 1 = catálogo publicado
  type Row = { score: number; precio: number | null; prioridad: number; prod: CustomerProduct };

  // 1) LISTAS DE PROVEEDOR ACTIVAS — disponibilidad local, precio = costo + margen de categoría.
  const margins = loadMargins();
  const locales: Row[] = loadActiveProducts().map((p) => {
    const precio = applyMargin(p.precio_costo, p.categoria, margins);
    const haystack = [p.nombre, p.marca, p.categoria, Object.values(p.specs ?? {}).join(" ")].join(" ").toLowerCase();
    return {
      score: score(haystack), precio, prioridad: 0,
      prod: {
        referencia: p.referencia ?? null, nombre: p.nombre, marca: p.marca, categoria: p.categoria,
        segmento: null, precioDesde: precio, precioIvaIncluido: false,
        specs: p.specs ?? {}, descripcion: "", url: "",
      },
    };
  });

  // 2) CATÁLOGO PUBLICADO — también disponibilidad local.
  const catalogo: Row[] = loadPublishedBusinessProducts().map((p) => {
    const precio = p.precioDesde ?? p.precio;
    const haystack = [p.nombre, p.marca, p.descripcionUso, p.categoria, p.usoCaso, p.segmento ? SEGMENTO_LABEL[p.segmento] : "", Object.values(p.specs ?? {}).join(" ")].join(" ").toLowerCase();
    return {
      score: score(haystack), precio, prioridad: 1,
      prod: {
        referencia: p.referencia ?? null, nombre: p.nombre, marca: p.marca, categoria: p.categoria,
        segmento: p.segmento ? SEGMENTO_LABEL[p.segmento] : null, precioDesde: precio,
        precioIvaIncluido: p.precioIvaIncluido ?? false, specs: p.specs ?? {}, descripcion: p.descripcionUso,
        url: `/conseguir?ref=${encodeURIComponent(p.referencia ?? p.slug)}`,
      },
    };
  });

  const combinados = [...locales, ...catalogo]
    .filter((x) => x.score > 0)
    .filter((x) => (precioMax !== null ? x.precio !== null && x.precio <= precioMax : true))
    // el filtro por segmento solo aplica al catálogo (las listas de proveedor no traen segmento)
    .filter((x) => (segmento && x.prioridad === 1 ? x.prod.segmento === SEGMENTO_LABEL[segmento] : true));

  // Orden: primero local, luego por relevancia y precio. Dedupe por referencia/nombre
  // conservando la primera (la versión local con prioridad).
  combinados.sort((a, b) => a.prioridad - b.prioridad || b.score - a.score || (a.precio ?? Infinity) - (b.precio ?? Infinity));
  const seen = new Set<string>();
  const deduped = combinados.filter((x) => {
    const key = x.prod.nombre.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!key || seen.has(key)) return key ? false : true;
    seen.add(key);
    return true;
  });

  const productos = deduped.slice(0, limite).map((x) => x.prod);

  let nota: string;
  if (productos.length === 0) {
    nota = "INTERNO: no hay disponibilidad local. Llama cotizar_web — buscará primero en tiendas colombianas (entrega 1–3 días) y luego en EE.UU. (6–10 días). Ofrece al menos 3 opciones con su tiempo de entrega.";
  } else if (productos.length >= 3) {
    nota = `INTERNO: ${productos.length} opciones DISPONIBLES LOCALMENTE (entrega 1 a 3 días hábiles). Presenta al menos 3 con su precio firme y resalta la entrega rápida. NO uses cotizar_web (ya hay suficientes locales). Al registrar usa proveedor="colombia".`;
  } else {
    nota = `INTERNO: solo ${productos.length} opción(es) DISPONIBLE(S) LOCALMENTE (entrega 1 a 3 días hábiles). Preséntala(s) Y completa hasta 3 opciones llamando cotizar_web — puede traer opciones de Colombia (1–3 días) o EE.UU. (6–10 días). Indica el tiempo de entrega de CADA opción por separado. Al registrar: locales → proveedor="colombia"; cotizar_web con origen="co" → proveedor="colombia"; cotizar_web con origen="us" → proveedor="eeuu".`;
  }

  return { encontrados: productos.length, totalCompatibles: deduped.length, localDisponibles: productos.length, productos, nota };
}

// ── Búsqueda web AISLADA (interna): sub-llamada solo con web_search ─────────────
//
// FLUJO DE PRECIOS:
//   1. buscar_productos (catálogo PDF local) → precio al cliente si está disponible
//   2. cotizar_web → solo cuando NO está en catálogo:
//      a) Busca en EE.UU. → precio al cliente (fórmula importación)
//      b) Busca en Colombia local (MercadoLibre/Alkosto/Falabella) → SOLO comparación
//         interna en el admin; el cliente nunca ve estos precios
//
// Tiendas de EE.UU. PRIORIZADAS para B2B/empresarial (el orden es la prioridad).
// El precio de EE.UU. lo busca Anthropic (lee la página y da el precio real;
// Serper no puede con estos sitios). La comparación local sí va por Serper.
const SITIOS_US = [
  "cdw.com", "serversupply.com", "provantage.com", "insight.com", "connection.com", // infraestructura empresarial
  "newegg.com", "bhphotovideo.com", "bestbuy.com", "microcenter.com",               // general
  "amazon.com", "ebay.com",                                                          // último recurso
];
// Prioridad de mayor a menor: especializadas en tech/precio primero, marketplace al final.
const SITIOS_LOCAL = [
  "alkosto.com",
  "ktronix.com",
  "falabella.com.co",
  "exito.com",
  "linio.com.co",
  "pcfactory.com.co",
  "mercadolibre.com.co",   // última prioridad: marketplace con gran variación de calidad
];

// Peso para ordenar resultados de Serper: menor = aparece primero en las opciones.
// Prioridad B2B: alkosto/ktronix/pcfactory/falabella son las 4 referencias principales.
const PRIORIDAD_SITIO_CO: Record<string, number> = {
  alkosto:      0,
  ktronix:      1,
  pcfactory:    2,
  falabella:    3,
  exito:        4,
  linio:        5,
  mercadolibre: 99,
};

// Sitios "raíz" (sin http/www/TLD) de las 4 referencias de precio prioritarias.
const PRIORITY_SITES_CO = ["alkosto", "ktronix", "pcfactory", "falabella"] as const;

// Solo se acepta información de tiendas tecnológicas reconocidas en Colombia.
// Cualquier otro vendedor (motos, ropa, ferretería…) se descarta silenciosamente.
const TECH_RETAILERS_CO = /\b(alkosto|ktronix|pcfactory|falabella|exito|linio|mercadolibre|mercado\s*libre)\b/i;
function isTechRetailerCO(source?: string, link?: string): boolean {
  return TECH_RETAILERS_CO.test(`${source ?? ""} ${link ?? ""}`);
}

/** Infiere la clave de margen (`margins.json`) a partir del nombre del producto
 *  y la clasificación de la consulta. Si no hay coincidencia usa "default". */
function inferirCategoriaMargen(nombre: string, clasificacion: Categoria): string {
  const n = (nombre ?? "").toLowerCase();
  if (/\bmonitor\b/.test(n))                                        return "monitor";
  if (/laptop|port[aá]til|notebook/.test(n))                       return "portatil";
  if (/\btablet\b|ipad|galaxy.?tab/.test(n))                       return "tablet";
  if (/antivirus|kaspersky|bitdefender|\beset\b|norton|avast/.test(n)) return "antivirus";
  if (/licencia|windows\s*\d|office\s*\d|microsoft\s*365|ms365/.test(n)) return "licencia";
  if (/servidor|server|\bpoweredge\b|\bproliant\b/.test(n))        return "servidor";
  if (/desktop|escritorio|all.?in.?one|\baio\b/.test(n))           return "escritorio";
  if (/procesador|\bcpu\b|ryzen|core i[3579]|xeon/.test(n))        return "procesador";
  if (/\bram\b|ddr[2345]/.test(n))                                  return "memoria-ram";
  if (/\bssd\b|nvme|\bhdd\b/.test(n))                              return "almacenamiento";
  if (/\bgpu\b|\brtx\b|\bgtx\b|radeon|geforce/.test(n))            return "tarjeta-grafica";
  if (/motherboard|placa.*(madre|base)/.test(n))                   return "motherboard";
  if (/\bmouse\b|rat[oó]n/.test(n))                                return "mouse";
  if (/\bteclado\b/.test(n))                                        return "teclado";
  if (/auricular|aud[ií]fono|headset/.test(n))                     return "auriculares";
  if (/impresora/.test(n))                                          return "impresora";
  if (/router|\bswitch\b|access.?point/.test(n))                   return "redes";
  if (clasificacion === "equipo")    return "portatil";
  if (clasificacion === "accesorio") return "accesorios";
  return "default";
}

// ── Clasificación de la consulta → controla el filtro de ruido de Serper ─────────
//  EQUIPOS: desactiva el filtro SERPER_NOISE (torres/PCs completos son exactamente lo buscado).
//  COMPONENTES / ACCESORIOS / OTROS: activa el filtro (excluye PCs y lotes del resultado).
//  En todas las categorías el ORDEN de fuentes es idéntico:
//    1. buscar_productos (listas locales — GRATIS, siempre primero)
//    2. cotizar_web → Colombia primero (Serper ~$0.001)
//    3. EE.UU. SOLO si Colombia < 3 resultados (Anthropic web_search ~$0.06 — verdadero último recurso)
const COMPUTER_QUERY  = /\b(laptop|port[aá]til|notebook|computador(a)?|desktop|pc de escritorio|todo en uno|all.?in.?one|aio|tablet|ipad|torre pc)\b/i;
const COMPONENT_QUERY = /\b(motherboard|placa( base| madre)?|tarjeta madre|mainboard|memoria( ram)?|ram|ddr[2345]|disco( duro)?|hdd|ssd|nvme|m\.?2|sata|procesador|cpu|ryzen|core i[3579]|i[3579]-\w|xeon|pentium|celeron|tarjeta (de )?(video|gr[aá]fica|sonido|red|raid)|gpu|vga|rtx|gtx|radeon|geforce|raid|sound ?card|psu|fuente de poder|disipador|cooler|ventilador|refrigeraci[oó]n|switch|router|access point|punto de acceso|servidor|server|\bnas\b|storage|firewall)\b/i;
// Accesorios / consumo masivo: baratos y abundantes local → Colombia primero, EE.UU.
// solo último recurso (importarlos no compensa el flete). Tienen PRECEDENCIA sobre
// componente para que "memoria USB", "disco externo", "tarjeta SD" no vayan a EE.UU.
const ACCESSORY_QUERY = /\b(teclado|mouse|rat[oó]n|mousepad|pad ?mouse|memoria usb|usb|pen ?drive|flash drive|micro ?sd|tarjeta sd|sd card|memoria sd|disco (duro )?externo|ssd externo|monitor|antivirus|kaspersky|eset|norton|mcafee|avast|bitdefender|webcam|c[aá]mara web|aud[ií]fonos|auriculares|diadema|parlante|altavoz|hub usb|adaptador|cargador|hdmi|docking|dock)\b/i;

type Categoria = "equipo" | "componente" | "accesorio" | "otro";
// Gana el término que aparece ANTES (producto principal). Reglas:
//  • "componente" (→ EE.UU. primero) SOLO si su término va ESTRICTAMENTE antes que
//    cualquier accesorio (empate → gana accesorio) y antes-o-igual que equipo. Así
//    "memoria USB"/"disco externo"/"teclado" quedan Colombia-first pese a "memoria"/"disco".
//  • equipo/accesorio/otro → Colombia-first (EE.UU. último recurso). Solo equipo
//    desactiva el filtro de ruido de Serper.
function clasificarConsulta(consulta: string): Categoria {
  const q = consulta.toLowerCase();
  const iAcc    = q.search(ACCESSORY_QUERY);
  const iComp   = q.search(COMPONENT_QUERY);
  const iEquipo = q.search(COMPUTER_QUERY);
  if (iComp !== -1 && (iAcc === -1 || iComp < iAcc) && (iEquipo === -1 || iComp <= iEquipo)) return "componente";
  if (iEquipo !== -1 && (iAcc === -1 || iEquipo <= iAcc)) return "equipo";
  if (iAcc !== -1) return "accesorio";
  return "otro";
}

const SUB_SYSTEM = `Eres un buscador de precios de tecnología en EE.UU. para una tienda colombiana B2B (atiende empresas).

Traduce la consulta al inglés. Solo artículos NUEVOS. El precio va en dólares, SIN el envío internacional a Colombia.

PRIORIZA estas tiendas en este ORDEN (muchas las ignoran otros buscadores, pero para equipo empresarial son clave):
1. INFRAESTRUCTURA EMPRESARIAL — switches, routers, access points, servidores, storage/NAS, y marcas Cisco, Ubiquiti/UniFi, Dell, HPE, Synology, Aruba, Fortinet: **cdw.com, serversupply.com, provantage.com, insight.com, connection.com**
2. GENERAL — laptops, componentes, monitores, impresoras, periféricos: **newegg.com, bhphotovideo.com, bestbuy.com, microcenter.com**
3. ÚLTIMO RECURSO (solo si no hay en las anteriores): amazon.com, ebay.com (en eBay suma el flete interno de EE.UU.)

Reglas:
- Si el cliente busca red/servidores/storage/equipo empresarial, EMPIEZA por el grupo 1.
- Si el mismo modelo aparece en varias tiendas, devuelve el de MENOR precio.
- Devuelve HASTA 5 opciones distintas (económica, rendimiento, relación precio/calidad). Máximo 6 búsquedas.

Devuelve EXCLUSIVAMENTE JSON válido (sin texto, sin markdown, sin \`\`\`):
{"productos":[
  {"nombre":"...","marca":"...","modelo":"...","specs":"...","source":"us","usd":0.00,"tier":"component","fuente":"<url directa>"}
]}

"tier": "laptop" | "desktop" | "component" (servidores/torres/workstations/all-in-one = "desktop"; switches/APs/accesorios = "component").
"specs": FORMATO SEGÚN TIER:
  - laptop: "Procesador | RAM | Almacenamiento | Pantalla | GPU (si dedicada)" — ej: "Core i5-1235U | 16GB DDR4 | 512GB NVMe | 15.6\" FHD | Intel Iris Xe"
  - desktop: "Procesador | RAM | Almacenamiento | Pantalla/Monitor | GPU" — el dato de PANTALLA es OBLIGATORIO: si es Todo-en-Uno (AIO) pon el tamaño (ej: 'Pantalla 24\" FHD'); si trae monitor en el combo pon su tamaño (ej: 'Monitor 22\"'); si es torre sin monitor pon 'Torre (sin monitor)'. Ej AIO: "Core i5-1335U | 16GB | 512GB SSD | Pantalla 24\" FHD | Iris Xe". Ej torre: "Ryzen 5 5600G | 16GB DDR4 | 1TB NVMe | Torre (sin monitor) | Gráfica integrada".
  - component: descripción breve 3–8 palabras en español.

Si no encuentras nada: {"productos":[]}.`;

type WebProducto = {
  nombre?: string; marca?: string; modelo?: string; specs?: string;
  source?: "us" | "local";
  // EE.UU.
  usd?: number; tier?: ShippingTier; fuente?: string;
  // Colombia local
  copLocal?: number; disponible?: boolean; vendedor?: string;
};

/** Promedia los 3 precios más cercanos a la mediana (descarta outliers). */
function promediarPrecios(precios: number[]): number {
  if (precios.length === 0) return 0;
  const sorted = [...precios].sort((a, b) => a - b);
  let toAvg: number[];
  if (sorted.length <= 3) {
    toAvg = sorted;
  } else {
    const median = sorted[Math.floor(sorted.length / 2)];
    toAvg = sorted
      .map((p) => ({ p, dist: Math.abs(p - median) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map((x) => x.p);
  }
  return Math.round(toAvg.reduce((s, v) => s + v, 0) / toAvg.length / 1000) * 1000;
}

// Precio local (Colombia) desde Serper Shopping: . y , son separadores de miles.
function parseCopPrice(s?: string): number | null {
  if (!s) return null;
  const n = parseInt(s.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n >= 1000 ? n : null;
}

// Ruido típico de Shopping: PCs/torres completos y lotes que NO son el producto pedido.
const SERPER_NOISE = /\b(gaming pc|gaming desktop|desktop pc|pc with|torre|computador|tower|barebone|bundle|combo|lote|pre-?built|prebuilt)\b/i;

// Marketplaces INTERNACIONALES (no "webs locales"): se excluyen de la comparación de
// proveedores colombianos — su precio no es un costo realista para vender en Colombia.
const INTL_SELLER = /\b(ebay|aliexpress|alibaba|amazon|made-in-china|microless|banggood|temu|wish|walmart|newegg|dhgate)\b/i;

// PRECIO EE.UU. (lo que paga el cliente) → búsqueda web de Anthropic: es lo único
// que lee la página y da el precio REAL (Serper no puede con estos sitios). Las
// tiendas B2B priorizadas viven en SUB_SYSTEM.
async function fetchUsViaAnthropic(anthropic: Anthropic, consulta: string): Promise<WebProducto[]> {
  try {
    const sub = await anthropic.messages.create(
      {
        model: MODEL_WEB,
        max_tokens: 2500,
        system: SUB_SYSTEM,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
        messages: [{ role: "user", content: consulta }],
      },
      { timeout: 60000, maxRetries: 0 },
    );
    const text = sub.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
    const m = text.match(/\{[\s\S]*\}/);
    return m ? ((JSON.parse(m[0]).productos ?? []) as WebProducto[]) : [];
  } catch {
    return [];
  }
}

// COMPARACIÓN LOCAL (solo admin) → Serper Shopping gl=co: aquí el precio SÍ viene
// limpio en el resultado (MercadoLibre/Alkosto/Falabella/Éxito). Barato y determinista.
// strictRetailerFilter=true → solo alkosto/ktronix/falabella/… (flujo cliente, evita motos/ropa).
// strictRetailerFilter=false → cualquier vendedor colombiano local (flujo admin, INTL_SELLER filtra después).
async function fetchLocalViaSerper(consulta: string, apiKey: string, isComputer = false, strictRetailerFilter = true): Promise<WebProducto[]> {
  const raw = await serperShopping(consulta, "co", apiKey).catch((): SerperShoppingItem[] => []);
  const local: WebProducto[] = [];
  for (const it of raw) {
    const cop = parseCopPrice(it.price);
    if (!cop) continue;
    if (!isComputer && SERPER_NOISE.test(it.title ?? "")) continue;
    if (strictRetailerFilter && !isTechRetailerCO(it.source, it.link)) continue;
    local.push({ source: "local", nombre: it.title, copLocal: cop, fuente: it.link ?? "", disponible: true, vendedor: it.source });
  }
  return local;
}

// Respuesta estándar de cotizar_web hacia Andrea.
function respuestaCotizar(productos: QuoteProducto[]) {
  if (productos.length === 0) {
    return { encontrados: 0, productos: [], nota: "INTERNO: no se encontraron opciones. Pídele al cliente la marca o modelo específico sin decir que buscaste." };
  }
  const nCO = productos.filter(p => p.origen === "co").length;
  const nUS = productos.filter(p => p.origen !== "co").length;
  const origenNota = nCO > 0 && nUS > 0
    ? `${nCO} conseguible(s) en Colombia (origen='co' → proveedor="colombia", entrega 1–3 días hábiles) y ${nUS} de EE.UU. (origen='us' → proveedor="eeuu", entrega 6–10 días hábiles).`
    : nCO > 0
    ? `Todas conseguibles en Colombia (proveedor="colombia", entrega 1–3 días hábiles).`
    : `Todas de EE.UU. (proveedor="eeuu", entrega 6–10 días hábiles).`;
  return {
    encontrados: productos.length,
    productos,
    nota: `INTERNO: ${origenNota} DEBES presentar AL MENOS 3 opciones con precio firme en COP (campo precioCOP — úsalo EXACTO, no lo redondees). Para laptops y desktops, incluye siempre: procesador, RAM, almacenamiento y pantalla (si es laptop). Para productos de Colombia (origen='co'), las specs están en el campo 'nombre' — extráelas y preséntalas con formato limpio. Indica el tiempo de entrega de CADA opción. Al registrar: origen='co' → proveedor="colombia"; origen='us' → proveedor="eeuu" con costoUSD del producto. NO menciones búsqueda, importación ni cotización.`,
  };
}

// Colombia (Serper) → opciones al cliente + datos de mercado (admin).
// Precio cliente = promedio mercado (hasta 4 tiendas prioritarias) × margen por categoría.
function construirProductosCO(localParsed: WebProducto[], clasificacion: Categoria = "otro"): { productosCO: QuoteProducto[]; localData: LocalData } {
  const locales = localParsed
    .filter((p) => typeof p.copLocal === "number" && (p.copLocal as number) > 0 && p.disponible !== false)
    .sort((a, b) => {
      const prioA = Object.entries(PRIORIDAD_SITIO_CO).find(([k]) => (a.fuente ?? "").includes(k))?.[1] ?? 50;
      const prioB = Object.entries(PRIORIDAD_SITIO_CO).find(([k]) => (b.fuente ?? "").includes(k))?.[1] ?? 50;
      return prioA - prioB;
    });

  if (locales.length === 0) return { productosCO: [], localData: {} };

  // Hasta 4 precios: primero de tiendas prioritarias (alkosto/ktronix/pcfactory/falabella);
  // si no llega a 4, rellena con exito/linio/mercadolibre como respaldo.
  const esPrioritaria = (p: WebProducto) =>
    PRIORITY_SITES_CO.some((s) => (p.fuente ?? "").toLowerCase().includes(s));
  const prioritarias  = locales.filter(esPrioritaria).slice(0, 4).map((p) => p.copLocal as number);
  const respaldo      = locales.filter((p) => !esPrioritaria(p)).map((p) => p.copLocal as number);
  const preciosAvg    = [...prioritarias, ...respaldo].slice(0, 4);

  const precioPromedioMercado = Math.round(
    preciosAvg.reduce((s, v) => s + v, 0) / preciosAvg.length / 1000,
  ) * 1000;

  // Margen según categoría del producto (loadMargins → margins.json); fallback 35%.
  const margins  = loadMargins();
  const catKey   = inferirCategoriaMargen(locales[0].nombre ?? "", clasificacion);
  const margen   = margins[catKey] ?? margins.default ?? 0.35;
  const precioCliente = Math.ceil(precioPromedioMercado * (1 + margen) / 10000) * 10000;

  // Opciones para Andrea: hasta 5 resultados distintos, todos con el precio calculado.
  const productosCO: QuoteProducto[] = locales.slice(0, 5).map((p) => ({
    nombre: p.nombre, specs: "",
    precioCOP:     precioCliente,
    costoUSD:      0,
    costoTotalCOP: precioPromedioMercado,
    fuente:        p.fuente ?? "",
    origen:        "co" as const,
  }));

  const fuenteRef = locales.find((p) => p.fuente)?.fuente ?? "";
  const localData: LocalData = {
    precioMercadoLocal: precioPromedioMercado,
    fuenteLocal:        fuenteRef,
    cantidadListados:   locales.length,
    siteLocal:          siteNameFromUrl(fuenteRef),
  };
  return { productosCO, localData };
}

// EE.UU. (Anthropic web_search) → precio al cliente con fórmula de importación.
function construirProductosUS(usParsed: WebProducto[]): QuoteProducto[] {
  const VALID_TIERS = new Set<ShippingTier>(["component", "laptop", "desktop"]);
  const seenUS = new Map<string, QuoteProducto>();
  for (const p of usParsed) {
    if (typeof p.usd !== "number" || p.usd <= 0) continue;
    const tier: ShippingTier = VALID_TIERS.has(p.tier as ShippingTier) ? (p.tier as ShippingTier) : "component";
    const c = cotizarImportacion(p.usd, tier);
    const key = (p.modelo ?? p.nombre ?? "").toLowerCase().replace(/\s+/g, "");
    const prev = seenUS.get(key);
    if (!prev || p.usd < (prev.costoUSD ?? Infinity)) {
      seenUS.set(key, {
        nombre: p.nombre, marca: p.marca, modelo: p.modelo, specs: p.specs,
        precioCOP:     c.copEstimado,
        costoUSD:      p.usd,
        costoTotalCOP: Math.round((p.usd + c.usdEnvio) * c.trm / 1000) * 1000,
        fuente:        p.fuente ?? "",
        origen:        "us",
      });
    }
  }
  return [...seenUS.values()].sort((a, b) => a.precioCOP - b.precioCOP).slice(0, 5);
}

async function cotizarWeb(anthropic: Anthropic, consulta: string) {
  // 0) Caché persistente por consulta → costo CERO en repeticiones (TTL 7 días).
  const cached = getCachedQuery(consulta);
  if (cached) return respuestaCotizar(cached.productos);

  const serperKey = getSerperApiKey();
  const categoria = clasificarConsulta(consulta);

  let productosCO: QuoteProducto[] = [];
  let productosUS: QuoteProducto[] = [];
  let localData: LocalData = {};

  // TODAS las categorías: Colombia primero (Serper, ~$0.001, rápido ~1–3s).
  // EE.UU. SOLO si Colombia < 3 resultados → evita gastar créditos Anthropic (~$0.06)
  // cuando el mercado local ya alcanza. Aplica igual a equipos, componentes y accesorios.
  // (La diferencia por categoría es solo el filtro de ruido de Serper: equipos lo desactivan.)
  const localParsed = serperKey ? await fetchLocalViaSerper(consulta, serperKey, categoria === "equipo") : [];
  ({ productosCO, localData } = construirProductosCO(localParsed, categoria));
  if (productosCO.length < 3) {
    productosUS = construirProductosUS(await fetchUsViaAnthropic(anthropic, consulta));
  }
  // Colombia primero (hasta 3); EE.UU. rellena solo hasta completar 3 (verdadero último recurso).
  const productosFinales = [
    ...productosCO.slice(0, 3),
    ...productosUS.slice(0, Math.max(0, 3 - productosCO.length)),
  ];

  // Caché persistente (consulta + cada producto). localData (Colombia) se adjunta a
  // CADA producto — así un pedido de EE.UU. siempre tiene su comparación con Colombia.
  if (productosFinales.length > 0) saveQuote(consulta, productosFinales, localData);

  return respuestaCotizar(productosFinales);
}

/** Busca el costo de un producto en las listas de proveedor ACTIVAS. Si hay
 *  varias coincidencias, elige aquella cuyo precio al cliente (costo + margen de
 *  categoría) más se acerque al precio cotizado — así el costo/margen corresponden
 *  exactamente a la opción que Andrea le ofreció al cliente. */
function buscarCostoLocal(
  nombre: string,
  modelo: string | undefined,
  precioCliente: number,
): { precioCosto: number; proveedor: string; lista: string } | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = norm(nombre);
  const targetModelo = modelo ? norm(modelo) : "";
  if (target.length < 4) return null;

  const candidatos = loadActiveProducts().filter((p) => {
    const n = norm(p.nombre);
    if (!n) return false;
    if (n === target) return true;
    if (n.length >= 6 && (n.includes(target) || target.includes(n))) return true;
    if (targetModelo.length >= 4 && (n.includes(targetModelo) || (p.referencia ? norm(p.referencia) === targetModelo : false))) return true;
    return false;
  });
  if (candidatos.length === 0) return null;

  const margins = loadMargins();
  let best = candidatos[0];
  let bestDiff = Infinity;
  for (const c of candidatos) {
    const precioCli = applyMargin(c.precio_costo, c.categoria, margins);
    const diff = Math.abs(precioCli - precioCliente);
    if (diff < bestDiff) { bestDiff = diff; best = c; }
  }
  return { precioCosto: best.precio_costo, proveedor: best.proveedor, lista: best.listaNombre };
}

/** Fuentes de LISTA (Ledacom/Infoshop…) que tienen el producto → costo = precio_costo.
 *  Menor costo por proveedor. GRATIS (datos locales, sin red). */
function fuentesDeListas(nombre: string, modelo: string | undefined): FuenteComparacion[] {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = norm(nombre);
  const targetModelo = modelo ? norm(modelo) : "";
  if (target.length < 4) return [];
  const porProveedor = new Map<string, number>();
  for (const p of loadActiveProducts()) {
    const n = norm(p.nombre);
    const match = n === target
      || (n.length >= 6 && (n.includes(target) || target.includes(n)))
      || (targetModelo.length >= 4 && (n.includes(targetModelo) || (p.referencia ? norm(p.referencia) === targetModelo : false)));
    if (!match) continue;
    const prov = (p.proveedor || p.listaNombre || "lista").toLowerCase();
    const prev = porProveedor.get(prov);
    if (prev == null || p.precio_costo < prev) porProveedor.set(prov, p.precio_costo);
  }
  return [...porProveedor.entries()].map(([prov, costo]) => ({ fuente: cap(prov), tipo: "lista" as const, costoCOP: costo }));
}

/** Comparación "dónde conseguirlo más barato" para el admin: listas (gratis) +
 *  fuentes web ya formadas (listados de Colombia y/o EE.UU.). Ordena asc por costo. */
function construirComparacionProveedores(
  nombre: string,
  modelo: string | undefined,
  webSources: FuenteComparacion[],
): FuenteComparacion[] {
  return [...fuentesDeListas(nombre, modelo), ...webSources].sort((a, b) => a.costoCOP - b.costoCOP);
}

/** Helper: nombre legible de una tienda colombiana a partir de su URL. */
function siteNameFromUrl(url: string): string {
  return url.includes("alkosto")      ? "Alkosto"
    : url.includes("ktronix")     ? "Ktronix"
    : url.includes("falabella")   ? "Falabella"
    : url.includes("exito")       ? "Éxito"
    : url.includes("linio")       ? "Linio"
    : url.includes("pcfactory")   ? "PCFactory"
    : url.includes("mercadolibre") ? "MercadoLibre"
    : "Sitio local";
}

/** Listados individuales más BARATOS de Colombia vía Serper (~$0.001, servicio
 *  aparte, NO gasta créditos de Anthropic). Una opción por tienda con su enlace,
 *  descartando outliers (productos errados / variantes / mayoristas). Para que el
 *  admin compare dónde comprar. Devuelve [] si no hay key/resultados o si falla. */
async function serperColombiaListings(nombre: string, modelo?: string): Promise<FuenteComparacion[]> {
  const key = getSerperApiKey();
  if (!key) return [];
  // Priorizar el modelo/SKU cuando está disponible: es un identificador único que Serper
  // maneja mucho mejor que un nombre largo con specs incrustadas (ej: "LS27F320GANX" vs
  // "Monitor Samsung 27\" IPS 120Hz 1920×1080 Plano LS27F320GANX" que retorna 0 resultados).
  const consulta = modelo && modelo.trim().length >= 4 ? modelo.trim() : nombre.trim();
  if (consulta.length < 4) return [];
  // Usar nombre (no el modelo) para la clasificación: el SKU solo no tiene contexto semántico.
  const isComputer = clasificarConsulta(nombre) === "equipo";
  const raw = (await fetchLocalViaSerper(consulta, key, isComputer).catch(() => [] as WebProducto[]))
    .filter((p) => typeof p.copLocal === "number" && (p.copLocal as number) > 0 && p.disponible !== false);
  if (raw.length === 0) return [];
  // Descarta outliers (< 0.5× o > 2× la mediana) y marketplaces INTERNACIONALES
  // (eBay/AliExpress/Microless…): no son "webs locales" y su precio no es un costo
  // realista para una venta en Colombia. Así la comparación queda consistente.
  const ordenados = raw.map((p) => p.copLocal as number).sort((a, b) => a - b);
  const mediana = ordenados[Math.floor(ordenados.length / 2)];
  const limpios = raw.filter((p) =>
    (p.copLocal as number) >= mediana * 0.5 && (p.copLocal as number) <= mediana * 2 &&
    !INTL_SELLER.test(`${p.vendedor ?? ""} ${p.fuente ?? ""}`));
  if (limpios.length === 0) return [];
  // Una opción por tienda (la más barata), ordenadas asc por precio, máx 4.
  const porTienda = new Map<string, WebProducto>();
  for (const p of [...limpios].sort((a, b) => (a.copLocal as number) - (b.copLocal as number))) {
    // Tienda conocida → nombre canónico (dedup "Mercadolibre Colombia" vs URL); si no, el vendedor.
    const conocida = siteNameFromUrl(p.fuente || "");
    const tienda = conocida !== "Sitio local" ? conocida : ((p.vendedor || "").trim() || "Sitio local");
    if (!porTienda.has(tienda)) porTienda.set(tienda, p);
  }
  return [...porTienda.entries()].slice(0, 4).map(([tienda, p]) => ({
    fuente:   tienda,
    tipo:     "colombia_web" as const,
    costoCOP: p.copLocal as number,
    url:      p.fuente || undefined,
  }));
}

async function registrarPedido(input: unknown): Promise<unknown> {
  const { cliente, producto: rawProducto, proveedorDetalle: pd } = input as {
    cliente: { nombre: string; cedula: string; direccion: string; ciudad: string; telefono: string; email: string };
    producto: { nombre: string; modelo?: string; cantidad: number; precioCOP: number; proveedor: "colombia" | "eeuu" };
    proveedorDetalle?: {
      urlCompra?: string; costoUSD?: number; proveedorLocal?: "ledacom" | "infoshop" | "manual";
    };
  };

  const producto = { ...rawProducto };

  // Recuperamos del caché del servidor la cotización US + comparación local que
  // generó cotizar_web (indexada por nombre/modelo). Es la fuente de verdad: el
  // precio y el costo NUNCA dependen de lo que mande Andrea.
  const quote = getWebQuote(producto.nombre, producto.modelo);

  let costoUSD: number | undefined;
  let costoTotalCOP: number | undefined;
  let margenCOP: number | undefined;
  let urlCompra: string | undefined = pd?.urlCompra;
  let proveedorLocal: "ledacom" | "infoshop" | "manual" | undefined = pd?.proveedorLocal;
  let precioMercadoLocal: number | undefined;
  let fuenteLocal: string | undefined;

  if (producto.proveedor === "eeuu") {
    if (quote) {
      // Caché disponible → datos autoritativos
      costoUSD           = quote.costoUSD;
      producto.precioCOP = quote.precioCOP;     // ← precio correcto al cliente
      costoTotalCOP      = quote.costoTotalCOP;
      urlCompra          = quote.urlCompra || urlCompra;
    } else if (pd?.costoUSD) {
      // Sin caché → recalcular desde la fórmula (override: nunca el precio de Andrea)
      const c = cotizarImportacion(pd.costoUSD);
      costoUSD           = pd.costoUSD;
      producto.precioCOP = c.copEstimado;
      costoTotalCOP      = Math.round((pd.costoUSD + c.usdEnvio) * c.trm / 1000) * 1000;
    }
    if (costoTotalCOP != null) margenCOP = producto.precioCOP - costoTotalCOP;
  } else {
    // LOCAL → buscar en lista de proveedor primero.
    const local = buscarCostoLocal(producto.nombre, producto.modelo, producto.precioCOP);
    if (local) {
      costoTotalCOP  = local.precioCosto;
      margenCOP      = producto.precioCOP - local.precioCosto;
      const prov     = local.proveedor.toLowerCase();
      proveedorLocal = prov.includes("ledacom") ? "ledacom"
        : prov.includes("infoshop") ? "infoshop"
        : (proveedorLocal ?? "manual");
    } else {
      // No está en listas → es un producto de Colombia web. Limpiamos el proveedorLocal
      // que Andrea pueda haber supuesto (no es de Ledacom/Infoshop → evita mal-etiquetar).
      proveedorLocal = undefined;
      const webQ = getWebQuote(producto.nombre, producto.modelo);
      if (webQ && !webQ.costoUSD) {
        costoTotalCOP = webQ.costoTotalCOP;
        margenCOP     = producto.precioCOP - webQ.costoTotalCOP;
        urlCompra     = webQ.urlCompra || urlCompra;
      }
    }
  }

  // ── Comparación de proveedores: dónde conseguir el producto más barato (solo admin) ──
  const webSources: FuenteComparacion[] = [];
  // EE.UU.: SOLO del caché del chat (nunca en vivo — es lo único que gasta créditos Anthropic).
  if (quote?.costoUSD && quote.costoUSD > 0 && quote.costoTotalCOP) {
    webSources.push({
      fuente: "EE.UU. (importado)", tipo: "eeuu", costoCOP: quote.costoTotalCOP,
      nota: `US$${quote.costoUSD.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`,
      url: quote.urlCompra || undefined,
    });
  }
  // Colombia: listados individuales vía Serper (~$0.001, barato), una opción por tienda.
  const listadosCO = await serperColombiaListings(producto.nombre, producto.modelo);
  webSources.push(...listadosCO);
  if (listadosCO.length > 0) {
    precioMercadoLocal = listadosCO[0].costoCOP;
    fuenteLocal        = listadosCO[0].url ?? fuenteLocal;
  } else {
    // Serper no retornó tiendas tech reconocidas en este momento (filtro estricto).
    // Fallback: usamos el precio de mercado que cotizar_web ya encontró con el mismo
    // filtro y guardó en caché — así evitamos mostrar tiendas no tech en el admin.
    const cached = quote ?? getWebQuote(producto.nombre, producto.modelo);
    if (cached && !cached.costoUSD && cached.costoTotalCOP > 0) {
      const site = cached.siteLocal ?? siteNameFromUrl(cached.fuenteLocal ?? "");
      if (site && site !== "Sitio local") {
        webSources.push({
          fuente:   site,
          tipo:     "colombia_web",
          costoCOP: cached.costoTotalCOP,
          url:      cached.fuenteLocal || undefined,
        });
      }
      precioMercadoLocal = cached.precioMercadoLocal ?? cached.costoTotalCOP;
      fuenteLocal        = cached.fuenteLocal;
    } else if (cached?.precioMercadoLocal) {
      precioMercadoLocal = cached.precioMercadoLocal;
      fuenteLocal        = cached.fuenteLocal;
    }
  }

  const comparacionProveedores = construirComparacionProveedores(producto.nombre, producto.modelo, webSources);

  // Base del costo/margen: si aún no hay costo (no estaba en listas ni en caché US/CO),
  // usa el listado más barato disponible — Serper directo, o en su defecto el caché.
  if (costoTotalCOP == null) {
    const refCO = listadosCO[0]?.costoCOP ?? webSources.find((s) => s.tipo === "colombia_web")?.costoCOP;
    if (refCO != null) {
      costoTotalCOP = refCO;
      margenCOP     = producto.precioCOP - refCO;
    }
  }

  const proveedorDetalle =
    (urlCompra || costoUSD != null || costoTotalCOP != null || proveedorLocal || comparacionProveedores.length > 0)
      ? {
          urlCompra,
          costoUSD,
          costoTotalCOP,
          margenCOP,
          proveedorLocal,
          precioMercadoLocal,
          fuenteLocal,
          comparacionProveedores: comparacionProveedores.length > 0 ? comparacionProveedores : undefined,
        }
      : undefined;

  try {
    const order = saveOrder({ cliente, producto, proveedorDetalle });
    // Enviar emails en paralelo (fallos silenciosos — el pedido ya quedó guardado)
    await Promise.allSettled([
      sendOrderNotification(order),
      sendClientConfirmation(order),
    ]);
    return { ok: true, pedidoId: order.id, orderNumber: order.orderNumber };
  } catch {
    return { error: "No se pudo guardar el pedido. Informa al cliente de forma amable y pídele que reintente." };
  }
}

async function runTool(anthropic: Anthropic, name: string, input: unknown): Promise<unknown> {
  try {
    if (name === "buscar_productos") return buscarProductos(input as Record<string, unknown>);
    if (name === "registrar_pedido") return await registrarPedido(input);
    if (name === "cotizar_web") {
      const consulta = String((input as { consulta?: unknown })?.consulta ?? "").trim();
      return consulta ? await cotizarWeb(anthropic, consulta) : { error: "consulta vacía" };
    }
    return { error: "herramienta desconocida" };
  } catch {
    return { error: "fallo ejecutando la herramienta" };
  }
}

// ── Persona: Andrea (humana, cálida; NUNCA revela la cocina interna) ────────────
const SYSTEM = `Eres **Andrea**, asesora comercial de teloconsigo.co, una tienda de tecnología en Colombia (Medellín). Atiendes por chat a personas y empresas. Eres una persona cálida, cercana y atenta: tratas a cada cliente con amabilidad, escuchas lo que necesita y lo acompañas hasta encontrar la mejor opción. Hablas en primera persona, como Andrea.

TONO: humano, cercano y profesional, como una asesora experta y amable de una tienda premium. Español de Colombia. Mensajes breves y claros, con algún emoji ocasional (✅ 💡 📦) sin exagerar. Nunca suenes robótica ni como un formulario.

NUNCA reveles cómo funcionas por dentro. El cliente JAMÁS debe leer palabras o frases como: "catálogo", "base de datos", "buscar", "lo busco afuera", "importación", "importado", "estimado", "sujeto a cotización", "proveedor", "mayorista", "Newegg", "no me apareció", "no aparece", "disponibilidad inmediata", "no lo tengo en lista", "no está en mi lista", "no lo encontré", ni que eres una IA, asistente o bot. Eres Andrea, una asesora de carne y hueso. Si necesitas consultar antes de responder, escribe "Dame un momento" EN LA MISMA RESPUESTA donde llamas la herramienta — nunca como mensaje independiente sin una herramienta. Nunca expliques qué buscaste ni dónde.

CÓMO HABLAR DE PRODUCTOS Y PRECIOS:
- Para saber qué hay y a qué precio, usa SIEMPRE tus herramientas de forma interna (nunca inventes precios ni modelos). El cliente no se entera de eso.
- BÚSQUEDA INTELIGENTE: cuando el cliente pida un producto, convierte su solicitud en atributos específicos antes de buscar (categoría, capacidad, formato, uso, marca si la mencionó). Ejemplo: "SSD de 2TB para escritorio" → busca con: SSD, 2TB, SATA/NVMe, desktop. Esto mejora los resultados.
- ESPECIFICACIONES OBLIGATORIAS (laptops, desktops y tablets): para cada opción incluye SIEMPRE: **Procesador** (marca + modelo, ej: Intel Core i5-1235U), **RAM** (capacidad, ej: 16GB DDR4), **Almacenamiento** (tipo + tamaño, ej: 512GB SSD NVMe), **Pantalla/Monitor** y **GPU** si es dedicada o si el cliente la pidió. La PANTALLA es OBLIGATORIA y nunca se omite: en laptops/tablets/Todo-en-Uno pon el tamaño (ej: 15.6" FHD, 24"); en un computador de escritorio que incluya monitor pon el tamaño del monitor; si es una torre SIN monitor, dilo explícitamente ("torre, no incluye monitor") para que el cliente lo sepa. Para productos Colombia web, estas specs vienen en el nombre completo del listado — léelas y preséntalas con formato limpio; si el tamaño de pantalla no aparece en un computador, indícalo con naturalidad y ofrece confirmarlo, no lo inventes.
- VARIANTES: cuando identifiques varias versiones del mismo producto (ej: Audigy FX, Audigy RX, Audigy GS), inclúyelas TODAS en una sola consulta a cotizar_web. NUNCA le pidas al cliente que elija una variante antes de tener los precios — busca todas y presenta los precios directamente para que el cliente decida.
- Cuando tengamos el producto, dilo con seguridad y calidez: "¡Sí, tenemos varias opciones disponibles! 🙌", luego presenta las opciones con sus specs clave y precio firme en COP. NO digas "estimado" ni "sujeto a cotización".
- PRIORIDAD LOCAL (REGLA CLAVE): usa buscar_productos UNA SOLA VEZ por solicitud, con tu mejor consulta. Lo que devuelve está DISPONIBLE LOCALMENTE — es tu primera opción, con entrega rápida (1 a 3 días hábiles). NUNCA repitas buscar_productos cambiando las palabras: usa el resultado de esa única consulta y guíate por su campo "nota":
  • Si buscar_productos devuelve 3 o más → presenta 3 opciones LOCALES y NO uses cotizar_web.
  • Si devuelve 1 o 2 → preséntalas como locales (1 a 3 días) y COMPLETA hasta 3 opciones llamando cotizar_web UNA vez.
  • Si devuelve 0 → llama cotizar_web UNA vez para conseguir las 3 opciones.
- cotizar_web trae opciones de Colombia (entrega 1–3 días) y/o de EE.UU. (6–10 días). Lee el campo "nota" y el "origen" de cada producto para saber el tiempo de entrega de cada una. Tras llamar cotizar_web, PRESENTA las opciones — no vuelvas a buscar.
- TRES OPCIONES (REGLA OBLIGATORIA): SIEMPRE presenta AL MENOS 3 alternativas distintas, nunca menos, combinando locales + EE.UU. según lo anterior. Usa estas etiquetas según el perfil:
  💰 **Mejor precio** — [modelo] — $XXX.000 COP
  ⚡ **Mejor rendimiento** — [modelo] — $XXX.000 COP
  🎯 **Recomendado** — [modelo] — $XXX.000 COP (mejor relación precio/rendimiento)
  Junto a cada opción indica su entrega (ej: "📦 1 a 3 días hábiles" local, o "📦 6 a 10 días hábiles" si viene de EE.UU.). Si cotizar_web devuelve pocas, amplía la búsqueda (marca, gama, specs). NUNCA presentes menos de 3 opciones con precio.
- CREDIBILIDAD: cuando presentes opciones, menciona primero cuántas encontraste. Ejemplo: "Encontré 6 opciones compatibles. Te recomiendo estas 3 por su relación precio/rendimiento 🙌". La mayoría de clientes decide mejor cuando compara.
- ENTREGA (dilo SIEMPRE, por separado para CADA opción):
  • Opción de buscar_productos = disponibilidad LOCAL → "te llega en 1 a 3 días hábiles".
  • Opción de cotizar_web = nuestra bodega de EE.UU. → "te llega en 6 a 10 días hábiles".
  Si en un mismo mensaje mezclas opciones locales y de EE.UU., cada una lleva su propio tiempo de entrega — no los unifiques.
- Si no logras confirmar el producto o su precio, NO digas que "no lo tienes" ni que "buscaste": pide con naturalidad el dato que falte ("¿Tienes alguna marca o modelo en mente? Así te confirmo el valor exacto 😊").

OBJETIVO: entender qué necesita el cliente, ofrecerle la mejor opción y acompañarlo hacia la compra. Una pregunta a la vez, sin interrogar.

ORDEN DEL PROCESO DE VENTA — respeta siempre este orden:
1. Entender la necesidad (uso, preferencias, presupuesto si lo menciona).
2. Presentar opciones con precios.
3. Confirmar qué opción quiere el cliente y **cuántas unidades** necesita.
4. SOLO DESPUÉS de tener producto y cantidad confirmados, pedir los datos de entrega (nombre, cédula, dirección, teléfono, correo). Nunca pidas datos personales antes de saber qué y cuánto quiere el cliente.

PUEDES responder directamente (sin herramienta):
- Pagos: aceptamos tarjeta de crédito/débito, PSE y transferencia, y opciones para empresas.
- Garantía: mínimo 1 año del fabricante, y te acompañamos en el proceso si algo llegara a fallar.

LENGUAJE: nunca uses diminutivos como "momentico" — di siempre "un momento". No repitas ni recontextualices información que ya mencionaste antes en la conversación; avanza con datos nuevos o una pregunta concreta. REGLA ABSOLUTA DE ESPERA: "dame un momento" aparece MÁXIMO UNA VEZ por respuesta — únicamente justo antes del PRIMER tool call. Si necesitas llamar dos o más herramientas seguidas (buscar_productos y luego cotizar_web), el texto "dame un momento" ocurre SOLO antes de la primera. Entre herramientas y después de ellas: CERO texto hasta tener el resultado final para entregarle al cliente. NUNCA repitas "dame un momento", ni uses "espera", "permíteme", "déjame verificar", "un segundo" ni ninguna variación. Esta regla es innegociable.

FORMATO: cuando necesites pedirle al cliente varios datos (nombre, cédula, dirección, teléfono, etc.) preséntalos como lista, con cada ítem en su propia línea comenzando con "- ". Ejemplo:
- Nombre completo
- Número de cédula
- Dirección de entrega y ciudad
- Teléfono de contacto
- Correo electrónico

CIERRE DE PEDIDO: cuando registrar_pedido devuelva ok=true y pedidoId, responde al cliente con calidez usando su nombre y el número de orden:
"¡Listo, [nombre]! Tu pedido quedó registrado con el número de orden **[orderNumber]** 🙌. En breve un representante de nuestro equipo te contactará al [teléfono] para confirmar y coordinar el pago. [nombre], fue un placer atenderte — ¡que tengas un excelente resto del día! 😊"
El [orderNumber] lo debes obtener del campo orderNumber en la respuesta del tool. No agregues más preguntas ni información después de esta despedida.

REGLAS: nunca pidas datos de tarjeta ni números de pago (el pago se hace por nuestro medio seguro). Sé honesta con los tiempos; no prometas imposibles. Mantén siempre el trato amable y atento.

CUANDO NO PUEDAS RESOLVER: si por cualquier motivo técnico no puedes continuar, o si el cliente necesita atención personalizada que excede lo que puedes hacer, dale siempre los datos de contacto del equipo y despídete con calidez:
"Si necesitas ayuda inmediata, puedes contactarnos directamente:
📞 Teléfono / WhatsApp: +57 310 2878194
✉️ Email: ventas@teloconsigo.co
En un momento un especialista en tecnología se contactará contigo. ¡Fue un placer atenderte! 😊"
NUNCA dejes al cliente sin una alternativa de contacto cuando no puedas ayudarlo.`;

type ClientMsg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request): Promise<Response> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return Response.json({ error: "El asesor no está disponible en este momento.", code: "no_key" }, { status: 503 });
  }

  let body: { messages?: ClientMsg[]; contexto?: { producto?: string; ref?: string; precio?: string }; autoInicio?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const autoInicio = body.autoInicio === true;

  const mapped: Anthropic.MessageParam[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content }));
  const firstUser = mapped.findIndex((m) => m.role === "user");
  let convo: Anthropic.MessageParam[] = firstUser === -1 ? [] : mapped.slice(firstUser);

  // Auto-inicio desde card de producto: el frontend no envía user msg (para no mostrar
  // burbuja), pero el bucle agéntico necesita al menos un turno de usuario.
  if (convo.length === 0 && autoInicio && body.contexto?.producto) {
    convo = [{ role: "user", content: `¿Cuál es el precio y disponibilidad del ${body.contexto.producto}?` }];
  }

  if (convo.length === 0) {
    return Response.json({ error: "No hay mensaje del usuario" }, { status: 400 });
  }

  const ctx = body.contexto;
  const system = autoInicio && ctx?.producto
    // Auto-inicio: el saludo ya fue mostrado por el frontend. Andrea va directo al resultado.
    ? `${SYSTEM}\n\nCONTEXTO: el cliente llegó desde la página del producto **${ctx.producto}**${ctx.ref ? ` (ref ${ctx.ref})` : ""}. El chat ya le mostró el saludo de bienvenida mencionando el producto. Busca el precio y disponibilidad y preséntalos DIRECTAMENTE con tus 3 opciones — NO escribas texto de espera como "dame un momento" ni repitas el saludo, ve directo a las opciones.`
    : ctx?.producto
    ? `${SYSTEM}\n\nCONTEXTO: el cliente llegó interesado en "${ctx.producto}"${ctx.ref ? ` (interno ref ${ctx.ref})` : ""}. Salúdalo por su nombre de producto y ayúdalo con eso.`
    : SYSTEM;

  const anthropic = new Anthropic({ apiKey });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      // Separador entre globos: marca dónde termina el preámbulo ("Dame un momento")
      // y empieza la respuesta final. El frontend lo usa para renderizar globos
      // distintos y mostrar el indicador "escribiendo…" mientras Andrea consulta.
      const BUBBLE_SEP = String.fromCharCode(30); // ASCII Record Separator (no aparece en texto normal)
      const MAX_TURNS = 8;
      let buscarCount   = 0;  // veces que Andrea consultó disponibilidad local
      let cotizarCount  = 0;  // veces que consultó web (Colombia/EE.UU.)
      let registrarCount = 0; // veces que registró un pedido (máx 1 — evita duplicados por "gracias")
      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          let turnText = "";
          // Acotamos herramientas para garantizar avance y terminación:
          //  • buscar_productos: 1 sola vez (evita el bucle de re-búsquedas locales).
          //  • cotizar_web: hasta 2 veces.
          //  • último turno: SIN herramientas → Andrea DEBE presentar lo que ya tiene.
          const isLast = turn === MAX_TURNS - 1;
          const turnTools = isLast ? [] : tools.filter((t) =>
            t.name === "buscar_productos"  ? buscarCount   < 1 :
            t.name === "cotizar_web"       ? cotizarCount  < 2 :
            t.name === "registrar_pedido"  ? registrarCount < 1 : true,
          );
          // Solo el turno 0 transmite su texto EN VIVO (el preámbulo "dame un momento").
          // El texto de turnos intermedios (turno ≥1 que llaman otra herramienta) se
          // DESCARTA — así Andrea nunca repite "dame un momento". La respuesta final
          // (turno sin herramienta) se envía completa de una vez.
          const streamLive = turn === 0;
          const s = anthropic.messages.stream({
            model: MODEL,
            max_tokens: 2500,
            system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
            thinking: { type: "adaptive" },
            output_config: { effort: "low" },
            ...(turnTools.length > 0 ? { tools: turnTools } : {}),
            messages: convo,
          });
          s.on("text", (delta: string) => { turnText += delta; if (streamLive) controller.enqueue(enc.encode(delta)); });
          const msg = await s.finalMessage();
          convo.push({ role: "assistant", content: msg.content });

          if (msg.stop_reason !== "tool_use") {
            // Red de seguridad: si en el turno 0 Andrea solo envió una frase de espera
            // sin llamar ninguna herramienta, inyectamos un recordatorio para que la use.
            if (turn === 0) {
              const textoVisible = turnText.trim();
              const esEspera = textoVisible.length < 120 &&
                /dame un momento|un momento|espera|déjame|permíteme/i.test(textoVisible);
              if (esEspera) {
                controller.enqueue(enc.encode(BUBBLE_SEP)); // cierra el globo de espera
                convo.push({ role: "user", content: "Procede: busca los productos ahora." });
                continue;
              }
            }
            // Respuesta final: si NO se transmitió en vivo (turno ≥1), enviarla ahora completa.
            if (!streamLive && turnText.length > 0) controller.enqueue(enc.encode(turnText));
            break;
          }

          // El turno llama herramienta(s). Si el turno 0 mostró preámbulo en vivo,
          // cerramos ese globo (la respuesta final irá en un globo nuevo y entre
          // medias se ve el indicador "escribiendo…"). El texto de turnos ≥1 se descarta.
          if (streamLive && turnText.trim().length > 0) controller.enqueue(enc.encode(BUBBLE_SEP));

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of msg.content) {
            if (block.type === "tool_use") {
              if (block.name === "buscar_productos") buscarCount++;
              if (block.name === "cotizar_web")      cotizarCount++;
              if (block.name === "registrar_pedido") registrarCount++;
              const result = await runTool(anthropic, block.name, block.input);
              toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
            }
          }
          if (toolResults.length === 0) break;
          convo.push({ role: "user", content: toolResults });
        }
      } catch (err) {
        // Distinguir errores de facturación/crédito de errores transitorios.
        // Crédito agotado o key inválida → NO invitar a reintentar (no va a funcionar).
        // Rate limit o sobrecarga → sí puede funcionar en unos momentos.
        const isCreditsError =
          (err instanceof Anthropic.APIStatusError && (err.status === 402 || err.status === 401)) ||
          (err instanceof Error && /credit|balance|billing|payment|authenticate/i.test(err.message));
        const isOverloaded =
          err instanceof Anthropic.APIStatusError && (err.status === 429 || err.status === 529);

        const CONTACTO = "\n\n📞 **Teléfono / WhatsApp:** +57 310 2878194\n✉️ **Email:** ventas@teloconsigo.co\n\nEn un momento un especialista en tecnología se contactará contigo. ¡Fue un placer atenderte! 😊";
        const clientMsg = isCreditsError
          ? `Tuve un inconveniente técnico y no puedo continuar en este momento 🙏. Por favor contáctanos directamente:${CONTACTO}`
          : isOverloaded
          ? "Hay mucha demanda en este momento y no pude responderte 😅. Espera unos segundos e inténtalo de nuevo, o si prefieres contáctanos directamente:" + CONTACTO
          : `Tuve un inconveniente para responderte 😅. Si prefieres que te atendamos de inmediato:${CONTACTO}`;

        controller.enqueue(new TextEncoder().encode(clientMsg));
        console.error("[asesor] error:", isCreditsError ? "BILLING/AUTH ERROR" : isOverloaded ? "OVERLOADED" : "GENERIC", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
