import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey } from "@/lib/settings";
import {
  addList,
  generateListId,
  generateProductId,
  type SupplierProduct,
  type SupplierList,
} from "@/lib/supplier-catalog";

export const maxDuration = 300; // 5 min — necesario para PDFs grandes de varios fragmentos

const CHUNK_SIZE = 35_000; // chars objetivo por fragmento

// "rapido" = Haiku (más veloz y barato, ideal para cuentas nuevas con límite de
// velocidad bajo). "preciso" = Sonnet (un poco más exacto en tablas enredadas).
const MODELS = {
  rapido: "claude-haiku-4-5",
  preciso: "claude-sonnet-4-6",
} as const;
type Modo = keyof typeof MODELS;

// Concurrencia por modo: Haiku tolera más peticiones en paralelo que Sonnet.
const CONCURRENCY: Record<Modo, number> = { rapido: 4, preciso: 2 };

const PROMPT = `Eres un extractor de datos especializado en listas de precios de tecnología colombianas.
Analiza este fragmento de una lista de precios de proveedor y extrae TODOS los productos tecnológicos.

FORMATO DE PRECIOS COLOMBIANO:
- "$ 1.432.000" o "$ 1.432,000" = 1432000 pesos
- "$ 285.000" o "$ 285,000" = 285000 pesos
- El punto (.) y la coma (,) son separadores de miles — el precio real es ese número sin puntos ni comas
- Si ves "1.432" junto a ",000" es 1.432.000 = 1432000

CATEGORÍAS VÁLIDAS (usa exactamente estas):
portatil, procesador, monitor, memoria-ram, almacenamiento, tarjeta-grafica,
fuente-poder, refrigeracion, escritorio, redes, mouse, auriculares, teclado,
impresora, accesorios, motherboard

Para cada producto:
- "nombre": nombre completo del producto
- "marca": fabricante (dedúcelo del nombre si no está explícito: ASROCK→ASRock, GIGABYTE→Gigabyte, etc.)
- "categoria": una de las categorías válidas
- "precio_costo": número entero en pesos colombianos (sin puntos ni comas)
- "referencia": código SKU si existe, "" si no
- "specs": objeto con máximo 3 specs clave

REGLAS:
- Devuelve ÚNICAMENTE el array JSON puro sin markdown ni explicaciones
- Si el texto tiene varias columnas mezcladas, identifica cada producto correctamente
- Ignora: alimentos, café, productos no tecnológicos, encabezados, fechas
- Si no hay productos en este fragmento, devuelve []`;

type RawProduct = Omit<SupplierProduct, "id" | "proveedor" | "importedAt">;

/** Divide el texto en fragmentos respetando los saltos de línea, para no cortar
 *  una fila de producto a la mitad (esa era la causa de fragmentos con 0 productos). */
function splitIntoChunks(text: string, target: number): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    if (current.length + line.length + 1 > target && current.length > 0) {
      chunks.push(current);
      current = "";
    }
    current += (current ? "\n" : "") + line;
  }
  if (current.trim()) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

/** Extrae el primer array JSON del texto. Devuelve null si no se pudo parsear
 *  (output malformado/truncado), que es distinto de un array vacío válido. */
function parseJsonArray(raw: string): RawProduct[] | null {
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
      /* probar siguiente candidato */
    }
  }
  return null;
}

async function extractChunk(
  client: Anthropic,
  model: string,
  chunk: string,
  attempt = 0,
): Promise<RawProduct[]> {
  const message = await client.messages.create({
    model,
    max_tokens: 16000,
    messages: [{ role: "user", content: `${PROMPT}\n\n--- FRAGMENTO ---\n${chunk}` }],
  });
  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "[]";
  const parsed = parseJsonArray(raw);

  if (parsed === null) {
    // Output malformado → un reintento antes de rendirse con este fragmento.
    if (attempt < 1) return extractChunk(client, model, chunk, attempt + 1);
    console.warn("[extract-chunk] JSON parse failed tras reintento:", raw.slice(0, 160));
    return [];
  }
  return parsed;
}

/** Ejecuta `fn` sobre los items con un máximo de `limit` en paralelo. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      text?: string;
      proveedor?: string;
      nombre?: string;
      paginas?: number;
      modo?: Modo;
    };

    const {
      text = "",
      proveedor = "proveedor",
      nombre = "Lista sin nombre",
      paginas = 0,
      modo = "preciso",
    } = body;

    if (!text.trim()) {
      return NextResponse.json({ error: "Texto vacío" }, { status: 400 });
    }

    const apiKey = getAnthropicApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "No hay clave API de Anthropic configurada. Ve a Ajustes y pega tu clave (sk-ant-…).",
          code: "no_key",
        },
        { status: 400 },
      );
    }

    const model = MODELS[modo] ?? MODELS.preciso;
    const concurrency = CONCURRENCY[modo] ?? 2;

    // maxRetries alto: en cuentas nuevas (límite de velocidad bajo) el SDK reintenta
    // con backoff ante un 429 en vez de fallar el fragmento.
    const anthropic = new Anthropic({ apiKey, maxRetries: 5 });

    const chunks = splitIntoChunks(text, CHUNK_SIZE);
    console.log(`[extract-text-catalog] modo=${modo} model=${model} · ${chunks.length} fragmento(s) · concurrencia=${concurrency}`);

    // Procesa los fragmentos en paralelo (con tope de concurrencia).
    const perChunk = await mapLimit(chunks, concurrency, async (chunk, i) => {
      const result = await extractChunk(anthropic, model, chunk);
      console.log(`[extract-text-catalog] Fragmento ${i + 1}/${chunks.length}: ${result.length} productos`);
      return result;
    });
    const allRaw = perChunk.flat();

    // Deduplicar por nombre+precio_costo y descartar entradas inválidas
    const seen = new Set<string>();
    const deduped = allRaw.filter((p) => {
      if (!p.nombre || !(p.precio_costo > 0)) return false;
      const key = `${p.nombre.toLowerCase()}-${p.precio_costo}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const now = new Date().toISOString();
    const usedIds = new Set<string>();
    const productos: SupplierProduct[] = deduped.map((p) => {
      let id = generateProductId(p.nombre, proveedor, p.referencia);
      if (usedIds.has(id)) {
        let n = 2;
        while (usedIds.has(`${id}-${n}`)) n++;
        id = `${id}-${n}`;
      }
      usedIds.add(id);
      return { ...p, id, proveedor, importedAt: now };
    });

    const list: SupplierList = {
      id: generateListId(proveedor),
      nombre,
      proveedor,
      fecha: now,
      paginas,
      caracteres: text.length,
      activa: true,
      productos,
    };
    addList(list);

    console.log(`[extract-text-catalog] Lista "${nombre}" (${modo}): ${productos.length} productos guardados`);

    return NextResponse.json({
      ok: true,
      listId: list.id,
      count: productos.length,
      products: productos,
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        {
          error: "La clave API de Anthropic es inválida (401). Ve a Ajustes y pega una clave válida (sk-ant-…).",
          code: "invalid_key",
        },
        { status: 401 },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[extract-text-catalog] Error:", msg);
    return NextResponse.json({ error: `Error al procesar con IA: ${msg}` }, { status: 500 });
  }
}
