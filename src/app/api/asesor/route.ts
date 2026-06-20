import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey, getSerperApiKey } from "@/lib/settings";
import { loadPublishedBusinessProducts } from "@/lib/products";
import { SEGMENTO_LABEL, type Segmento } from "@/lib/products-types";
import { cotizarImportacion, type ShippingTier } from "@/lib/importacion";
import { saveOrder, deleteOrder, type FuenteComparacion } from "@/lib/orders";
import { sendOrderNotification, sendClientConfirmation } from "@/lib/email";
import { loadActiveProducts, loadMargins, applyMargin, type ActiveProduct, type Margins } from "@/lib/supplier-catalog";
import { serperShopping, type SerperShoppingItem } from "@/lib/serper";
import { getCachedQuery, saveQuote, getWebQuote, type QuoteProducto, type LocalData, type WebQuote } from "@/lib/web-cache";
import { getSearchMode } from "@/lib/search-priority";

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
    name: "cancelar_pedido",
    description:
      "Cancela un pedido registrado en esta conversación cuando el cliente quiere corregir datos o anularlo. " +
      "Usa el pedidoId exacto recibido en la respuesta de registrar_pedido. " +
      "Tras cancelar, puedes llamar a registrar_pedido de nuevo con los datos correctos.",
    input_schema: {
      type: "object",
      properties: {
        pedidoId: { type: "string", description: "El campo pedidoId retornado por registrar_pedido." },
      },
      required: ["pedidoId"],
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

// ── Ficha: tarjeta de producto pre-formateada (FIDELIDAD: Andrea la copia tal cual) ──
// El modelo solía reescribir specs y precios (inventaba 1TB donde había 512GB, quitaba
// el monitor, inflaba el precio). La defensa: el servidor arma la ficha exacta y Andrea
// solo la copia. Aquí se construye; el SYSTEM prompt obliga a copiarla sin alterar.
const fmtCOP = (n: number) =>
  "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " COP";

/** Specs estructuradas → líneas de viñeta, en orden legible. Solo incluye las que
 *  EXISTEN; nunca inventa una. Cubre las variantes de clave más comunes. */
function fichaSpecLines(specs: Record<string, string> | undefined): string[] {
  if (!specs) return [];
  const order: [string, string][] = [
    ["procesador", "Procesador"], ["cpu", "Procesador"],
    ["ram", "RAM"], ["memoria", "RAM"],
    ["almacenamiento", "Almacenamiento"], ["disco", "Almacenamiento"],
    ["monitor", "Pantalla"], ["pantalla", "Pantalla"],
    ["gpu", "Gráfica"], ["grafica", "Gráfica"], ["tarjeta_grafica", "Gráfica"],
    ["board", "Placa base"], ["so", "Sistema"], ["incluye", "Incluye"],
  ];
  const out: string[] = [];
  const usados = new Set<string>();
  for (const [key, label] of order) {
    const v = specs[key];
    if (v && !usados.has(label)) { out.push(`- ${label}: ${v}`); usados.add(label); }
  }
  return out;
}

// Un escritorio "completo" lleva un monitor (palabra "monitor"/"pantalla" o una medida
// de 20–39"); una torre sola no. Las medidas de 11–17" son pantallas de portátil, no monitor.
const INCLUYE_MONITOR = /\bmonitor\b|\bpantalla\b|\b(?:2\d|3[0-9])(?:[.,]\d)?\s*(?:"|''|pulg)/i;

/** Tamaño de monitor en pulgadas si aparece (ej: 24", 23.8"); "" si no. */
function tamMonitor(s: string): string {
  const m = s.match(/\b(\d{2}(?:[.,]\d)?)\s*(?:"|''|pulg)/i);
  return m ? m[1].replace(",", ".") + '"' : "";
}

/** Línea de estado de monitor para la ficha, deducida del texto. Distingue portátil
 *  (pantalla propia → null, no aplica), AIO (pantalla integrada), y escritorio (incluye
 *  monitor vs solo torre). Es lo que permite AGRUPAR opciones sin mezclar precios. */
function monitorStatusFromName(texto: string): string | null {
  if (/\b(port[aá]til|laptop|notebook|ultrabook)\b/i.test(texto) || /pantalla\s*1[0-7]\b|\b1[0-7][.,]\d\s*(?:"|'')/i.test(texto)) return null; // portátil
  if (/all.?in.?one|\baio\b|todo.?en.?uno/i.test(texto)) {
    const t = tamMonitor(texto); return `🖥️ Todo-en-uno · pantalla integrada${t ? ` ${t}` : ""}`;
  }
  if (!TIENE_CPU.test(texto)) return null; // componente/accesorio suelto: sin línea de monitor
  if (INCLUYE_MONITOR.test(texto)) {
    const t = tamMonitor(texto); return `🖥️ Incluye monitor${t ? ` ${t}` : ""}`;
  }
  return "🖥️ Solo torre (sin monitor)";
}

/** Tarjeta lista para mostrar al cliente. Si hay specs estructuradas las usa; si no,
 *  el nombre completo (que ya contiene la configuración real) es la fuente fiel. Añade
 *  el estado de monitor cuando aplica. El precio va EXACTO. Andrea copia esto sin cambiar nada. */
function construirFicha(nombre: string, specs: Record<string, string> | undefined, precio: number | null): string {
  const lineas = fichaSpecLines(specs);
  const mon = monitorStatusFromName(`${nombre} ${specs?.monitor ?? ""} ${specs?.pantalla ?? ""}`);
  const cuerpo = lineas.length > 0 ? `\n${lineas.join("\n")}` : "";
  const monLinea = mon ? `\n${mon}` : "";
  const precioLinea = precio != null ? `\n💲 ${fmtCOP(precio)}` : "";
  return `**${nombre}**${cuerpo}${monLinea}${precioLinea}`;
}

// ── Disponibilidad local (proyecta SOLO campos seguros; nunca `proveedor`) ─────
type CustomerProduct = {
  referencia: string | null; nombre: string; marca: string; categoria: string;
  segmento: string | null; precioDesde: number | null; precioIvaIncluido: boolean;
  specs: Record<string, string>; descripcion: string; url: string; ficha: string;
};

// Un equipo completo SIEMPRE nombra su CPU; un accesorio/componente suelto (chasis,
// cooler, fuente, SSD, RAM, monitor) no. En búsquedas de EQUIPO sirve para descartar ruido
// (p. ej. "CHASIS ANTEC + 5 FANS" colado por "color", o un cooler con "PANTALLA RGB").
const TIENE_CPU = /\b(ryzen|core\s?i[3579]|core\s?ultra|xeon|pentium|celeron|athlon|threadripper|i[3579]-\d{3,4})\b/i;

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
        ficha: construirFicha(p.nombre, p.specs, precio),
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
        ficha: construirFicha(p.nombre, p.specs, precio),
      },
    };
  });

  // Si el cliente pide un EQUIPO completo, exige que el producto nombre un CPU: así se
  // descartan piezas/accesorios sueltos que el scoring por palabras cuela (chasis, cooler…).
  const soloEquipos = clasificarConsulta(consulta) === "equipo";
  // Búsqueda explícita de escritorio/ensamblado (sin mencionar portátil) → excluir portátiles.
  // TIENE_CPU descarta periféricos pero NO laptops (tienen CPU). Sin este filtro un DELL INSPIRON
  // aparece en búsquedas de "ensamblado para edición" porque su Core i7 pasa el filtro de CPU.
  const ESCRITORIO_Q = /\b(ensamblad|escritorio|desktop|torre\s*pc|pc\s*torre|all.?in.?one|aio|todo.?en.?uno|workstation|gaming\s*pc)\b/i;
  const PORTATIL_Q   = /\b(laptop|port[aá]til|notebook|ultrabook)\b/i;
  const soloEscritorio = ESCRITORIO_Q.test(consulta) && !PORTATIL_Q.test(consulta);

  const combinados = [...locales, ...catalogo]
    .filter((x) => x.score > 0)
    .filter((x) => (precioMax !== null ? x.precio !== null && x.precio <= precioMax : true))
    // el filtro por segmento solo aplica al catálogo (las listas de proveedor no traen segmento)
    .filter((x) => (segmento && x.prioridad === 1 ? x.prod.segmento === SEGMENTO_LABEL[segmento] : true))
    .filter((x) => !soloEquipos || TIENE_CPU.test(x.prod.nombre))
    .filter((x) => !soloEscritorio || (x.prod.categoria !== "portatil" && !PORTATIL_Q.test(x.prod.nombre)));

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

  // ¿Los resultados son escritorios de ALTO RENDIMIENTO (GPU dedicada / CPU tope)? Activa la
  // REGLA 2x2: con 1–2 locales se completa hasta 4 opciones (locales + web), no hasta 3.
  const hayAltoRend = productos.some((p) =>
    /escritorio|desktop|computador|\bpc\b|torre|all.?in.?one|\baio\b/i.test(`${p.categoria} ${p.nombre}`)
    && !/laptop|port[aá]til|notebook/i.test(p.nombre)
    && ALTO_RENDIMIENTO_RE.test(p.nombre));

  let nota: string;
  if (productos.length === 0) {
    nota = "INTERNO: no hay disponibilidad local. Llama cotizar_web — buscará primero en tiendas colombianas (entrega 1–3 días) y luego en EE.UU. (6–10 días). Ofrece al menos 3 opciones con su tiempo de entrega.";
  } else if (productos.length >= 3) {
    nota = `INTERNO: ${productos.length} opciones DISPONIBLES LOCALMENTE (entrega 1 a 3 días hábiles). Presenta al menos 3 COPIANDO su campo "ficha" TAL CUAL (specs y precio EXACTOS — no los cambies ni combines productos); solo antepón la etiqueta y la entrega rápida. NO uses cotizar_web (ya hay suficientes locales). Al registrar usa proveedor="colombia".`;
  } else {
    // Construir descripción de specs del(los) producto(s) local(es) para guiar la búsqueda de alternativas.
    const specsLocales = productos.map((p) => {
      const specs = Object.entries(p.specs ?? {}).map(([, v]) => String(v)).filter(Boolean).join(", ");
      return `${p.nombre}${specs ? ` (${specs})` : ""}`;
    }).join("; ");
    // Regla 2x2: los escritorios de ALTO RENDIMIENTO AÑADEN 2 opciones de web a las locales
    // (1 local → 3 en total; 2 locales → 4 en total). El resto completa hasta 3.
    const objetivo  = hayAltoRend ? productos.length + 2 : 3;
    const completar = hayAltoRend
      ? `como es un escritorio de ALTO RENDIMIENTO aplica la REGLA 2x2: añade 2 opciones de webs locales colombianas (combos o torres, lo mejor que consigas) para mostrar ${objetivo} EN TOTAL (las ${productos.length} locales + 2 de web)`
      : `completa hasta 3 opciones`;
    nota = `INTERNO: solo ${productos.length} opción(es) DISPONIBLE(S) LOCALMENTE (entrega 1 a 3 días hábiles): ${specsLocales}. Preséntala(s) COPIANDO su campo "ficha" TAL CUAL (specs y precio EXACTOS) Y ${completar} llamando cotizar_web UNA VEZ. REGLA CLAVE DEL QUERY: construye la consulta con las SPECS del producto local (tipo de equipo, procesador, RAM, almacenamiento, uso) pero SIN mencionar la marca ni el modelo exacto — el objetivo es encontrar ALTERNATIVAS DE OTRAS MARCAS con características similares. Ejemplo: si tienes "HP EliteBook Core i7-1365U 16GB 512GB", busca "laptop empresarial Core i7 16GB 512GB" para obtener Dell Latitude, Lenovo ThinkPad, Asus ExpertBook, etc. Nunca busques el modelo exacto o la marca del producto ya encontrado localmente. Indica el tiempo de entrega de CADA opción por separado. Al registrar: locales → proveedor="colombia"; cotizar_web con origen="co" → proveedor="colombia"; cotizar_web con origen="us" → proveedor="eeuu".`;
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
  janus:        6,   // especialista en PCs de escritorio/ensamblados (solo aplica a computadores)
  mercadolibre: 99,
};

// Sitios "raíz" (sin http/www/TLD) de las 4 referencias de precio prioritarias.
const PRIORITY_SITES_CO = ["alkosto", "ktronix", "pcfactory", "falabella"] as const;

// Solo se acepta información de tiendas tecnológicas reconocidas en Colombia.
// Cualquier otro vendedor (motos, ropa, ferretería…) se descarta silenciosamente.
const TECH_RETAILERS_CO = /\b(alkosto|ktronix|pcfactory|falabella|exito|linio|mercadolibre|mercado\s*libre)\b/i;
// Tiendas ESPECIALISTAS en PCs de escritorio/ensamblados (precio de mercado real para esa
// categoría). Solo se aceptan cuando la búsqueda es de un computador — nunca para componentes
// ni accesorios — y se usan como BENCHMARK de comparación, no como opción al cliente.
const PC_RETAILERS_CO = /\bjanus\b/i;
function isTechRetailerCO(source?: string, link?: string, allowPCStores = false): boolean {
  const hay = `${source ?? ""} ${link ?? ""}`;
  return TECH_RETAILERS_CO.test(hay) || (allowPCStores && PC_RETAILERS_CO.test(hay));
}

// Escritorio de ALTO RENDIMIENTO (gaming / edición de video / producción): debe tener GPU
// DEDICADA (RTX/GTX/RX/Quadro), CPU tope de gama (Ryzen 9 / i9 / Xeon / Threadripper) o ser
// workstation. Un "PC Gamer" con gráficos integrados NO cuenta — gaming exige GPU dedicada.
// Tiene su propia categoría de margen ("escritorio-alto-rendimiento"). NO usar "radeon" suelto:
// las APU lo traen integrado.
const ALTO_RENDIMIENTO_RE = /\b(rtx|gtx|quadro|geforce)\b|\brx\s?\d{3,4}\b|\bryzen\s*9\b|\bcore\s?i9\b|\bi9-\d|\bthreadripper\b|\bxeon\b|\bworkstation\b/i;
const escritorioTier = (n: string): string =>
  ALTO_RENDIMIENTO_RE.test(n) ? "escritorio-alto-rendimiento" : "escritorio";

/** Infiere la clave de margen (`margins.json`) a partir del nombre del producto
 *  y la clasificación de la consulta. Si no hay coincidencia usa "default". */
function inferirCategoriaMargen(nombre: string, clasificacion: Categoria): string {
  const n = (nombre ?? "").toLowerCase();
  // "monitor" solo si NO es un equipo completo: un PC combo dice "+ Monitor 24\"" pero lleva CPU
  // → debe ir a escritorio, no a la categoría monitor (si no, un gaming con monitor no recibe su margen).
  if (/\bmonitor\b/.test(n) && !TIENE_CPU.test(n))                 return "monitor";
  if (/laptop|port[aá]til|notebook/.test(n))                       return "portatil";
  if (/\btablet\b|ipad|galaxy.?tab/.test(n))                       return "tablet";
  if (/antivirus|kaspersky|bitdefender|\beset\b|norton|avast/.test(n)) return "antivirus";
  if (/licencia|windows\s*\d|office\s*\d|microsoft\s*365|ms365/.test(n)) return "licencia";
  if (/servidor|server|\bpoweredge\b|\bproliant\b/.test(n))        return "servidor";
  // Mini-PC ANTES que escritorio: es su propia categoría (NUC, barebone, mini computador).
  if (/mini.?pc|minipc|\bnuc\b|mini.?computador|barebone/.test(n))  return "mini-pc";
  if (/desktop|escritorio|all.?in.?one|\baio\b|todo en uno|gaming\s*pc|pc\s*gam(er|ing)|ensamblad|workstation|estaci[oó]n de trabajo/.test(n)) return escritorioTier(n);
  // PC COMPLETO aunque el nombre lleve specs: si pide CPU y GPU juntos, es un equipo entero
  // (nadie busca "un CPU y una GPU" como una sola consulta salvo para armar un PC). Evita que
  // "PC gamer RTX 4070 Core i9" se desvíe a procesador/tarjeta-grafica (que van a EE.UU.).
  if (/ryzen|core ?i[3579]|\bi[3579][- ]?\d|\bxeon\b/.test(n) && /\brtx\b|\bgtx\b|\brx\s?\d{3,4}\b|radeon|geforce/.test(n)) return escritorioTier(n);
  // PC completo clasificado como "equipo" → escritorio (consulta con "computador"/"torre pc"/etc.).
  if (clasificacion === "equipo") return escritorioTier(n);
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

// Productos de segunda mano / reacondicionados — siempre excluidos (solo vendemos nuevos).
const USADO = /\b(usado|segunda\s*mano|reacondicionado|recondicionado|refurbished|open\s*box|de\s*segunda|seminuevo)\b/i;

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
// allowPCSpecialists=true → además acepta especialistas en PCs (Janus). Solo se usa en la
// comparación del admin (benchmark de mercado), NUNCA en las opciones al cliente (evita
// el doble margen: el precio de Janus ya es retail).
async function fetchLocalViaSerper(consulta: string, apiKey: string, isComputer = false, strictRetailerFilter = true, allowPCSpecialists = false): Promise<WebProducto[]> {
  const raw = await serperShopping(consulta, "co", apiKey).catch((): SerperShoppingItem[] => []);
  const local: WebProducto[] = [];
  for (const it of raw) {
    const cop = parseCopPrice(it.price);
    if (!cop) continue;
    if (!isComputer && SERPER_NOISE.test(it.title ?? "")) continue;
    // Excluir usados/reacondicionados: campo condition de Serper y palabras clave en el título.
    if (it.condition && it.condition !== "new") continue;
    if (USADO.test(it.title ?? "")) continue;
    if (strictRetailerFilter && !isTechRetailerCO(it.source, it.link, allowPCSpecialists)) continue;
    local.push({ source: "local", nombre: it.title, copLocal: cop, fuente: it.link ?? "", disponible: true, vendedor: it.source });
  }
  return local;
}

// Ficha web (cotizar_web): las specs vienen como string con "|" (EE.UU.) o dentro del
// nombre (Colombia). Arma la tarjeta exacta con el precioCOP autoritativo. Andrea la copia.
function fichaWeb(p: QuoteProducto): string {
  const partes = (p.specs ?? "").split("|").map((s) => s.trim()).filter(Boolean);
  const cuerpo = partes.length > 0 ? "\n" + partes.map((s) => `- ${s}`).join("\n") : "";
  const mon = monitorStatusFromName(`${p.nombre} ${p.specs ?? ""}`);
  const monLinea = mon ? `\n${mon}` : "";
  return `**${p.nombre}**${cuerpo}${monLinea}\n💲 ${fmtCOP(p.precioCOP)}`;
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
    productos: productos.map((p) => ({ ...p, ficha: fichaWeb(p) })),
    nota: `INTERNO: ${origenNota} DEBES presentar AL MENOS 3 opciones COPIANDO el campo "ficha" de cada una TAL CUAL: specs y precio EXACTOS, sin cambiar ni una cifra, sin agregar specs que no estén y sin combinar dos productos en uno. Solo antepón la etiqueta (💰/🎯/⚡) e indica la ENTREGA de CADA opción por separado. Al registrar: origen='co' → proveedor="colombia"; origen='us' → proveedor="eeuu" con costoUSD del producto. NO menciones búsqueda, importación ni cotización.`,
  };
}

// Colombia (Serper) → opciones al cliente + datos de mercado (admin).
// El precio de Serper YA es de mercado/retail; el margen va por CATEGORÍA del producto. Los
// escritorios de alto rendimiento (gaming/edición) usan "escritorio-alto-rendimiento" (12%,
// competitivo); los básicos y demás conservan su margen de categoría configurado.
function construirProductosCO(localParsed: WebProducto[], clasificacion: Categoria = "otro"): { productosCO: QuoteProducto[]; localData: LocalData } {
  const locales = localParsed
    .filter((p) => typeof p.copLocal === "number" && (p.copLocal as number) > 0 && p.disponible !== false)
    .sort((a, b) => {
      const prioA = Object.entries(PRIORIDAD_SITIO_CO).find(([k]) => (a.fuente ?? "").includes(k))?.[1] ?? 50;
      const prioB = Object.entries(PRIORIDAD_SITIO_CO).find(([k]) => (b.fuente ?? "").includes(k))?.[1] ?? 50;
      return prioA - prioB;
    });

  if (locales.length === 0) return { productosCO: [], localData: {} };

  const margins = loadMargins();

  // Precio individual por tienda Y por categoría: cada opción usa el margen que le corresponde
  // (un escritorio gaming/edición → 12%; uno básico → su margen de escritorio; etc.).
  const productosCO: QuoteProducto[] = locales.slice(0, 5).map((p) => {
    const copLocal = p.copLocal as number;
    const catKey   = inferirCategoriaMargen(p.nombre ?? "", clasificacion);
    const margen   = margins[catKey] ?? margins.default ?? 0.35;
    return {
      nombre: p.nombre, specs: "",
      precioCOP:     Math.ceil(copLocal * (1 + margen) / 10000) * 10000,
      costoUSD:      0,
      costoTotalCOP: copLocal,
      fuente:        p.fuente ?? "",
      origen:        "co" as const,
    };
  });

  const fuenteRef = locales.find((p) => p.fuente)?.fuente ?? "";
  const localData: LocalData = {
    precioMercadoLocal: locales[0].copLocal as number,  // la más barata (referencia admin)
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
  // Prioridad configurable por categoría desde el panel admin.
  const catKey = inferirCategoriaMargen(consulta, categoria);
  const mode   = getSearchMode(catKey);

  let productosCO: QuoteProducto[] = [];
  let productosUS: QuoteProducto[] = [];
  let localData: LocalData = {};

  if (mode === "co_only") {
    if (serperKey) {
      const localParsed = await fetchLocalViaSerper(consulta, serperKey, categoria === "equipo");
      ({ productosCO, localData } = construirProductosCO(localParsed, categoria));
    }
  } else if (mode === "eeuu_only") {
    productosUS = construirProductosUS(await fetchUsViaAnthropic(anthropic, consulta));
  } else if (mode === "eeuu_co") {
    // EE.UU. primero; Colombia rellena si faltan opciones.
    productosUS = construirProductosUS(await fetchUsViaAnthropic(anthropic, consulta));
    if (productosUS.length < 3 && serperKey) {
      const localParsed = await fetchLocalViaSerper(consulta, serperKey, categoria === "equipo");
      ({ productosCO, localData } = construirProductosCO(localParsed, categoria));
    }
  } else {
    // co_eeuu (default): Colombia primero; EE.UU. solo si faltan opciones.
    const localParsed = serperKey ? await fetchLocalViaSerper(consulta, serperKey, categoria === "equipo") : [];
    ({ productosCO, localData } = construirProductosCO(localParsed, categoria));
    if (productosCO.length < 3) {
      productosUS = construirProductosUS(await fetchUsViaAnthropic(anthropic, consulta));
    }
  }

  // Armar lista final: el mercado prioritario primero.
  const productosFinales = (mode === "eeuu_co" || mode === "eeuu_only")
    ? [
        ...productosUS.slice(0, 3),
        ...productosCO.slice(0, Math.max(0, 3 - productosUS.length)),
      ]
    : [
        ...productosCO.slice(0, 3),
        ...productosUS.slice(0, Math.max(0, 3 - productosCO.length)),
      ];

  // Caché persistente (consulta + cada producto). localData (Colombia) se adjunta a
  // CADA producto — así un pedido de EE.UU. siempre tiene su comparación con Colombia.
  if (productosFinales.length > 0) saveQuote(consulta, productosFinales, localData);

  return respuestaCotizar(productosFinales);
}

// ── Cotización de PC de escritorio / ensamblado ──────────────────────────────
// Un PC ensamblado NO es un SKU: su costo no puede salir de UNA pieza suelta (ese
// era el bug del "AMD Ryzen 7 5700G — 32GB/1.5TB/Monitor" cotizado a $887.000 = solo
// el CPU). Estos helpers cotizan equipos de escritorio con costo AUTORITATIVO:
//   1) CONFIG COMPLETA: la línea ensamblada/marca más cercana en las listas (cat. escritorio).
//   2) FALLBACK BOM: suma de piezas identificables + base de armado, si no hay config.

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Costo base de las piezas que el nombre casi nunca detalla (board + fuente + chasis
 *  + mano de obra). Se suma SOLO en el fallback BOM. Ajustable si cambia el costo de armado. */
const BASE_ARMADO_COP = 600000;

/** Extrae el token de modelo de CPU (5700g, 14700, 12400f…). Es el identificador más
 *  estable entre el nombre verboso de Andrea y el abreviado de las listas ("(16/512)"). */
function cpuToken(nombre: string): string | null {
  const n = nombre.toLowerCase();
  const intel = n.match(/\bi[3579][\s-]?(\d{4,5}[a-z]{0,2})\b/);   // i7-14700, i5 12400f
  if (intel) return norm(intel[1]);
  const amd = n.match(/\b(\d{4}[a-z]{1,3})\b/);                    // 5700g, 5600x, 7800x3d
  if (amd) return norm(amd[1]);
  return null;
}

/** Frase legible de CPU para construir queries de COMPARACIÓN de escritorios en Serper
 *  (ej: "ryzen 7 5700g", "core i7 12700"). El nombre verboso exacto no matchea en Google
 *  Shopping; una frase de CPU sí trae PCs comparables (Janus y otros). Vacío si no se reconoce. */
function cpuFrase(nombre: string): string {
  const n = nombre.toLowerCase();
  let m = n.match(/ryzen\s*(\d)\s*[- ]?\s*(\d{3,4}\w{0,3})/);
  if (m) return `ryzen ${m[1]} ${m[2]}`;
  m = n.match(/(?:core\s*)?(i[3579])[\s-]?(\d{4,5}\w{0,2})/);
  if (m) return `core ${m[1]} ${m[2]}`;
  m = n.match(/xeon\s*([\w-]+)/);
  if (m) return `xeon ${m[1]}`;
  return "";
}

/** ¿El nombre describe un PC de escritorio COMPUESTO (ensamblado o de marca con varias
 *  specs), no una pieza suelta? Excluye portátiles/tablets (van por su propio camino). */
function esEscritorioCompuesto(nombre: string): boolean {
  const n = nombre.toLowerCase();
  // Mini-PC / portátiles / tablets NO son ensamblados de torre → su propio camino (SKU de marca).
  if (/laptop|port[aá]til|notebook|\btablet\b|ipad|mini.?pc|minipc|\bnuc\b|barebone/.test(n)) return false;
  if (/desktop|escritorio|all.?in.?one|\baio\b|ensamblad|\btorre\b|gaming pc|pc gamer|workstation/.test(n)) return true;
  const hasCPU = /ryzen|core ?i[3579]|\bi[3579][\s-]?\d|\bxeon\b|pentium|celeron/.test(n);
  const hasRAM = /\bram\b|\bddr[2345]\b/.test(n);
  const hasSto = /\b(ssd|hdd|nvme)\b/.test(n);
  const hasMon = /\bmonitor\b/.test(n);                 // un CPU suelto nunca trae monitor
  const shorthand = /\(\d{1,2}\/\d{3,4}\)/.test(n);     // "(16/512)" = RAM/almacenamiento de las listas
  return hasCPU && (hasRAM || hasSto || hasMon || shorthand);
}

/** CONFIG COMPLETA: el PC de escritorio ensamblado/marca más cercano en las listas
 *  (categoría escritorio), igualando por token de CPU y eligiendo el de precio al
 *  cliente más cercano al cotizado (misma gama). Nunca toma piezas sueltas. */
const GPU_DEDICADA = /\b(rtx|gtx|radeon|geforce|quadro)\b|\brx\s?\d{3,4}\b/;

function costoEscritorioConfig(
  nombre: string,
  precioCliente: number,
  margins: Margins,
): { precioCosto: number; proveedor: string; lista: string } | null {
  const token = cpuToken(nombre);
  if (!token) return null;
  let candidatos = loadActiveProducts().filter(
    (p) => p.categoria?.startsWith("escritorio") && norm(p.nombre).includes(token),
  );
  if (candidatos.length === 0) return null;
  // Igualar la presencia de GPU dedicada: no ofrecer un equipo con RTX/RX si el cliente
  // no la pidió (ni al revés). Es el diferenciador de gama más claro entre configs.
  const reqGPU = GPU_DEDICADA.test(nombre.toLowerCase());
  const mismaGPU = candidatos.filter((p) => GPU_DEDICADA.test(p.nombre.toLowerCase()) === reqGPU);
  if (mismaGPU.length > 0) candidatos = mismaGPU;
  // Entre las del mismo CPU y misma clase de GPU, la de precio al cliente más cercano al cotizado.
  let best = candidatos[0];
  let bestDiff = Infinity;
  for (const c of candidatos) {
    const diff = Math.abs(applyMargin(c.precio_costo, "escritorio", margins) - precioCliente);
    if (diff < bestDiff) { bestDiff = diff; best = c; }
  }
  // Si la config más cercana difiere más del 30 % del precio cotizado, los specs son
  // distintos (p.ej. 16 GB vs 32 GB). BOM calcula mejor desde las piezas reales.
  if (bestDiff / precioCliente > 0.30) return null;
  return { precioCosto: best.precio_costo, proveedor: best.proveedor, lista: best.listaNombre };
}

/** FALLBACK BOM: suma el costo de las piezas identificables en el nombre (CPU, RAM,
 *  almacenamiento, GPU, monitor) — cada una de SU categoría, la más barata que casa con
 *  su capacidad/modelo — más una base de armado. Devuelve null si ni el CPU se encuentra. */
function costoEscritorioBOM(nombre: string): { precioCosto: number; piezas: string[] } | null {
  const n = nombre.toLowerCase();
  const productos = loadActiveProducts();
  // Las listas a veces traen EQUIPOS COMPLETOS (portátiles/AIO) mal categorizados como
  // pieza (ej: un portátil con "512GB SSD" colado en almacenamiento). Estos marcadores
  // delatan un equipo entero → se excluyen para no inflar el BOM con su precio.
  const ES_EQUIPO = /pantalla|laptop|port[aá]til|notebook|freedos|core ultra|\bdvd\b|teclado y mouse|ryzen|core ?i[3579]|\bi[3579][\s-]?\d|\bxeon\b|pentium|celeron/;
  // Cada pieza debe SER de su tipo: exigimos su palabra clave (no basta la capacidad,
  // que también aparece en el nombre de un equipo completo).
  const masBarato = (
    cat: string, tipoRe: RegExp, pred: (p: ActiveProduct) => boolean, permitirEquipo = false,
  ): ActiveProduct | null =>
    productos.filter((p) => {
      const nm = p.nombre.toLowerCase();
      return p.categoria === cat && (permitirEquipo || !ES_EQUIPO.test(nm)) && tipoRe.test(nm) && pred(p);
    }).sort((a, b) => a.precio_costo - b.precio_costo)[0] ?? null;

  const piezas: string[] = [];
  let total = BASE_ARMADO_COP;

  // CPU (obligatorio): sin CPU no hay base fiable → null. (permitirEquipo: la pieza ES un CPU.)
  const token = cpuToken(nombre);
  const cpu = token ? masBarato("procesador", /./, (p) => norm(p.nombre).includes(token), true) : null;
  if (!cpu) return null;
  total += cpu.precio_costo; piezas.push(`CPU ${cpu.nombre}`);

  // RAM: por capacidad declarada junto a "RAM/DDR" (ej: "32GB RAM").
  const ramCap = n.match(/(\d{1,3})\s?gb\b(?=[^/]*\b(ram|ddr)\b)|(?:ram|ddr[2345])\D{0,6}(\d{1,3})\s?gb/);
  const ramGB = ramCap ? (ramCap[1] ?? ramCap[3]) : null;
  if (ramGB) {
    const ram = masBarato("memoria-ram", /\b(ddr[2345]|ram|[su]o-?dimm|udimm)\b/, (p) => norm(p.nombre).includes(`${ramGB}gb`));
    if (ram) { total += ram.precio_costo; piezas.push(`RAM ${ram.nombre}`); }
  }

  // Almacenamiento: por capacidad declarada junto a SSD/NVMe/HDD (ej: "1.5TB SSD", "512GB NVMe").
  const stoCap = n.match(/(\d+(?:\.\d+)?)\s?(tb|gb)\b(?=[^,;|]*\b(ssd|nvme|hdd|disco)\b)/);
  if (stoCap) {
    const cap = norm(`${stoCap[1]}${stoCap[2]}`);
    const sto = masBarato("almacenamiento", /\b(ssd|nvme|hdd|m\.?2|sata|disco)\b/, (p) => norm(p.nombre).includes(cap));
    if (sto) { total += sto.precio_costo; piezas.push(`Disco ${sto.nombre}`); }
  }

  // GPU dedicada: por token de modelo (rtx 4060, rx 7600…), si el nombre la menciona.
  const gpu = n.match(/\b(?:rtx|gtx|rx)\s?(\d{3,4})\b/);
  if (gpu) {
    const g = masBarato("tarjeta-grafica", /\b(rtx|gtx|radeon|geforce|rx)\b/, (p) => norm(p.nombre).includes(gpu[1]));
    if (g) { total += g.precio_costo; piezas.push(`GPU ${g.nombre}`); }
  }

  // Monitor: por tamaño en pulgadas (ej: "Monitor 27\""), si lo incluye.
  const mon = n.match(/monitor[^0-9]*(\d{2}(?:\.\d)?)/);
  if (mon) {
    const pulg = norm(mon[1]);
    const m = masBarato("monitor", /\bmonitor\b/, (p) => norm(p.nombre).includes(pulg));
    if (m) { total += m.precio_costo; piezas.push(`Monitor ${m.nombre}`); }
  }

  return { precioCosto: total, piezas };
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

  // Tokens del nombre original (≥4 chars) para el fallback por intersección.
  const palabras = nombre.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(s => s.length >= 4);

  const candidatos = loadActiveProducts().filter((p) => {
    const n = norm(p.nombre);
    if (!n) return false;
    if (n === target) return true;
    if (n.length >= 6 && (n.includes(target) || target.includes(n))) return true;
    if (targetModelo.length >= 4 && (n.includes(targetModelo) || (p.referencia ? norm(p.referencia) === targetModelo : false))) return true;
    // Fallback por tokens: cubre "Monitor Samsung 27\" 1920×1080" vs "Monitor Samsung 27\" LF27T350"
    // (las listas usan el modelo corto; Andrea usa la descripción con specs completas).
    if (palabras.length >= 2) {
      let hits = 0;
      for (const tok of palabras) if (n.includes(tok)) hits++;
      if (hits >= 2) return true;
    }
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
  const target = norm(nombre);
  const targetModelo = modelo ? norm(modelo) : "";
  if (target.length < 4) return [];
  // PC de escritorio/ensamblado: compara SOLO configs completas del mismo CPU,
  // igualando presencia de GPU — nunca piezas sueltas ni mezcla GPU/sin-GPU.
  const escritorio = esEscritorioCompuesto(nombre);
  const token = escritorio ? cpuToken(nombre) : null;
  const reqGPU = escritorio ? GPU_DEDICADA.test(nombre.toLowerCase()) : false;
  const porProveedor = new Map<string, number>();
  for (const p of loadActiveProducts()) {
    const n = norm(p.nombre);
    const match = escritorio
      ? (p.categoria?.startsWith("escritorio") && !!token && n.includes(token) &&
         GPU_DEDICADA.test(p.nombre.toLowerCase()) === reqGPU)
      : (n === target
        || (n.length >= 6 && (n.includes(target) || target.includes(n)))
        || (targetModelo.length >= 4 && (n.includes(targetModelo) || (p.referencia ? norm(p.referencia) === targetModelo : false))));
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
  const u = (url ?? "").toLowerCase();   // acepta tanto URLs como el nombre del vendedor ("Janus LTDA")
  return u.includes("alkosto")      ? "Alkosto"
    : u.includes("ktronix")     ? "Ktronix"
    : u.includes("falabella")   ? "Falabella"
    : u.includes("exito")       ? "Éxito"
    : u.includes("linio")       ? "Linio"
    : u.includes("pcfactory")   ? "PCFactory"
    : u.includes("mercadolibre") ? "MercadoLibre"
    : u.includes("janus")       ? "Janus"
    : "Sitio local";
}

/** Listados individuales más BARATOS de Colombia vía Serper (~$0.001, servicio
 *  aparte, NO gasta créditos de Anthropic). Una opción por tienda con su enlace,
 *  descartando outliers (productos errados / variantes / mayoristas). Para que el
 *  admin compare dónde comprar. Devuelve [] si no hay key/resultados o si falla. */
async function serperColombiaListings(nombre: string, modelo?: string, precioCliente?: number): Promise<FuenteComparacion[]> {
  const key = getSerperApiKey();
  if (!key) return [];
  // Para ESCRITORIOS: el nombre verboso exacto no matchea en Google Shopping; una frase de
  // CPU (+ GPU si aplica) sí trae PCs comparables (Janus y otros). Para lo demás, priorizar
  // el modelo/SKU (identificador único que Serper maneja mejor que specs incrustadas).
  const esEsc = esEscritorioCompuesto(nombre);
  const gpu = nombre.toLowerCase().match(/\b(?:rtx|gtx|rx)\s?\d{3,4}\b/);
  const fraseEsc = esEsc ? [cpuFrase(nombre), gpu?.[0]].filter(Boolean).join(" ").trim() : "";
  const consulta = fraseEsc
    ? `computador escritorio ${fraseEsc}`
    : (modelo && modelo.trim().length >= 4 ? modelo.trim() : nombre.trim());
  if (consulta.length < 4) return [];
  // Un PC ensamblado se trata SIEMPRE como computador (su nombre lleno de specs puede
  // clasificarse como "componente" y entonces el filtro de ruido descartaría los PCs reales).
  const isComputer = clasificarConsulta(nombre) === "equipo" || esEsc;
  // allowPCSpecialists: en computadores aceptamos Janus como benchmark de mercado de escritorios.
  // Solo tiendas con catálogo PROPIO de equipos nuevos (Alkosto, Ktronix, Falabella, Éxito, Janus).
  // MercadoLibre y Linio son marketplaces que mezclan nuevo/usado → no son comparación fiable.
  const MARKETPLACE_CO = /mercadolibre|mercado\s*libre|linio/i;
  const raw = (await fetchLocalViaSerper(consulta, key, isComputer, true, isComputer).catch(() => [] as WebProducto[]))
    .filter((p) => typeof p.copLocal === "number" && (p.copLocal as number) > 0 && p.disponible !== false &&
      !MARKETPLACE_CO.test(`${p.vendedor ?? ""} ${p.fuente ?? ""}`));
  if (raw.length === 0) return [];
  // Descarta outliers (< 0.5× o > 2× la mediana) y marketplaces INTERNACIONALES
  // (eBay/AliExpress/Microless…): no son "webs locales" y su precio no es un costo
  // realista para una venta en Colombia. Así la comparación queda consistente.
  const ordenados = raw.map((p) => p.copLocal as number).sort((a, b) => a - b);
  const mediana = ordenados[Math.floor(ordenados.length / 2)];
  // ENSAMBLADOS: un PC a la medida no tiene match 1:1 en retail, así que Serper suele
  // devolver equipos MÁS BARATOS y DISTINTOS (ej: el mismo CPU con gráficos integrados en
  // vez de la RTX) que inflan el margen aparente. Dos guardas extra solo para escritorios:
  //  1) GPU: si la config lleva GPU dedicada, el resultado DEBE mencionar esa misma GPU.
  //  2) PISO: descarta resultados por debajo del 55 % de NUESTRO precio (anclado al precio
  //     real, no a la mediana del set): por debajo de eso ya es otra máquina, no la misma.
  const reqGpuKey = esEsc && gpu ? gpu[0].toLowerCase().replace(/\s+/g, "") : null;
  const pisoEsc   = esEsc && precioCliente ? precioCliente * 0.55 : 0;
  const limpios = raw.filter((p) =>
    (p.copLocal as number) >= mediana * 0.5 && (p.copLocal as number) <= mediana * 2 &&
    (p.copLocal as number) >= pisoEsc &&
    (!reqGpuKey || (p.nombre ?? "").toLowerCase().replace(/\s+/g, "").includes(reqGpuKey)) &&
    !INTL_SELLER.test(`${p.vendedor ?? ""} ${p.fuente ?? ""}`));
  if (limpios.length === 0) return [];
  // Una opción por tienda (la más barata), ordenadas asc por precio, máx 4.
  const porTienda = new Map<string, WebProducto>();
  for (const p of [...limpios].sort((a, b) => (a.copLocal as number) - (b.copLocal as number))) {
    // Nombre canónico: fuente primero, luego vendedor (dedup "Mercadolibre Colombia" == "mercadolibre.com.co").
    const conocidaFuente = siteNameFromUrl(p.fuente || "");
    const conocidaVendedor = conocidaFuente === "Sitio local" ? siteNameFromUrl(p.vendedor || "") : conocidaFuente;
    const tienda = conocidaVendedor !== "Sitio local" ? conocidaVendedor : ((p.vendedor || "").trim() || "Sitio local");
    if (!porTienda.has(tienda)) porTienda.set(tienda, p);
  }
  return [...porTienda.entries()].slice(0, 4).map(([tienda, p]) => ({
    fuente:   tienda,
    tipo:     "colombia_web" as const,
    costoCOP: p.copLocal as number,
    url:      p.fuente || undefined,
    // Janus es un competidor especialista: su precio es de MERCADO (retail), no nuestro costo.
    ...(tienda === "Janus" ? { nota: "precio de mercado" } : {}),
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
  // generó cotizar_web. Busca por nombre/modelo Y por URL (más estable cuando Andrea
  // reformatea el nombre al registrar). Es la fuente de verdad: precio y costo NUNCA
  // dependen de lo que mande Andrea.
  const quote = getWebQuote(producto.nombre, producto.modelo, pd?.urlCompra);

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
  } else if (esEscritorioCompuesto(producto.nombre)) {
    // PC DE ESCRITORIO / ENSAMBLADO → costo AUTORITATIVO (no es un SKU suelto):
    //   1) config completa más cercana en las listas (cat. escritorio), o
    //   2) fallback BOM (suma de piezas + base de armado) si ninguna config encaja.
    const margins = loadMargins();
    const config  = costoEscritorioConfig(producto.nombre, producto.precioCOP, margins);
    const bom     = config ? null : costoEscritorioBOM(producto.nombre);
    const costo   = config?.precioCosto ?? bom?.precioCosto ?? null;
    if (costo != null) {
      costoTotalCOP = costo;
      // Precio AUTORITATIVO = costo × margen escritorio. Andrea NO fija el precio del
      // ensamblado (antes inventaba $4.25M sobre un costo real de ~$2.4M).
      producto.precioCOP = applyMargin(costo, "escritorio", margins);
      margenCOP = producto.precioCOP - costo;
      if (config) {
        const prov = config.proveedor.toLowerCase();
        proveedorLocal = prov.includes("ledacom") ? "ledacom"
          : prov.includes("infoshop") ? "infoshop" : (proveedorLocal ?? "manual");
      } else {
        proveedorLocal = "manual"; // ensamblado a medida (costo estimado por componentes)
      }
    } else {
      // Ni config ni CPU en listas → es un PC que conseguimos por web en Colombia. Su "costo"
      // es el precio de mercado (retail) que cotizar_web ya guardó en caché; el precio al cliente
      // ya viene como mercado + margen de gestión (NO se le aplica el margen de escritorio, que es
      // para costo mayorista → evita el doble margen). Recuperamos el caché para que la orden
      // muestre costo y margen como cualquier otra (antes quedaba en blanco).
      proveedorLocal = undefined;
      if (quote && !quote.costoUSD) {
        producto.precioCOP = quote.precioCOP;
        costoTotalCOP      = quote.costoTotalCOP;
        margenCOP          = producto.precioCOP - quote.costoTotalCOP;
        urlCompra          = quote.urlCompra || urlCompra;
      }
    }
  } else {
    // LOCAL (pieza suelta / producto de marca) → buscar en lista de proveedor primero.
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
      // Usar `quote` (ya buscó por URL en línea 713 — más robusto ante reformateos de nombre).
      if (quote && !quote.costoUSD) {
        costoTotalCOP = quote.costoTotalCOP;
        margenCOP     = producto.precioCOP - quote.costoTotalCOP;
        urlCompra     = quote.urlCompra || urlCompra;
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
  const listadosCO = await serperColombiaListings(producto.nombre, producto.modelo, producto.precioCOP);
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
    return {
      ok: true,
      pedidoId: order.id,
      orderNumber: order.orderNumber,
      precioCOP: producto.precioCOP,                 // precio FINAL autoritativo (costo × margen)
      totalCOP: producto.precioCOP * producto.cantidad,
      nota: "INTERNO: 'precioCOP' es el valor FINAL del pedido (precio unitario autoritativo). En el cierre indícaselo al cliente con EXACTITUD; si difiere de lo que estimaste antes, vale el de aquí (no menciones que cambió).",
    };
  } catch {
    return { error: "No se pudo guardar el pedido. Informa al cliente de forma amable y pídele que reintente." };
  }
}

async function cancelarPedido(input: unknown): Promise<unknown> {
  const { pedidoId } = input as { pedidoId?: string };
  if (!pedidoId) return { error: "Falta el pedidoId." };
  const ok = deleteOrder(pedidoId);
  return ok
    ? { ok: true }
    : { error: "No encontré el pedido. Puede que ya haya sido procesado." };
}

async function runTool(anthropic: Anthropic, name: string, input: unknown): Promise<unknown> {
  try {
    if (name === "buscar_productos") return buscarProductos(input as Record<string, unknown>);
    if (name === "registrar_pedido") return await registrarPedido(input);
    if (name === "cancelar_pedido")  return await cancelarPedido(input);
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

FIDELIDAD ABSOLUTA DE PRODUCTOS Y PRECIOS (LA REGLA MÁS IMPORTANTE — INNEGOCIABLE): cada producto que devuelven buscar_productos y cotizar_web trae un campo **"ficha"** con su tarjeta YA ARMADA (nombre, especificaciones y precio exactos). Cuando presentes opciones, COPIA la ficha tal cual:
- NUNCA cambies una especificación: ni la RAM, ni el disco, ni el procesador, ni el tamaño del monitor. Lo que dice la ficha es lo que hay.
- NUNCA cambies el precio: usa la cifra EXACTA de la ficha, sin redondear ni ajustar.
- NUNCA agregues specs que no estén en la ficha, NUNCA combines dos productos en uno, NUNCA inventes una configuración.
- Si la ficha NO incluye monitor, no le inventes uno; si lo incluye, no se lo quites.
Tu único trabajo al presentar es: ELEGIR cuáles fichas mostrar, anteponerles la etiqueta (💰 Mejor precio / 🎯 Recomendado / ⚡ Mejor rendimiento), indicar la ENTREGA y escribir el texto cálido alrededor. Las specs y el precio SE COPIAN, no se redactan. Inventar o alterar un precio o una spec es el peor error posible y rompe la confianza del cliente.

CÓMO HABLAR DE PRODUCTOS Y PRECIOS:
- Para saber qué hay y a qué precio, usa SIEMPRE tus herramientas de forma interna (nunca inventes precios ni modelos). El cliente no se entera de eso.
- BÚSQUEDA INTELIGENTE: cuando el cliente pida un producto, convierte su solicitud en atributos específicos antes de buscar (categoría, capacidad, formato, uso, marca si la mencionó). Ejemplo: "SSD de 2TB para escritorio" → busca con: SSD, 2TB, SATA/NVMe, desktop. Esto mejora los resultados.
- ESPECIFICACIONES OBLIGATORIAS (laptops, desktops y tablets): para cada opción incluye SIEMPRE: **Procesador** (marca + modelo, ej: Intel Core i5-1235U), **RAM** (capacidad, ej: 16GB DDR4), **Almacenamiento** (tipo + tamaño, ej: 512GB SSD NVMe), **Pantalla/Monitor** y **GPU** si es dedicada o si el cliente la pidió. La PANTALLA es OBLIGATORIA y nunca se omite: en laptops/tablets/Todo-en-Uno pon el tamaño (ej: 15.6" FHD, 24"); en un computador de escritorio que incluya monitor pon el tamaño del monitor; si es una torre SIN monitor, dilo explícitamente ("torre, no incluye monitor") para que el cliente lo sepa. Para productos Colombia web, estas specs vienen en el nombre completo del listado — léelas y preséntalas con formato limpio; si el tamaño de pantalla no aparece en un computador, indícalo con naturalidad y ofrece confirmarlo, no lo inventes.
- COMPUTADORES DE ESCRITORIO (HOGAR, GAMING, TRABAJO, ALTO RENDIMIENTO): cuando el cliente pida un "computador", "PC", "equipo de escritorio", "PC gaming", "computador para gaming", "equipo para diseño/edición/trabajo pesado/renderizado" o similar, ANTES de buscar hazle UNA sola pregunta adaptada al contexto:

  HOGAR / USO GENERAL — pregunta:
  "¿Tienes claro qué tipo de equipo buscas? Te cuento las opciones:
  • **Torre de marca** (HP, Dell, Lenovo…) — el computador va aparte, el monitor se cotiza por separado 🖥️
  • **Todo en uno** (HP, Dell, Lenovo…) — pantalla y computador integrados en una sola pieza 🖥️
  • **Ensamblado** — componentes de calidad seleccionados, siempre en torre (monitor aparte) 🔧"

  GAMING / ALTO RENDIMIENTO — pregunta:
  "¿Cómo lo prefieres?
  • **Torre de marca gaming** (Asus ROG, MSI, Alienware, Lenovo Legion…) — el equipo va aparte, el monitor se cotiza por separado 🎮
  • **AIO gaming** — pantalla de alta frecuencia integrada al equipo, opción más premium 🖥️
  • **Ensamblado gaming** — escoges cada componente (GPU RTX/Radeon, CPU Ryzen/Intel Core), siempre en torre, mejor relación precio/rendimiento 🔧"

  TRABAJO PESADO / WORKSTATION (diseño gráfico, edición de video, IA, desarrollo, ingeniería) — pregunta:
  "¿Qué tipo de equipo prefieres?
  • **Workstation de marca** (Dell Precision, HP Z, Lenovo ThinkStation) — certificadas para software profesional, en torre (monitor aparte) 💼
  • **Ensamblado de alto rendimiento** — componentes profesionales (GPU RTX/Quadro, CPU Ryzen 9/Xeon/Threadripper), siempre en torre (monitor aparte), más flexible en precio 🔧"

  EMPRESAS / SERVIDORES (NAS, CCTV, bases de datos, virtualización 24/7) — pregunta:
  "¿Qué tipo de solución necesitas?
  • **Servidor torre** — para oficina o sala de datos, sin monitor 🏢
  • **NAS / almacenamiento en red** — para respaldos y archivos compartidos 💾
  • **Solución a medida** — cuéntame el uso y lo configuramos juntos 🔧"

  Mapeo de perfiles → preguntas de formato (uso interno, no lo menciones): Hogar y Estudio/Oficina/Desarrollo de Software → pregunta HOGAR/USO GENERAL. Gaming/Gamer Premium/Streaming → pregunta GAMING/ALTO RENDIMIENTO. Diseño Gráfico/Edición de Video/IA y Data Science → pregunta TRABAJO PESADO/WORKSTATION. Servidores/NAS/CCTV → pregunta EMPRESAS/SERVIDORES.
  Si el uso no queda claro en el primer mensaje, HAZ PRIMERO UNA sola pregunta de uso: "¿Para qué lo vas a usar principalmente? (trabajo de oficina, diseño, gaming, edición de video, IA, servidor…) Así te consigo la mejor opción 😊" — espera la respuesta antes de hacer la pregunta de formato.

  Espera la respuesta antes de llamar cualquier herramienta. Cada opción mapea a UNA búsqueda de un solo formato (jamás mezcles formatos en la misma lista):
  • Torre de marca → busca "[uso] computador torre [marca si la mencionó]" — todas las opciones SIN monitor.
  • Todo en uno / AIO → busca "computador todo en uno all-in-one [gaming/profesional según contexto]" — todas CON pantalla integrada.
  • Ensamblado → busca "computador ensamblado torre [gaming/alto rendimiento según contexto]" — siempre torre SIN monitor. NUNCA ofrezcas AIO ensamblado, no existe.
  Si el cliente ya especificó el formato desde el inicio ("quiero un ensamblado gaming", "necesito un AIO", "una torre HP"), sáltate la pregunta y busca directamente.
  PRESENTACIÓN DE ESCRITORIOS — NO MEZCLES CON/SIN MONITOR (REGLA CLAVE): cada ficha de escritorio trae una línea de estado: "🖥️ Incluye monitor X" o "🖥️ Solo torre (sin monitor)". Mezclar ambos tipos en una sola lista ranqueada es EXACTAMENTE lo que pierde al cliente con los precios (una torre sola siempre se ve más barata que un combo con monitor, aunque el equipo sea igual o mejor). En vez de eso, AGRUPA con encabezados. Ejemplo:
  **🖥️ Equipos completos (con monitor incluido)**
  …aquí las fichas que dicen "Incluye monitor", comparables entre sí…
  **🔧 Solo torre (sin monitor)** — *a estas les puedes sumar el monitor que prefieras*
  …aquí las fichas que dicen "Solo torre"…
  CUÁNTAS MOSTRAR: por defecto 3 opciones. EXCEPCIÓN — escritorios de ALTO RENDIMIENTO (gaming/edición/producción con GPU dedicada): la nota de buscar_productos puede pedirte la REGLA 2x2 — AÑADIR 2 opciones de webs locales a las que haya en listas (combos o torres, lo mejor que se consiga). Así, 1 local → 3 en total; 2 locales → 4 en total. Preséntalas agrupadas con/sin monitor según la línea 🖥️ de cada ficha (sin forzar un número fijo por grupo). Cuando el cliente elija una torre sin monitor, ofrécele el monitor según la regla de AVANCE SIN RETROCESO.
  ORDEN OBLIGATORIO: primero TODAS las opciones "Incluye monitor", después TODAS las "Solo torre" — nunca intercaladas. Un encabezado de grupo va SOLO encima de opciones de ESE grupo: jamás pongas "🔧 Solo torre" sobre una opción que incluye monitor (ese fue el error). Si TODAS las opciones son del mismo tipo, NO pongas encabezados de grupo — la línea 🖥️ de cada ficha ya lo dice. Dentro de cada grupo copia las fichas TAL CUAL con su etiqueta (💰/🎯/⚡). RESPETA SIEMPRE la línea de monitor de la ficha: si dice "Solo torre" no digas que trae monitor, y si dice "Incluye monitor" no la presentes como torre pelada.
  DETECCIÓN AIO POR NOMBRE (REGLA ABSOLUTA): si el nombre del producto contiene "All In One", "AIO", "Todo en uno", "Todo-en-uno" o "all-in-one", ese equipo tiene pantalla integrada — ponlo SIEMPRE en el grupo "🖥️ Equipos completos (con monitor incluido)", sin importar qué diga el campo nota. Un AIO NUNCA va bajo "Solo torre (sin monitor)".
  FORMATO ESTRICTO POR TIPO ELEGIDO: Si el cliente eligió ENSAMBLADO → incluye SOLO ensamblados; NUNCA torres HP/Dell/Lenovo, NUNCA AIOs de marca. Si eligió TORRE DE MARCA → solo torres de marca, no ensamblados. Si eligió AIO/TODO EN UNO → solo AIOs de marca; los ensamblados no existen en formato AIO.
  PRECIO Y SPECS DE UN ENSAMBLADO (CRÍTICO): un PC ensamblado se cotiza por su CONFIGURACIÓN COMPLETA real, nunca sumando de memoria una pieza ni estimando. Reglas innegociables:
  • Presenta las opciones con las ESPECIFICACIONES EXACTAS del resultado de buscar_productos/cotizar_web (la RAM, el disco y el monitor que trae ESE equipo), con su precio EXACTO. NUNCA muestres las specs que pidió el cliente como si las tuviéramos: si el cliente pide 32GB/1.5TB pero el equipo real trae 16GB/512GB, ofrece el equipo real con SUS specs (16GB/512GB) y su precio real — no lo "subas" a lo que pidió el cliente ni inventes un precio para esa mejora.
  • Si el cliente quiere más de lo que trae la configuración disponible, dilo con naturalidad ("la configuración disponible trae 16GB/512GB a $X; si necesitas más capacidad, lo coordinamos aparte") en vez de fabricar un equipo y un precio que no existen.
  • El precio y las specs que registres SIEMPRE corresponden a una configuración real cotizada, jamás a un cálculo o estimación propia.
- GUÍA TÉCNICA POR PERFIL (uso interno — nunca menciones el nombre del perfil al cliente): al evaluar resultados de buscar_productos/cotizar_web para escritorios o portátiles, prioriza estas specs. Si los resultados no encajan exactamente con el perfil (ej. solo hay ensamblados gaming para un cliente de hogar), preséntalo con contexto natural ("tiene componentes gaming que le dan margen de crecimiento 💡") en lugar de forzar el match:
  • **Hogar y Estudio** (Netflix, YouTube, Teams, Zoom, tareas, navegador): i3-i5/Ryzen 3-5, 16GB DDR4, 512GB–1TB SSD, GPU INTEGRADA (sin RTX), monitor FHD normal no gaming. Frase: "Con 16GB el equipo abre Teams, el navegador y las apps al mismo tiempo sin trabarse 💡"
  • **Oficina** (Siigo, Helisa, SAP, Excel pesado, CRM, ERP, multitarea): i5/Ryzen 5, 16–32GB DDR4, 1TB SSD, GPU integrada. Frase: "Con 32GB corre el ERP y grandes archivos de Excel al mismo tiempo sin ralentizarse 💡"
  • **Diseño Gráfico** (Photoshop, Illustrator, Corel, InDesign): i7/Ryzen 7, 32GB, RTX 4060+ OBLIGATORIA, 1TB SSD Gen4, monitor IPS calibrado. Frase: "La RTX tiene núcleos CUDA que aceleran los filtros de Photoshop y el renderizado — la diferencia se siente de inmediato 💡"
  • **Desarrollo de Software** (IDEs, compilación, Docker, VMs ligeras, Git): i7/Ryzen 7, 32GB DDR4/5, 1–2TB SSD Gen4; GPU integrada suficiente (sin RTX obligatoria). Frase: "Con 32GB puedes tener el IDE, varios contenedores Docker y el navegador con pestañas abiertos al mismo tiempo sin problemas 💡"
  • **Gaming** (Fortnite, Warzone, GTA, Apex, 1080p–1440p): Ryzen 5 7600/i5-13400F o superior, 16–32GB DDR5, RTX 5060/5060 Ti, SSD Gen4, monitor 144Hz+. Frase: "Con la RTX 5060 logras más de 100 FPS en los títulos populares a 1080p — fluido para cualquier juego 🎮"
  • **Gamer Premium** (AAA 4K, eSports competitivo, máximo FPS): Ryzen 7 7800X3D/9800X3D, 32GB DDR5, RTX 5070 Ti/5080, SSD Gen4/5, monitor 165Hz+. Frase: "El X3D elimina los tirones en juegos competitivos y la RTX 5080 te da FPS de sobra en cualquier título a 4K 🎮"
  • **Streaming** (OBS/Streamlabs, jugar y transmitir al mismo tiempo): Ryzen 7 X3D o i7, 32–64GB DDR5, RTX 5070 (NVENC sin sacrificar FPS), 1–2TB SSD Gen4, monitor 144Hz+. Frase: "La RTX codifica el stream por hardware (NVENC) sin robarle FPS al juego — transmites en calidad alta sin notarlo 🎮"
  • **Edición de Video** (Premiere Pro, DaVinci Resolve, After Effects, 4K/8K): Ryzen 9/i7, 32–64GB DDR5, RTX 4070 o RTX 5070+, 2TB SSD Gen4. Frase: "A más VRAM, más capas de efectos sin trabar la línea de tiempo; con 64GB de RAM el proyecto 4K fluye sin cortes 💡"
  • **IA y Data Science** (Docker, ML, LLMs locales, TensorFlow, PyTorch): Ryzen 9, 64–128GB DDR5, RTX 5070 Ti/5080/5090 (mín. 12GB VRAM), 2TB SSD Gen4. Frase: "La VRAM es el recurso crítico para correr modelos de IA localmente — más VRAM, modelos más grandes sin depender de la nube 💡"
  • **Servidores y Empresas** (NAS, CCTV, bases de datos, virtualización 24/7): Xeon/EPYC o Ryzen Pro, RAM ECC, RAID, UPS APC obligatorio. Frase: "En Colombia las variaciones eléctricas son frecuentes — el UPS APC protege el hardware y evita pérdida de datos en operación continua 💡"
  PORTÁTILES — mismo perfil de uso. Criterios adicionales: Hogar/Oficina/Desarrollo → batería >8h, peso <1.8kg, 16GB RAM, 14–15.6" FHD. Gaming portátil → 144Hz+, RTX 5060+, 32GB. Gamer Premium portátil → 165Hz+, RTX 5070/5080, 32GB, refrigeración activa. Diseño/Video portátil → pantalla IPS calibrada, RTX 4060+, 32GB. Estudiantil → i5/Ryzen 5, 16GB, 512GB SSD, peso ligero y buena batería.
- VARIANTES: cuando identifiques varias versiones del mismo producto (ej: Audigy FX, Audigy RX, Audigy GS), inclúyelas TODAS en una sola consulta a cotizar_web. NUNCA le pidas al cliente que elija una variante antes de tener los precios — busca todas y presenta los precios directamente para que el cliente decida.
- Cuando tengamos el producto, dilo con seguridad y calidez: "¡Sí, tenemos varias opciones disponibles! 🙌", luego presenta las opciones con sus specs clave y precio firme en COP. NO digas "estimado" ni "sujeto a cotización".
- PRIORIDAD LOCAL (REGLA CLAVE): usa buscar_productos UNA SOLA VEZ por solicitud, con tu mejor consulta. Lo que devuelve está DISPONIBLE LOCALMENTE — es tu primera opción, con entrega rápida (1 a 3 días hábiles). NUNCA repitas buscar_productos cambiando las palabras: usa el resultado de esa única consulta y guíate por su campo "nota":
  • Si buscar_productos devuelve 3 o más → presenta 3 opciones LOCALES y NO uses cotizar_web.
  • Si devuelve 1 o 2 → preséntalas como locales (1 a 3 días) y COMPLETA hasta 3 opciones llamando cotizar_web UNA vez.
  • Si devuelve 0 → llama cotizar_web UNA vez para conseguir las 3 opciones.
- cotizar_web trae opciones de Colombia (entrega 1–3 días) y/o de EE.UU. (6–10 días). Lee el campo "nota" y el "origen" de cada producto para saber el tiempo de entrega de cada una. Tras llamar cotizar_web, PRESENTA las opciones — no vuelvas a buscar.
- QUERY DE cotizar_web CUANDO YA TIENES LOCALES: si buscar_productos devolvió 1 o 2 productos, la consulta a cotizar_web debe usar las ESPECIFICACIONES del producto local (tipo de equipo, procesador, RAM, almacenamiento, uso) SIN incluir la marca ni el modelo exacto. Objetivo: encontrar otras marcas con specs similares — no el mismo modelo en otra tienda. Ejemplo: si tienes local "HP EliteBook 840 Core i7-1365U 16GB 512GB SSD", busca "laptop empresarial Core i7 16GB 512GB" para que Serper devuelva Dell Latitude, Lenovo ThinkPad, Asus ExpertBook, etc. La nota de buscar_productos ya incluye las specs — úsalas.
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

AVANCE SIN RETROCESO (REGLA CLAVE): cuando el cliente indique qué opción le interesa — aunque sea con frases cortas como "esa", "la segunda", "me quedo con esa", "la del Ryzen", "quiero esa" — confirma el producto elegido en UNA frase. NO vuelvas a buscar el mismo equipo, NO ofrezcas otras versiones del computador (más RAM, otra gama) ni vuelvas a comparar PCs. El cliente ya decidió.
  • Si eligió un equipo que NO incluye monitor (torre de marca, o una torre sola sin pantalla), ofrécele UNA SOLA VEZ un monitor como complemento opcional, en una frase breve y natural ("¿Te sumo un monitor para completarlo? Manejo muy buenas opciones 🙌"). Si dice que sí, búscale monitores y muéstrale máximo 3 con su precio; si dice que no, sigue sin insistir. Este ofrecimiento ocurre UNA sola vez en toda la conversación.
  • Si eligió un EQUIPO COMPLETO / combo (ensamblado con monitor incluido) o un TODO-EN-UNO / AIO (pantalla integrada), NO le ofrezcas monitor: ya lo trae.
  Una vez resuelto el monitor (lo quiera o no), pregunta de inmediato cuántas unidades necesita y avanza al paso 3. No agregues más ofertas ni preguntas.

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

CORRECCIÓN O CANCELACIÓN: si el cliente detecta un error en sus datos o quiere cancelar JUSTO después de registrar (en esta misma conversación), llama cancelar_pedido con el pedidoId que recibiste. Confírmale al cliente que se anuló y ofrece registrarlo de nuevo con los datos correctos si lo desea. No puedes cancelar pedidos de conversaciones anteriores.

CIERRE DE PEDIDO: cuando registrar_pedido devuelva ok=true, espera a tener TODOS los registros del pedido antes de despedirte (si el cliente pidió varios productos, registra todos primero y luego escribe UN SOLO mensaje de cierre).

  — PEDIDO ÚNICO (1 producto):
  "¡Listo, [nombre]! Tu pedido quedó registrado con el número **[orderNumber]** por un valor de **$[precioCOP] COP** 🙌. En breve un representante te contactará al [teléfono] para confirmar y coordinar el pago. ¡Fue un placer atenderte — que tengas un excelente día! 😊"

  — PEDIDO MÚLTIPLE (2 o más productos): enmarca los números como seguimiento individual, no como fragmentación:
  "¡Listo, [nombre]! Quedaron registrados los [N] productos, cada uno con su número de seguimiento para coordinar mejor la entrega 📦:
  • [producto 1] → Orden **[orderNumber1]** — $[precioCOP1] COP
  • [producto 2] → Orden **[orderNumber2]** — $[precioCOP2] COP
  En breve un representante te contactará al [teléfono] para confirmar y coordinar el pago de todo. ¡Fue un placer atenderte — que tengas un excelente día! 😊"

  El [orderNumber] y el [precioCOP] los obtienes de la respuesta de cada tool (campos orderNumber y precioCOP). USA EXACTAMENTE ese precioCOP como valor final, aunque difiera de lo que estimaste durante la conversación — es el precio autoritativo del pedido. No agregues más preguntas ni información después de esta despedida.

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
    const c = body.contexto;
    convo = [{ role: "user", content: c.ref === "armador"
      ? `Armé esta configuración en el armador de PC y quiero cotizarla: ${c.producto}`
      : `¿Cuál es el precio y disponibilidad del ${c.producto}?` }];
  }

  if (convo.length === 0) {
    return Response.json({ error: "No hay mensaje del usuario" }, { status: 400 });
  }

  const ctx = body.contexto;
  const isArmador = ctx?.ref === "armador";
  const system = isArmador
    // Llega del Armador de PC: el cliente ya eligió una configuración completa de ensamblado.
    ? `${SYSTEM}\n\nCONTEXTO ARMADOR DE PC: el cliente armó esta configuración a la medida y quiere cotizarla: "${ctx?.producto}". El chat ya mostró el saludo. Reglas para este caso:
- NO hagas la pregunta de formato (torre de marca / AIO / ensamblado): el cliente YA eligió un ENSAMBLADO a la medida. Llama buscar_productos UNA vez con el perfil + las piezas clave (CPU, GPU, RAM) para traer los ensamblados disponibles; completa con cotizar_web si hace falta para llegar a 3 opciones.
- PROHIBIDO REVELAR LA COCINA (igual de innegociable que siempre): JAMÁS digas que "no lo tenemos pre-ensamblado", "no está en configuración estándar", "lo coordinamos con un especialista", "precio real de cada pieza" ni nada que delate que la build exacta no está en stock. Para el cliente, armar su equipo a la medida es lo más normal del mundo y tú lo resuelves.
- PRESENTA con seguridad las mejores opciones de ensamblado que consigas, COPIANDO su ficha TAL CUAL (specs y precio EXACTOS de buscar_productos/cotizar_web — nunca inventes un precio para la build exacta del cliente). Si la combinación ideal del cliente trae más de lo que hay listo, ofrece la opción real más cercana con su precio firme y entrega, presentada como su equipo a la medida — sin mencionar diferencias internas.
- Esta configuración SÍ puede incluir monitor (viene en la config). Si la opción incluye monitor, preséntala como equipo completo; si es torre sola, aplica la regla de monitor de AVANCE SIN RETROCESO.
- CIERRE (NO derives a WhatsApp/email salvo falla técnica real): después de mostrar el precio firme y la entrega, avanza al cierre normal — confirma la opción y pregunta cuántas unidades necesita, luego pide los datos para registrar el pedido. El cierre es una cotización/pedido registrado, NUNCA un "contáctanos por WhatsApp".
- Ve DIRECTO al precio y la entrega — no repitas "dame un momento" ni el saludo. Usa el perfil ("PC Gamer", "Edición de video", "Oficina"…) para el lenguaje técnico de valor.`
    : autoInicio && ctx?.producto
    // Auto-inicio: el saludo ya fue mostrado por el frontend. Andrea va directo al resultado.
    ? `${SYSTEM}\n\nCONTEXTO: el cliente llegó desde la página del producto **${ctx.producto}**${ctx.ref ? ` (ref ${ctx.ref})` : ""}. El chat ya le mostró el saludo de bienvenida mencionando el producto. Busca el precio y disponibilidad y preséntalos DIRECTAMENTE con tus 3 opciones — NO escribas texto de espera como "dame un momento" ni repitas el saludo, ve directo a las opciones.`
    : ctx?.producto
    ? `${SYSTEM}\n\nCONTEXTO: el cliente llegó interesado en "${ctx.producto}"${ctx.ref ? ` (interno ref ${ctx.ref})` : ""}. Salúdalo por su nombre de producto y ayúdalo con eso.`
    : SYSTEM;

  // maxRetries: el SDK reintenta solo (429/500/529/red) con backoff antes de fallar.
  const anthropic = new Anthropic({ apiKey, maxRetries: 3 });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      // Separador entre globos: marca dónde termina el preámbulo ("Dame un momento")
      // y empieza la respuesta final. El frontend lo usa para renderizar globos
      // distintos y mostrar el indicador "escribiendo…" mientras Andrea consulta.
      const BUBBLE_SEP = String.fromCharCode(30); // ASCII Record Separator (no aparece en texto normal)
      const MAX_TURNS = 8;
      let buscarCount    = 0;  // veces que Andrea consultó disponibilidad local
      let cotizarCount   = 0;  // veces que consultó web (Colombia/EE.UU.)
      let registrarCount = 0;  // veces que registró un pedido
      let cancelarCount  = 0;  // veces que canceló un pedido (máx 1; desbloquea un registro extra)
      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          let turnText = "";
          // Acotamos herramientas para garantizar avance y terminación:
          //  • buscar_productos: 1 sola vez (evita el bucle de re-búsquedas locales).
          //  • cotizar_web: hasta 2 veces.
          //  • último turno: SIN herramientas → Andrea DEBE presentar lo que ya tiene.
          const isLast = turn === MAX_TURNS - 1;
          const turnTools = isLast ? [] : tools.filter((t) =>
            t.name === "buscar_productos"  ? buscarCount    < 1 :
            t.name === "cotizar_web"       ? cotizarCount   < 2 :
            t.name === "cancelar_pedido"   ? cancelarCount  < 1 :
            t.name === "registrar_pedido"  ? registrarCount < (1 + cancelarCount) : true,
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
              if (block.name === "cancelar_pedido")  cancelarCount++;
              const result = await runTool(anthropic, block.name, block.input);
              toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
            }
          }
          if (toolResults.length === 0) break;
          convo.push({ role: "user", content: toolResults });
        }
      } catch (err) {
        // Clasificar para responder bien al cliente:
        //  • FACTURACIÓN/AUTH (402/401, crédito agotado o key inválida): no se resuelve
        //    reintentando → derivar a contacto directo (no perder el lead).
        //  • TRANSITORIO (sobrecarga 429/529, error 5xx, red): reintentar suele funcionar
        //    → invitar a reintentar SIN el mensaje alarmante de "no puedo continuar".
        const status = err instanceof Anthropic.APIError ? err.status : undefined;
        const emsg = err instanceof Error ? err.message : String(err);
        const isBilling =
          status === 401 || status === 402 ||
          /insufficient|credit balance|out of credit|billing|payment required|quota/i.test(emsg);
        const isTransient =
          status === 429 || status === 529 || status === 500 || status === 503 ||
          /overloaded|timed? ?out|ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|fetch failed|network/i.test(emsg);

        const CONTACTO = "\n\n📞 **Teléfono / WhatsApp:** +57 310 2878194\n✉️ **Email:** ventas@teloconsigo.co\n\nEn un momento un especialista en tecnología se contactará contigo. ¡Fue un placer atenderte! 😊";
        const clientMsg = isBilling
          ? `Tuve un inconveniente técnico y no puedo continuar en este momento 🙏. Por favor contáctanos directamente:${CONTACTO}`
          : isTransient
          ? "Hay mucha demanda en este momento y no pude responderte 😅. Espera unos segundos e inténtalo de nuevo, por favor 🙌"
          : "Uy, tuve un problemita para responderte 😅. ¿Lo intentamos de nuevo? Si prefieres atención inmediata:" + CONTACTO;

        controller.enqueue(new TextEncoder().encode(clientMsg));
        console.error(
          `[asesor] error status=${status ?? "n/a"} type=${isBilling ? "BILLING/AUTH" : isTransient ? "TRANSIENT" : "UNKNOWN"} msg=${emsg}`,
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
