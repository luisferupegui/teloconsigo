import "server-only";

// Cliente mínimo de Serper (serper.dev) — búsqueda de Google como API.
// Endpoint Shopping: devuelve productos con precio, vendedor y enlace.

export type SerperShoppingItem = {
  title?: string;
  source?: string;   // vendedor (Amazon, Newegg, MercadoLibre…)
  link?: string;
  price?: string;    // ej. "$169.99" (US) o "$1.083.000" (CO)
  delivery?: string;
  rating?: number;
  ratingCount?: number;
  condition?: string; // "new" | "used" | "refurbished" (cuando Serper lo provee)
};

async function serperPost(endpoint: string, body: object, apiKey: string): Promise<Record<string, unknown>> {
  const res = await fetch(`https://google.serper.dev/${endpoint}`, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    // EL MOTIVO IMPORTA, Y UNO MÁS QUE LOS DEMÁS.
    //
    // Con la cuenta sin saldo, Serper responde 400 "Not enough credits" y aquí se lanzaba
    // un error que decía solo "respondió 400". Arriba, cada llamada lo recoge con un
    // `.catch(() => [])` —para que una búsqueda caída no tumbe la conversación—, así que
    // el síntoma era que TODAS las cotizaciones web volvían vacías y Andrea derivaba al
    // equipo. Por fuera se ve igual que "no encontré ese producto", y así estuvo hasta que
    // alguien probó la API a mano. Ahora se registra en claro y aparte.
    const motivo = await res.text().catch(() => "");
    if (/not enough credits|insufficient/i.test(motivo)) {
      console.error("[serper] SIN CRÉDITOS: ninguna cotización web va a funcionar hasta recargar en serper.dev. Andrea seguirá respondiendo con lo de las listas.");
    }
    throw new Error(`Serper ${endpoint} respondió ${res.status}${motivo ? `: ${motivo.slice(0, 120)}` : ""}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

/** Resultados de Google Shopping para un país (gl: "us" | "co"). */
export async function serperShopping(query: string, gl: "us" | "co", apiKey: string): Promise<SerperShoppingItem[]> {
  const data = await serperPost("shopping", { q: query, gl, hl: gl === "us" ? "en" : "es", num: 20 }, apiKey);
  const items = data.shopping;
  return Array.isArray(items) ? (items as SerperShoppingItem[]) : [];
}

/** Valida una key con una búsqueda mínima (consume 1 crédito). */
export async function validateSerperKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    await serperPost("search", { q: "test", gl: "us", num: 1 }, apiKey);
    return { valid: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: msg.includes("403") || msg.includes("401") ? "La key de Serper fue rechazada." : msg };
  }
}
