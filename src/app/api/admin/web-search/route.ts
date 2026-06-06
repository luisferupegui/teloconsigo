import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey, loadWebSearchSites, saveWebSearchSites } from "@/lib/settings";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Normaliza "https://www.Ledacom.com/precios" → "ledacom.com"
function normalizeDomain(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim();
}

function parseJsonArray(raw: string): unknown[] {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/m, "")
    .trim();
  const candidates = [cleaned];
  const first = cleaned.indexOf("[");
  const last = cleaned.lastIndexOf("]");
  if (first !== -1 && last > first) candidates.push(cleaned.slice(first, last + 1));
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* siguiente */
    }
  }
  return [];
}

const buildPrompt = (query: string) => `Busca "${query}" en los sitios permitidos y arma una lista de los productos que encuentres con su precio.

REGLAS ESTRICTAS:
- Usa ÚNICAMENTE precios que aparezcan REALMENTE en los resultados de la búsqueda. Si no encuentras el precio real de un producto, pon "precio": null. NO inventes, NO estimes y NO conviertas precios de tu memoria.
- Reporta el precio TAL CUAL aparece en el sitio, en su moneda original (NO lo conviertas a otra moneda). Indica esa moneda en el campo "moneda" con su código ISO (ej: "COP" para pesos colombianos, "USD" para dólares).
- Devuelve SOLO un array JSON puro, sin markdown ni texto adicional. Tu respuesta final debe ser únicamente el array:
[{"nombre":"nombre del producto","precio":1234000,"moneda":"USD","sitio":"nombre del sitio","url":"enlace directo al producto"}]
- "precio": número entero sin separadores de miles ni símbolos (o null si no lo hallaste).
- "url": el enlace real al producto encontrado.
- Máximo 10 resultados, los más relevantes. Si no encuentras nada, devuelve [].`;

// GET — lista de sitios configurados
export async function GET() {
  return NextResponse.json({ sites: loadWebSearchSites() });
}

// PUT — guardar la lista de sitios
export async function PUT(req: NextRequest) {
  try {
    const { sites } = (await req.json()) as { sites?: string[] };
    const clean = [...new Set((sites ?? []).map(normalizeDomain).filter(Boolean))];
    saveWebSearchSites(clean);
    return NextResponse.json({ ok: true, sites: clean });
  } catch {
    return NextResponse.json({ error: "Error al guardar los sitios" }, { status: 500 });
  }
}

// POST — ejecutar búsqueda web restringida a los sitios configurados
export async function POST(req: NextRequest) {
  try {
    const { query } = (await req.json()) as { query?: string };
    if (!query?.trim()) {
      return NextResponse.json({ error: "Escribe qué buscar" }, { status: 400 });
    }

    const apiKey = getAnthropicApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "No hay clave API configurada. Ve a Ajustes.", code: "no_key" }, { status: 400 });
    }

    const sites = loadWebSearchSites();
    if (sites.length === 0) {
      return NextResponse.json({ error: "Primero agrega al menos un sitio donde buscar.", code: "no_sites" }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey });

    const tools = [
      { type: "web_search_20250305", name: "web_search", max_uses: 5, allowed_domains: sites },
    ] as unknown as Parameters<typeof anthropic.messages.create>[0]["tools"];

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: buildPrompt(query.trim()) },
    ];

    // La búsqueda web corre en un bucle de herramienta del lado servidor. Si llega al
    // límite de iteraciones devuelve stop_reason "pause_turn" y hay que reenviar para que
    // continúe. Acumulamos el texto de todas las respuestas y detectamos truncamiento.
    const textParts: string[] = [];
    let searchCount = 0;
    let truncated = false;

    for (let i = 0; i < 4; i++) {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        tools,
        messages,
      });

      searchCount += message.usage?.server_tool_use?.web_search_requests ?? 0;
      for (const b of message.content) {
        if (b.type === "text") textParts.push(b.text);
      }

      if (message.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: message.content as Anthropic.ContentBlockParam[] });
        continue;
      }
      if (message.stop_reason === "max_tokens") truncated = true;
      break;
    }

    const raw = parseJsonArray(textParts.join("\n"));
    const results = raw
      .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
      .map((r) => ({
        nombre: String(r.nombre ?? ""),
        precio: typeof r.precio === "number" ? r.precio : null,
        moneda: String(r.moneda ?? "COP"),
        sitio: String(r.sitio ?? ""),
        url: String(r.url ?? ""),
      }))
      .filter((r) => r.nombre);

    // Si no se pudo extraer nada porque la respuesta se cortó por longitud, avisa en vez
    // de devolver una lista vacía silenciosa (que parece "sin resultados").
    if (results.length === 0 && truncated) {
      return NextResponse.json(
        { error: "La respuesta de la IA se cortó por longitud. Intenta una búsqueda más específica.", code: "truncated" },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, query, sitesUsed: sites, results, searchCount });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "La clave API es inválida (401). Ve a Ajustes.", code: "invalid_key" }, { status: 401 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[web-search]", msg);
    return NextResponse.json({ error: `Error en la búsqueda web: ${msg}` }, { status: 500 });
  }
}
