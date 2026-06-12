import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey } from "@/lib/settings";
import { loadPublishedBusinessProducts } from "@/lib/products";
import { SEGMENTO_LABEL, type Segmento } from "@/lib/products-types";
import { cotizarImportacion, cotizarLocal, type ShippingTier, type LocalCategoria } from "@/lib/importacion";
import { saveOrder } from "@/lib/orders";
import { sendOrderNotification, sendClientConfirmation } from "@/lib/email";

// Andrea usa fs (settings + catálogo) → runtime Node, no Edge.
export const runtime = "nodejs";

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
const SITIOS_US    = ["amazon.com", "newegg.com", "bhphotovideo.com", "bestbuy.com", "ebay.com"];
const SITIOS_LOCAL = ["mercadolibre.com.co", "alkosto.com", "falabella.com.co"];

const SUB_SYSTEM = `Eres un buscador de precios para una tienda de tecnología en Colombia.

BÚSQUEDA — busca SIEMPRE en ambos grupos de sitios:

GRUPO US (${SITIOS_US.join(", ")}):
- Orden de preferencia: amazon.com y newegg.com primero; bhphotovideo.com y bestbuy.com después; ebay.com solo si no hay resultado en los anteriores.
- En eBay: solo artículos NUEVOS. Suma el flete interno de EE.UU. al precio del producto para obtener el USD correcto.
- Otros sitios US: usa solo el precio del producto (envío dentro de EE.UU. suele ser gratis).
- Traduce la consulta al inglés.
- Usa source="us" y el campo usd (precio en dólares, incluyendo flete interno si aplica).

GRUPO LOCAL (${SITIOS_LOCAL.join(", ")}):
- Solo productos NUEVOS. Usa el precio en COP tal como aparece en el sitio (sin envío).
- Busca en español.
- Usa source="local" y el campo copLocal (precio en pesos colombianos).

REGLAS:
- Busca en AMBOS grupos — no pares solo porque encontraste precio en uno de ellos.
- Si el mismo producto aparece en varios sitios del mismo grupo, devuelve el de MENOR precio.
- Máximo 6 búsquedas en total.
- NUNCA incluyas el envío internacional que muestran los sitios (se calcula aparte).

VARIEDAD: devuelve hasta 5 opciones con diversidad — incluye la más económica, la de mejor rendimiento y la de mejor relación precio/calidad. No devuelvas solo las más baratas si hay opciones de mayor calidad disponibles.

Devuelve EXCLUSIVAMENTE un objeto JSON válido (sin texto, sin markdown, sin \`\`\`):
{"productos":[
  {"nombre":"...","marca":"...","modelo":"...","specs":"descripción breve (ej: NVMe Gen4 alta velocidad)","source":"us","usd":0.00,"tier":"component","fuente":"<url>"},
  {"nombre":"...","marca":"...","modelo":"...","specs":"descripción breve (ej: SATA económico, buena relación precio/calidad)","source":"local","copLocal":0,"localCategoria":"accesorio","fuente":"<url>"}
]}

"specs": 3–8 palabras en español que describan el perfil del producto (rendimiento, uso ideal, nivel de gama).
"tier" (solo source="us"): "laptop" | "desktop" | "component"
"localCategoria" (solo source="local"): tablet | portatil | all_in_one | equipo_corporativo | servidor | nas | tarjeta_grafica | procesador | accesorio | licencia | antivirus

Si no encuentras precios reales en ningún sitio: {"productos":[]}.`;

type WebProducto = {
  nombre?: string; marca?: string; modelo?: string; specs?: string;
  usd?: number; copLocal?: number;
  tier?: ShippingTier; localCategoria?: LocalCategoria;
  source?: "us" | "local"; fuente?: string;
};

async function cotizarWeb(anthropic: Anthropic, consulta: string) {
  let parsed: WebProducto[] = [];
  try {
    const sub = await anthropic.messages.create(
      {
        model: MODEL_WEB,
        max_tokens: 2000,
        system: SUB_SYSTEM,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
        messages: [{ role: "user", content: consulta }],
      },
      { timeout: 45000, maxRetries: 0 },
    );
    const text = sub.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
    const m = text.match(/\{[\s\S]*\}/);
    if (m) parsed = (JSON.parse(m[0]).productos ?? []) as WebProducto[];
  } catch {
    /* fallo/timeout → sin resultados */
  }

  const VALID_TIERS      = new Set<ShippingTier>(["component", "laptop", "desktop"]);
  const VALID_LOCAL_CATS = new Set<string>([
    "tablet", "portatil", "all_in_one", "equipo_corporativo", "servidor", "nas",
    "tarjeta_grafica", "procesador", "accesorio", "licencia", "antivirus",
  ]);

  type Resultado = { nombre?: string; marca?: string; modelo?: string; specs?: string; precioCOP: number; entrega: "us" | "local" };

  const mapeados: Resultado[] = parsed
    .filter((p) => {
      if (p.source === "local") return typeof p.copLocal === "number" && (p.copLocal as number) > 0;
      return typeof p.usd === "number" && (p.usd as number) > 0;
    })
    .map((p): Resultado => {
      if (p.source === "local") {
        const cat: LocalCategoria = VALID_LOCAL_CATS.has(p.localCategoria as string)
          ? (p.localCategoria as LocalCategoria)
          : "accesorio";
        const c = cotizarLocal(p.copLocal as number, cat);
        return { nombre: p.nombre, marca: p.marca, modelo: p.modelo, specs: p.specs, precioCOP: c.precioFinal, entrega: "local" };
      }
      const tier: ShippingTier = VALID_TIERS.has(p.tier as ShippingTier) ? (p.tier as ShippingTier) : "component";
      const c = cotizarImportacion(p.usd as number, tier);
      return { nombre: p.nombre, marca: p.marca, modelo: p.modelo, specs: p.specs, precioCOP: c.copEstimado, entrega: "us" };
    });

  const totalEncontradas = mapeados.length;

  // Si el mismo modelo aparece en US y local, conservar el más barato
  const seen = new Map<string, Resultado>();
  for (const r of mapeados) {
    const key = (r.modelo ?? r.nombre ?? "").toLowerCase().replace(/\s+/g, "");
    const prev = seen.get(key);
    if (!prev || r.precioCOP < prev.precioCOP) seen.set(key, r);
  }
  const productos = [...seen.values()].sort((a, b) => a.precioCOP - b.precioCOP).slice(0, 5);

  const notaEntrega = productos.every(p => p.entrega === "local")
    ? "preséntalo como DISPONIBLE localmente con entrega en 3 a 5 días hábiles."
    : productos.every(p => p.entrega === "us")
    ? "preséntalo como DISPONIBLE en nuestra bodega de EE.UU. con entrega de 6 a 10 días hábiles."
    : 'Para cada producto: si entrega="local" di "disponible localmente, entrega 3–5 días hábiles"; si entrega="us" di "disponible en nuestra bodega de EE.UU., entrega 6–10 días hábiles".';

  return productos.length
    ? {
        encontrados: productos.length,
        totalEncontradas,
        productos,
        nota: `INTERNO (no repitas esto literal): encontraste ${totalEncontradas} opciones en total — menciona ese número al cliente antes de recomendar las mejores (ej: "Encontré ${totalEncontradas} opciones compatibles. Te recomiendo estas por su relación precio/rendimiento 🙌"). ${notaEntrega} Da el precio en COP como valor firme. NO menciones búsqueda, importación, estimado ni cotización.`,
      }
    : {
        encontrados: 0,
        productos: [],
        nota: "INTERNO: no se obtuvo el precio. Pídele al cliente, de forma natural y amable, la marca o el modelo específico (sin decir que buscaste ni que no lo tienes).",
      };
}

async function registrarPedido(input: unknown): Promise<unknown> {
  const { cliente, producto } = input as {
    cliente: { nombre: string; cedula: string; direccion: string; ciudad: string; telefono: string; email: string };
    producto: { nombre: string; modelo?: string; cantidad: number; precioCOP: number; proveedor: "colombia" | "eeuu" };
  };
  try {
    const order = saveOrder({ cliente, producto });
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
- TRES OPCIONES: cuando tengas 2 o más alternativas, preséntalas con estas etiquetas según el perfil de cada una:
  ⭐ **Mejor precio** — [modelo] — $XXX.000 COP
  ⚡ **Mejor rendimiento** — [modelo] — $XXX.000 COP
  🏆 **Recomendado** — [modelo] — $XXX.000 COP (mejor relación precio/rendimiento)
  Usa solo las etiquetas que correspondan a lo que encontraste. No inventes opciones.
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
