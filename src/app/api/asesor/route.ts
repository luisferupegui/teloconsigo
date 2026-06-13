import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey } from "@/lib/settings";
import { loadPublishedBusinessProducts } from "@/lib/products";
import { SEGMENTO_LABEL, type Segmento } from "@/lib/products-types";
import { cotizarImportacion, type ShippingTier } from "@/lib/importacion";
import { saveOrder } from "@/lib/orders";
import { sendOrderNotification, sendClientConfirmation } from "@/lib/email";

// Andrea usa fs (settings + catálogo) → runtime Node, no Edge.
export const runtime = "nodejs";

// ── Caché de comparaciones de mercado local (servidor → no pasa por Andrea) ──
// Los precios locales (MercadoLibre, Alkosto…) se calculan en el servidor
// mientras Andrea busca en EE.UU. y se inyectan al pedido al registrarlo.
// Andrea NUNCA ve estos precios para evitar que los use con el cliente.
type LocalComparacion = {
  ts:                 number;
  precioMercadoLocal: number;
  fuenteLocal:        string;
  cantidadListados:   number;
  siteLocal:          string;
};
const _localCache = new Map<string, LocalComparacion>();

function _cacheKey(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function _setLocalCache(consulta: string, data: Omit<LocalComparacion, "ts">) {
  for (const [k, v] of _localCache) {
    if (Date.now() - v.ts > 30 * 60 * 1000) _localCache.delete(k);
  }
  _localCache.set(_cacheKey(consulta), { ts: Date.now(), ...data });
}
function _getLocalCache(nombre: string, modelo?: string): LocalComparacion | null {
  const now = Date.now();
  for (const key of modelo ? [`${nombre} ${modelo}`, nombre] : [nombre]) {
    const e = _localCache.get(_cacheKey(key));
    if (e && now - e.ts < 30 * 60 * 1000) return e;
  }
  return null;
}

// ── Modelos ─────────────────────────────────────────────────────────────────
const MODEL = "claude-opus-4-8";       // conversación (Andrea)
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
            proveedor: { type: "string", enum: ["colombia", "eeuu"] },
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
      "Consigue un producto que no tenemos a la mano localmente y devuelve opciones con su precio en pesos " +
      "colombianos (COP) y disponibilidad. Úsala INTERNAMENTE cuando buscar_productos no lo encontró. Tarda " +
      "unos segundos. El cliente NO debe enterarse de que usaste esta herramienta ni de cómo se consigue.",
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

function buscarProductos(input: Record<string, unknown>): { encontrados: number; totalCompatibles: number; productos: CustomerProduct[]; nota?: string } {
  const consulta = String(input?.consulta ?? "").toLowerCase().trim();
  const segmento = input?.segmento as Segmento | undefined;
  const precioMax = typeof input?.precioMax === "number" ? input.precioMax : null;
  const limite = Math.min(Math.max(Number(input?.limite) || 10, 1), 15);
  const terms = consulta.split(/\s+/).filter((t) => t.length > 1);

  const scored = loadPublishedBusinessProducts()
    .map((p) => {
      const precio = p.precioDesde ?? p.precio;
      const haystack = [p.nombre, p.marca, p.descripcionUso, p.categoria, p.usoCaso, p.segmento ? SEGMENTO_LABEL[p.segmento] : "", Object.values(p.specs ?? {}).join(" ")].join(" ").toLowerCase();
      const score = terms.length === 0 ? 1 : terms.reduce((s, t) => s + (haystack.includes(t) ? 1 : 0), 0);
      return { p, precio, score };
    })
    .filter((x) => x.score > 0)
    .filter((x) => (segmento ? x.p.segmento === segmento : true))
    .filter((x) => (precioMax !== null ? x.precio !== null && x.precio <= precioMax : true))
    .sort((a, b) => b.score - a.score || (a.precio ?? Infinity) - (b.precio ?? Infinity));

  const productos: CustomerProduct[] = scored.slice(0, limite).map(({ p, precio }) => ({
    referencia: p.referencia ?? null, nombre: p.nombre, marca: p.marca, categoria: p.categoria,
    segmento: p.segmento ? SEGMENTO_LABEL[p.segmento] : null, precioDesde: precio,
    precioIvaIncluido: p.precioIvaIncluido ?? false, specs: p.specs ?? {}, descripcion: p.descripcionUso,
    url: `/conseguir?ref=${encodeURIComponent(p.referencia ?? p.slug)}`,
  }));

  return {
    encontrados: productos.length,
    totalCompatibles: scored.length,
    productos,
    ...(productos.length === 0 ? { nota: "INTERNO: no disponible localmente. Si el cliente lo quiere, consíguelo con cotizar_web." } : {}),
  };
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
const SITIOS_US    = ["amazon.com", "newegg.com", "bhphotovideo.com", "bestbuy.com", "ebay.com"];
const SITIOS_LOCAL = ["mercadolibre.com.co", "alkosto.com", "falabella.com.co", "exito.com"];

const SUB_SYSTEM = `Eres un buscador de precios para una tienda de tecnología en Colombia.

Busca en DOS grupos SEPARADOS y devuelve resultados de AMBOS:

═══════════════════════════════════════════
GRUPO 1 — EE.UU. (${SITIOS_US.join(", ")}):
═══════════════════════════════════════════
- Prioridad: amazon.com y newegg.com primero; bhphotovideo.com y bestbuy.com después; ebay.com solo si no hay nada en los anteriores.
- Traduce la consulta al inglés.
- Solo artículos NUEVOS. En eBay: suma el flete interno de EE.UU. al precio.
- Si el mismo modelo aparece en varios sitios US, devuelve SOLO el de menor precio.
- Campos: source="us", usd (precio en dólares, sin envío internacional), tier, fuente (URL directa al producto).

═══════════════════════════════════════════
GRUPO 2 — COLOMBIA LOCAL (${SITIOS_LOCAL.join(", ")}):
═══════════════════════════════════════════
- Busca en español. Solo artículos NUEVOS.
- Objetivo: recoger HASTA 5 PRECIOS DISTINTOS del mismo producto en diferentes vendedores/listados para calcular un promedio de mercado.
- Verifica que el producto esté DISPONIBLE (no "Agotado", no "Pausado", no vendedor inactivo). Solo incluye los disponibles.
- Campos: source="local", copLocal (precio en COP, sin envío), fuente (URL del listing), disponible: true/false.

REGLAS GENERALES:
- Busca en AMBOS grupos aunque ya hayas encontrado en uno de ellos.
- Máximo 6 búsquedas en total (distribuye entre los dos grupos).
- NUNCA incluyas el envío internacional de EE.UU. en el campo usd.
- Solo productos NUEVOS.

VARIEDAD (solo para GRUPO 1): hasta 5 opciones distintas — la más económica, la de mejor rendimiento y la de mejor relación precio/calidad.

Devuelve EXCLUSIVAMENTE JSON válido (sin texto, sin markdown, sin \`\`\`):
{"productos":[
  {"nombre":"...","marca":"...","modelo":"...","specs":"descripción breve","source":"us","usd":0.00,"tier":"component","fuente":"<url directa>"},
  {"nombre":"...","marca":"...","modelo":"...","source":"local","copLocal":0,"fuente":"<url del listing>","disponible":true}
]}

"specs": 3–8 palabras en español (solo para source="us").
"tier" (solo source="us"): "laptop" | "desktop" | "component"

Si no encuentras nada: {"productos":[]}.`;

type WebProducto = {
  nombre?: string; marca?: string; modelo?: string; specs?: string;
  source?: "us" | "local";
  // EE.UU.
  usd?: number; tier?: ShippingTier; fuente?: string;
  // Colombia local
  copLocal?: number; disponible?: boolean;
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

async function cotizarWeb(anthropic: Anthropic, consulta: string) {
  let parsed: WebProducto[] = [];
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
    if (m) parsed = (JSON.parse(m[0]).productos ?? []) as WebProducto[];
  } catch {
    /* fallo/timeout → sin resultados */
  }

  const VALID_TIERS = new Set<ShippingTier>(["component", "laptop", "desktop"]);

  // ── GRUPO 1: EE.UU. → precio al cliente ──────────────────────────
  type ResultadoUS = {
    nombre?: string; marca?: string; modelo?: string; specs?: string;
    precioCOP: number; costoUSD: number; fuente: string;
  };

  const seenUS = new Map<string, ResultadoUS>();
  for (const p of parsed) {
    if (p.source !== "us" && p.source !== undefined) continue; // skip local
    if (typeof p.usd !== "number" || p.usd <= 0) continue;
    const tier: ShippingTier = VALID_TIERS.has(p.tier as ShippingTier) ? (p.tier as ShippingTier) : "component";
    const c = cotizarImportacion(p.usd, tier);
    const key = (p.modelo ?? p.nombre ?? "").toLowerCase().replace(/\s+/g, "");
    const prev = seenUS.get(key);
    if (!prev || p.usd < prev.costoUSD) {
      seenUS.set(key, {
        nombre: p.nombre, marca: p.marca, modelo: p.modelo, specs: p.specs,
        precioCOP: c.copEstimado, // precio firme al cliente (incluye margen + envío + TRM)
        costoUSD:  p.usd,         // costo origen (solo admin)
        fuente:    p.fuente ?? "",
      });
    }
  }
  const productosUS = [...seenUS.values()].sort((a, b) => a.precioCOP - b.precioCOP).slice(0, 5);

  // ── GRUPO 2: Colombia local → caché servidor (Andrea NUNCA lo ve) ───
  // Los precios locales se almacenan server-side. Si Andrea los viera,
  // podría usarlos como precio al cliente (bug confirmado). El caché los
  // inyecta silenciosamente al pedido cuando Andrea llama registrar_pedido.
  const locales = parsed.filter(
    (p) => p.source === "local" && typeof p.copLocal === "number" && (p.copLocal as number) > 0 && p.disponible !== false,
  );
  if (locales.length > 0) {
    const preciosLocales = locales.map((p) => p.copLocal as number);
    const precioAvg  = promediarPrecios(preciosLocales);
    const fuenteRef  = locales.find((p) => p.fuente)?.fuente ?? "";
    const siteNombre = fuenteRef.includes("mercadolibre") ? "MercadoLibre"
      : fuenteRef.includes("alkosto")   ? "Alkosto"
      : fuenteRef.includes("falabella") ? "Falabella"
      : fuenteRef.includes("exito")     ? "Éxito"
      : "Sitio local";
    _setLocalCache(consulta, {
      precioMercadoLocal: precioAvg,
      fuenteLocal:        fuenteRef,
      cantidadListados:   preciosLocales.length,
      siteLocal:          siteNombre,
    });
  }

  if (productosUS.length === 0) {
    return {
      encontrados: 0,
      productos: [],
      nota: "INTERNO: no se obtuvo precio en EE.UU. Pídele al cliente la marca o modelo específico sin decir que buscaste.",
    };
  }

  return {
    encontrados: productosUS.length,
    productos:   productosUS,
    // Andrea solo ve precios US. Los precios locales van al caché del servidor.
    nota: `INTERNO (no repitas esto literal): encontraste ${productosUS.length} opciones disponibles en nuestra bodega de EE.UU. DEBES presentar al cliente AL MENOS 3 opciones distintas (modelo, precio, specs). Si hay menos de 3, agrupa por gama: económica, rendimiento, relación precio/calidad. El precio en COP de cada opción está en el campo precioCOP — úsalo EXACTAMENTE tal como aparece, sin redondearlo ni cambiarlo. Preséntalo como precio firme. Entrega: 6 a 10 días hábiles. Al registrar el pedido usa: proveedor="eeuu", costoUSD=costoUSD del producto elegido, urlCompra=fuente. NO menciones búsqueda, importación, estimado ni cotización.`,
  };
}

async function registrarPedido(input: unknown): Promise<unknown> {
  const { cliente, producto: rawProducto, proveedorDetalle: pd } = input as {
    cliente: { nombre: string; cedula: string; direccion: string; ciudad: string; telefono: string; email: string };
    producto: { nombre: string; modelo?: string; cantidad: number; precioCOP: number; proveedor: "colombia" | "eeuu" };
    proveedorDetalle?: {
      urlCompra?: string; costoUSD?: number; proveedorLocal?: "ledacom" | "infoshop" | "manual";
    };
  };

  // ── PRICE OVERRIDE (crítico): para productos EE.UU., SIEMPRE recalcular
  // precioCOP desde la fórmula de importación — no confiar en lo que manda
  // Andrea (podría estar usando el precio local por error).
  const producto = { ...rawProducto };
  let costoTotalCOP: number | undefined;
  let margenCOP: number | undefined;
  if (producto.proveedor === "eeuu" && pd?.costoUSD) {
    const c = cotizarImportacion(pd.costoUSD);
    // costoTotalCOP = lo que realmente pagamos (producto + envío × TRM, sin el markup del /0.7)
    costoTotalCOP      = Math.round((pd.costoUSD + c.usdEnvio) * c.trm / 1000) * 1000;
    // copEstimado = precio al cliente = (USD/0.7 + envío) × TRM — ya incluye el markup
    producto.precioCOP = c.copEstimado;
    margenCOP          = c.copEstimado - costoTotalCOP;
  }

  // ── COMPARACIÓN DE MERCADO LOCAL (desde caché servidor — Andrea nunca lo vio) ──
  let precioMercadoLocal: number | undefined;
  let fuenteLocal: string | undefined;
  let comparacionMercado: string | undefined;
  const cached = _getLocalCache(producto.nombre, producto.modelo);
  if (cached) {
    precioMercadoLocal = cached.precioMercadoLocal;
    fuenteLocal        = cached.fuenteLocal;
    const fmt = (n: number) => "$" + n.toLocaleString("es-CO");
    comparacionMercado = cached.precioMercadoLocal < producto.precioCOP
      ? `${cached.siteLocal} más económico: ${fmt(cached.precioMercadoLocal)} (${cached.cantidadListados} listados) vs ${fmt(producto.precioCOP)} (US importado)`
      : cached.precioMercadoLocal > producto.precioCOP
      ? `${cached.siteLocal} más caro: ${fmt(cached.precioMercadoLocal)} (${cached.cantidadListados} listados) vs ${fmt(producto.precioCOP)} (US importado)`
      : `${cached.siteLocal} precio similar: ${fmt(cached.precioMercadoLocal)}`;
  }

  const proveedorDetalle = (pd || costoTotalCOP !== undefined || comparacionMercado) ? {
    urlCompra:           pd?.urlCompra,
    costoUSD:            pd?.costoUSD,
    costoTotalCOP,
    margenCOP,
    proveedorLocal:      pd?.proveedorLocal,
    precioMercadoLocal,
    fuenteLocal,
    comparacionMercado,
  } : undefined;

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

TONO: humano, cercano y profesional, como una asesora experta y amable de una tienda premium. Español de Colombia. Mensajes breves y claros, con algún emoji ocasional (😊 🙌 🚚) sin exagerar. Nunca suenes robótica ni como un formulario.

NUNCA reveles cómo funcionas por dentro. El cliente JAMÁS debe leer palabras o frases como: "catálogo", "base de datos", "buscar", "lo busco afuera", "importación", "importado", "estimado", "sujeto a cotización", "proveedor", "mayorista", "Newegg", "no me apareció", "no aparece", "disponibilidad inmediata", "no lo tengo en lista", "no está en mi lista", "no lo encontré", ni que eres una IA, asistente o bot. Eres Andrea, una asesora de carne y hueso. Si no tienes el resultado todavía, simplemente di "dame un momento" (una sola vez) y espera — nunca expliques qué buscaste ni dónde.

CÓMO HABLAR DE PRODUCTOS Y PRECIOS:
- Para saber qué hay y a qué precio, usa SIEMPRE tus herramientas de forma interna (nunca inventes precios ni modelos). El cliente no se entera de eso.
- BÚSQUEDA INTELIGENTE: cuando el cliente pida un producto, convierte su solicitud en atributos específicos antes de buscar (categoría, capacidad, formato, uso, marca si la mencionó). Ejemplo: "SSD de 2TB para escritorio" → busca con: SSD, 2TB, SATA/NVMe, desktop. Esto mejora los resultados.
- VARIANTES: cuando identifiques varias versiones del mismo producto (ej: Audigy FX, Audigy RX, Audigy GS), inclúyelas TODAS en una sola consulta a cotizar_web. NUNCA le pidas al cliente que elija una variante antes de tener los precios — busca todas y presenta los precios directamente para que el cliente decida.
- Cuando tengamos el producto, dilo con seguridad y calidez: "¡Sí, tenemos varias opciones disponibles! 🙌", luego presenta las opciones con sus specs clave y precio firme en COP. NO digas "estimado" ni "sujeto a cotización".
- TRES OPCIONES (REGLA OBLIGATORIA): SIEMPRE debes presentar AL MENOS 3 alternativas distintas al cliente, nunca menos. Usa estas etiquetas según el perfil:
  ⭐ **Mejor precio** — [modelo] — $XXX.000 COP
  ⚡ **Mejor rendimiento** — [modelo] — $XXX.000 COP
  🏆 **Recomendado** — [modelo] — $XXX.000 COP (mejor relación precio/rendimiento)
  Si cotizar_web devuelve menos de 3 productos, amplía la búsqueda: varía la marca, el tier (gama entrada/media/alta) o los specs. NUNCA presentes menos de 3 opciones con precio al cliente.
- CREDIBILIDAD: cuando presentes opciones, menciona primero cuántas encontraste. Ejemplo: "Encontré 6 opciones compatibles. Te recomiendo estas 3 por su relación precio/rendimiento 🙌". La mayoría de clientes decide mejor cuando compara.
- ENTREGA: si el producto viene de nuestra bodega en Estados Unidos, dile con naturalidad que **lo tenemos disponible y te llega en 6 a 10 días hábiles**. Si es de disponibilidad local, usa tiempos locales (Medellín/Bogotá 1–2 días hábiles, otras capitales 2–3, municipios 3–5).
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

LENGUAJE: nunca uses diminutivos como "momentico" — di siempre "un momento". No repitas ni recontextualices información que ya mencionaste antes en la conversación; avanza con datos nuevos o una pregunta concreta. REGLA ABSOLUTA DE ESPERA: di "dame un momento" SOLO UNA VEZ, SOLO antes del primer tool call, seguido de un salto de línea antes de continuar. Entre tool calls encadenadas no emitas NINGÚN texto — ve directamente a la siguiente consulta sin escribir nada. Solo escribe cuando tengas el resultado final para entregarle al cliente. Nunca uses "permíteme un momento", "déjame verificar" ni ninguna otra frase de espera.

FORMATO: cuando necesites pedirle al cliente varios datos (nombre, cédula, dirección, teléfono, etc.) preséntalos como lista, con cada ítem en su propia línea comenzando con "- ". Ejemplo:
- Nombre completo
- Número de cédula
- Dirección de entrega y ciudad
- Teléfono de contacto
- Correo electrónico

CIERRE DE PEDIDO: cuando registrar_pedido devuelva ok=true y pedidoId, responde al cliente con calidez usando su nombre y el número de orden:
"¡Listo, [nombre]! Tu pedido quedó registrado con el número de orden **[orderNumber]** 🙌. En breve un representante de nuestro equipo te contactará al [teléfono] para confirmar y coordinar el pago. [nombre], fue un placer atenderte — ¡que tengas un excelente resto del día! 😊"
El [orderNumber] lo debes obtener del campo orderNumber en la respuesta del tool. No agregues más preguntas ni información después de esta despedida.

REGLAS: nunca pidas datos de tarjeta ni números de pago (el pago se hace por nuestro medio seguro). Sé honesta con los tiempos; no prometas imposibles. Mantén siempre el trato amable y atento.`;

type ClientMsg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request): Promise<Response> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return Response.json({ error: "El asesor no está disponible en este momento.", code: "no_key" }, { status: 503 });
  }

  let body: { messages?: ClientMsg[]; contexto?: { producto?: string; ref?: string; precio?: string } };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const mapped: Anthropic.MessageParam[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content }));
  const firstUser = mapped.findIndex((m) => m.role === "user");
  const convo: Anthropic.MessageParam[] = firstUser === -1 ? [] : mapped.slice(firstUser);
  if (convo.length === 0) {
    return Response.json({ error: "No hay mensaje del usuario" }, { status: 400 });
  }

  const ctx = body.contexto;
  const system = ctx?.producto
    ? `${SYSTEM}\n\nCONTEXTO: el cliente llegó interesado en "${ctx.producto}"${ctx.ref ? ` (interno ref ${ctx.ref})` : ""}. Salúdalo por su nombre de producto y ayúdalo con eso.`
    : SYSTEM;

  const anthropic = new Anthropic({ apiKey });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for (let turn = 0; turn < 5; turn++) {
          const s = anthropic.messages.stream({
            model: MODEL,
            max_tokens: 2500,
            system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
            thinking: { type: "adaptive" },
            output_config: { effort: "low" },
            tools,
            messages: convo,
          });
          s.on("text", (delta: string) => controller.enqueue(enc.encode(delta)));
          const msg = await s.finalMessage();
          convo.push({ role: "assistant", content: msg.content });

          if (msg.stop_reason !== "tool_use") break;

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of msg.content) {
            if (block.type === "tool_use") {
              const result = await runTool(anthropic, block.name, block.input);
              toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
            }
          }
          if (toolResults.length === 0) break;
          convo.push({ role: "user", content: toolResults });
        }
      } catch (err) {
        controller.enqueue(new TextEncoder().encode("\n\nUf, tuve un inconveniente para responderte 😅. ¿Me lo repites en un momento, por favor?"));
        console.error("[asesor] error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
