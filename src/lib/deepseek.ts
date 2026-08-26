import "server-only";

// Cliente mínimo de DeepSeek (API compatible con OpenAI) sobre fetch nativo.
// No usamos el SDK de OpenAI para no añadir dependencias: solo necesitamos
// /chat/completions con streaming SSE, tool calling y modo JSON.
//
// Docs: https://api-docs.deepseek.com
//   • Auth:      Authorization: Bearer sk-…
//   • Modelos:   deepseek-chat (V3, el que usa Andrea) · deepseek-reasoner (razonador)
//   • Errores:   401 key inválida · 402 saldo agotado · 429 rate limit · 5xx transitorio
//
// IMPORTANTE: DeepSeek NO tiene herramienta de búsqueda web del lado del servidor
// (a diferencia de web_search de Anthropic). La búsqueda web del asesor va por
// Serper; aquí DeepSeek solo traduce y estructura. Ver `src/app/api/asesor/route.ts`.

export const DEEPSEEK_BASE_URL =
  process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com";

/** Modelo conversacional (Andrea). V3 no-razonador: rápido y con tool calling. */
export const DEEPSEEK_MODEL = "deepseek-chat";
/** Modelo razonador, para tareas de análisis. Andrea NO lo usa (latencia de chat). */
export const DEEPSEEK_MODEL_REASONER = "deepseek-reasoner";

// ── Tipos (subconjunto del esquema OpenAI que realmente usamos) ───────────────

export type DSToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type DSMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: DSToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type DSTool = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type DSResult = {
  content: string;
  toolCalls: DSToolCall[];
  /** "stop" | "tool_calls" | "length" | … */
  finishReason: string | null;
};

export type DSChatParams = {
  model?: string;
  messages: DSMessage[];
  tools?: DSTool[];
  maxTokens?: number;
  temperature?: number;
  /** Fuerza salida JSON válida. El prompt DEBE contener la palabra "json". */
  jsonMode?: boolean;
  stream?: boolean;
  /** Solo con stream: se llama por cada fragmento de texto. */
  onText?: (delta: string) => void;
  timeoutMs?: number;
  maxRetries?: number;
};

export class DeepSeekAPIError extends Error {
  readonly status?: number;
  readonly body?: string;
  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.name = "DeepSeekAPIError";
    this.status = status;
    this.body = body;
  }
}

// ── Utilidades internas ───────────────────────────────────────────────────────

const RETRY_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /TimeoutError|AbortError|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|network/i.test(msg);
}

function trunc(s: string, n = 400): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

type RawToolCall = { id?: string; index?: number; function?: { name?: string; arguments?: string } };

function normalizeCall(tc: RawToolCall, i: number): DSToolCall {
  return {
    id: tc.id || `call_${i}`,
    type: "function",
    function: { name: tc.function?.name ?? "", arguments: tc.function?.arguments ?? "{}" },
  };
}

// ── Cliente ───────────────────────────────────────────────────────────────────

export class DeepSeek {
  private readonly apiKey: string;
  private readonly maxRetries: number;
  private readonly baseURL: string;

  constructor(opts: { apiKey: string; maxRetries?: number; baseURL?: string }) {
    this.apiKey = opts.apiKey;
    this.maxRetries = opts.maxRetries ?? 2;
    this.baseURL = (opts.baseURL ?? DEEPSEEK_BASE_URL).replace(/\/+$/, "");
  }

  /** Una respuesta de chat. Reintenta con backoff en 429/5xx/red, pero NUNCA
   *  después de haber emitido texto en vivo (evitaría duplicarlo en pantalla). */
  async chat(p: DSChatParams): Promise<DSResult> {
    const retries = p.maxRetries ?? this.maxRetries;
    const box = { emitted: false };
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.once(p, box);
      } catch (err) {
        const status = err instanceof DeepSeekAPIError ? err.status : undefined;
        const retriable = status === undefined ? isNetworkError(err) : RETRY_STATUS.has(status);
        if (!retriable || box.emitted || attempt >= retries) throw err;
        await sleep(400 * 2 ** attempt + Math.floor(Math.random() * 250));
      }
    }
  }

  private async once(p: DSChatParams, box: { emitted: boolean }): Promise<DSResult> {
    const stream = p.stream ?? false;
    const body: Record<string, unknown> = {
      model: p.model ?? DEEPSEEK_MODEL,
      messages: p.messages,
      max_tokens: p.maxTokens ?? 2500,
      stream,
    };
    if (p.temperature !== undefined) body.temperature = p.temperature;
    if (p.tools && p.tools.length > 0) body.tools = p.tools;
    if (p.jsonMode) body.response_format = { type: "json_object" };

    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        Accept: stream ? "text/event-stream" : "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(p.timeoutMs ?? 120_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new DeepSeekAPIError(`DeepSeek respondió ${res.status}: ${trunc(text)}`, res.status, text);
    }

    if (!stream) {
      const json = (await res.json()) as {
        choices?: { message?: { content?: string; tool_calls?: RawToolCall[] }; finish_reason?: string }[];
      };
      const choice = json.choices?.[0];
      const msg = choice?.message ?? {};
      const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls.map(normalizeCall) : [];
      return {
        content: typeof msg.content === "string" ? msg.content : "",
        toolCalls: calls,
        finishReason: choice?.finish_reason ?? null,
      };
    }

    return this.readStream(res, p, box);
  }

  /** Lee el SSE de /chat/completions acumulando texto y tool_calls por índice. */
  private async readStream(res: Response, p: DSChatParams, box: { emitted: boolean }): Promise<DSResult> {
    if (!res.body) throw new DeepSeekAPIError("DeepSeek devolvió una respuesta sin cuerpo.");
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    const parciales = new Map<number, { id: string; name: string; args: string }>();
    let buf = "";
    let content = "";
    let finishReason: string | null = null;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });

      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue; // keep-alive (":") y líneas vacías
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;

        let chunk: {
          choices?: { delta?: { content?: string; tool_calls?: RawToolCall[] }; finish_reason?: string }[];
        };
        try {
          chunk = JSON.parse(data);
        } catch {
          continue; // fragmento partido: el resto llega en el próximo read
        }

        const choice = chunk.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) finishReason = choice.finish_reason;

        const delta = choice.delta ?? {};
        if (typeof delta.content === "string" && delta.content.length > 0) {
          content += delta.content;
          box.emitted = true;
          p.onText?.(delta.content);
        }
        for (const tc of delta.tool_calls ?? []) {
          const idx = typeof tc.index === "number" ? tc.index : 0;
          const cur = parciales.get(idx) ?? { id: "", name: "", args: "" };
          if (tc.id) cur.id = tc.id;
          const nombre = tc.function?.name;
          if (nombre) cur.name = cur.name.includes(nombre) ? cur.name : cur.name + nombre;
          if (tc.function?.arguments) cur.args += tc.function.arguments;
          parciales.set(idx, cur);
        }
      }
    }

    const toolCalls: DSToolCall[] = [...parciales.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([i, c]) => ({
        id: c.id || `call_${i}`,
        type: "function" as const,
        function: { name: c.name, arguments: c.args || "{}" },
      }));

    if (toolCalls.length > 0 && finishReason !== "tool_calls") finishReason = "tool_calls";
    return { content, toolCalls, finishReason };
  }
}

// ── Helpers de alto nivel ─────────────────────────────────────────────────────

/** Parsea el primer objeto JSON de un texto (por si el modelo lo envuelve). */
export function extraerJson<T>(texto: string): T | null {
  const limpio = texto.replace(/```(?:json)?/gi, "").trim();
  const m = limpio.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}

/** Llamada de un solo turno que DEBE devolver JSON. `null` si falla o no parsea. */
export async function deepseekJson<T>(
  ds: DeepSeek,
  system: string,
  user: string,
  opts: { model?: string; maxTokens?: number; timeoutMs?: number; maxRetries?: number } = {},
): Promise<T | null> {
  try {
    const r = await ds.chat({
      model: opts.model ?? DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      maxTokens: opts.maxTokens ?? 2000,
      temperature: 0,
      jsonMode: true,
      timeoutMs: opts.timeoutMs ?? 60_000,
      maxRetries: opts.maxRetries ?? 1,
    });
    return extraerJson<T>(r.content);
  } catch {
    return null;
  }
}

/** Valida una API key con una llamada que NO consume tokens (lista de modelos). */
export async function validateDeepseekKey(
  apiKey: string,
  baseURL = DEEPSEEK_BASE_URL,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(`${baseURL.replace(/\/+$/, "")}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return { valid: true };
    if (res.status === 401) return { valid: false, error: "La clave fue rechazada por DeepSeek (401). Revísala." };
    if (res.status === 402) return { valid: false, error: "La cuenta de DeepSeek no tiene saldo (402). Recárgala en platform.deepseek.com." };
    const text = await res.text().catch(() => "");
    return { valid: false, error: `DeepSeek respondió ${res.status}: ${trunc(text, 200)}` };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}
