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
};

async function serperPost(endpoint: string, body: object, apiKey: string): Promise<Record<string, unknown>> {
  const res = await fetch(`https://google.serper.dev/${endpoint}`, {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Serper ${endpoint} respondió ${res.status}`);
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
