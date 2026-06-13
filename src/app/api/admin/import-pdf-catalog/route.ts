import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { DocumentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { getAnthropicApiKey } from "@/lib/settings";
import {
  addList,
  generateListId,
  generateProductId,
  type SupplierProduct,
  type SupplierList,
} from "@/lib/supplier-catalog";

export const maxDuration = 600; // hasta 10 min — la generación del JSON largo es lo lento

const MAX_BYTES = 20 * 1024 * 1024;

// Visión nativa: Claude "ve" el PDF y entiende el layout (columnas, tablas
// lado a lado). Sonnet es claramente superior para listas multi-columna densas;
// Haiku es más barato pero falla con cuadrículas enredadas.
const MODELS = {
  rapido: "claude-haiku-4-5",
  preciso: "claude-sonnet-4-6",
} as const;
type Modo = keyof typeof MODELS;

const PROMPT = `Eres un extractor experto de listas de precios de tecnología colombianas.

Este PDF es una LISTA DE PRECIOS de un proveedor mayorista. Cada página suele
tener VARIAS COLUMNAS lado a lado, y dentro de cada columna varias mini-tablas
por categoría (ej: "TARJETAS GRAFICAS", "SSD M.2 NVME", "BOARDS"). LEE EL LAYOUT
VISUAL como lo haría una persona: respeta las columnas, no mezcles un producto de
una columna con el precio de otra.

Extrae TODOS los productos tecnológicos que veas, de todas las columnas y páginas.

Para cada producto devuelve un objeto con EXACTAMENTE estos campos:
- "nombre": nombre completo del producto (string)
- "marca": fabricante; dedúcelo del nombre si no está explícito (ASROCK→ASRock, GIGABYTE→Gigabyte, MSI→MSI, ADATA→ADATA…) (string)
- "categoria": EXACTAMENTE una de: portatil, procesador, monitor, memoria-ram, almacenamiento, tarjeta-grafica, fuente-poder, refrigeracion, escritorio, redes, mouse, auriculares, teclado, impresora, accesorios, motherboard
- "precio_costo": número ENTERO en pesos colombianos, sin puntos ni comas (number)
- "referencia": código/SKU del proveedor si aparece junto al producto, si no "" (string)
- "specs": objeto con máximo 3 especificaciones clave (object)

FORMATO DE PRECIOS (Colombia): el punto y la coma son separadores de miles.
- "$ 1.432,000" o "$ 1.432.000"  → 1432000
- "$ 285,000"  o "$ 285.000"     → 285000
- "$ 49,000"                      → 49000

REGLAS:
- IGNORA: café, alimentos y todo lo que no sea tecnología; encabezados, fechas, totales.
- Si un producto no tiene precio visible (vacío, "OPEN BOX" sin valor), usa precio_costo 0.
- Asocia cada precio al producto de SU MISMA fila y columna.
- Devuelve ÚNICAMENTE el array JSON puro, sin markdown, sin \`\`\`json, sin explicaciones.
- Si no encuentras productos, devuelve [].`;

type RawProduct = Omit<SupplierProduct, "id" | "proveedor" | "importedAt">;

/** Extrae el array JSON de la respuesta. Si quedó truncado (output muy largo),
 *  rescata los objetos completos cerrando el array en el último "}" válido. */
function parseProducts(raw: string): RawProduct[] {
  let s = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/m, "")
    .trim();

  const start = s.indexOf("[");
  if (start === -1) return [];
  s = s.slice(start);

  const candidates = [s];
  const lastBracket = s.lastIndexOf("]");
  if (lastBracket > 0) candidates.push(s.slice(0, lastBracket + 1));
  const lastObj = s.lastIndexOf("}");
  if (lastObj > 0) candidates.push(s.slice(0, lastObj + 1) + "]"); // rescatar truncado

  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (Array.isArray(parsed)) return parsed as RawProduct[];
    } catch {
      /* probar siguiente */
    }
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    const proveedor = (fd.get("proveedor") as string | null) ?? "proveedor";
    const nombre = (fd.get("nombre") as string | null) ?? file?.name ?? "Lista sin nombre";
    const paginas = Number(fd.get("paginas")) || 0;
    const modo = ((fd.get("modo") as string | null) ?? "preciso") as Modo;

    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".pdf"))
      return NextResponse.json({ error: "Solo se aceptan PDFs" }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: "Archivo muy grande (máx. 20 MB)" }, { status: 400 });

    const apiKey = getAnthropicApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "No hay clave API de Anthropic configurada. Ve a Ajustes y pega tu clave (sk-ant-…).", code: "no_key" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const anthropic = new Anthropic({ apiKey, maxRetries: 3 });
    const model = MODELS[modo] ?? MODELS.preciso;

    const pdfDoc: DocumentBlockParam = {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64 },
    };

    console.log(`[import-pdf-catalog] modo=${modo} model=${model} · ${file.name} · ${(file.size / 1024).toFixed(0)} KB`);

    // Streaming: un PDF denso genera un JSON largo que puede tardar varios minutos.
    const message = await anthropic.messages
      .stream({
        model,
        max_tokens: 32000,
        messages: [{ role: "user", content: [pdfDoc, { type: "text", text: PROMPT }] }],
      })
      .finalMessage();

    const raw = message.content[0]?.type === "text" ? message.content[0].text : "[]";
    const truncado = message.stop_reason === "max_tokens";
    const extracted = parseProducts(raw);

    if (extracted.length === 0) {
      return NextResponse.json(
        { error: "Claude no devolvió productos del PDF. Revisa que el archivo sea una lista de precios legible.", raw: raw.slice(0, 300) },
        { status: 422 },
      );
    }

    // Deduplicar por nombre+precio y descartar inválidos (sin nombre).
    const seen = new Set<string>();
    const usedIds = new Set<string>();
    const now = new Date().toISOString();
    const productos: SupplierProduct[] = [];
    for (const p of extracted) {
      if (!p.nombre || typeof p.nombre !== "string") continue;
      const precio = Number(p.precio_costo) || 0;
      const key = `${p.nombre.toLowerCase().trim()}-${precio}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let id = generateProductId(p.nombre, proveedor, p.referencia);
      if (usedIds.has(id)) {
        let n = 2;
        while (usedIds.has(`${id}-${n}`)) n++;
        id = `${id}-${n}`;
      }
      usedIds.add(id);
      productos.push({ ...p, precio_costo: precio, id, proveedor, importedAt: now });
    }

    const list: SupplierList = {
      id: generateListId(proveedor),
      nombre,
      proveedor,
      fecha: now,
      paginas,
      caracteres: 0,
      activa: true,
      productos,
    };
    addList(list);

    console.log(`[import-pdf-catalog] Lista "${nombre}" (${modo}): ${productos.length} productos${truncado ? " (TRUNCADO)" : ""}`);

    return NextResponse.json({
      ok: true,
      listId: list.id,
      count: productos.length,
      truncado,
      products: productos,
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "La clave API de Anthropic es inválida (401). Ve a Ajustes y pega una clave válida (sk-ant-…).", code: "invalid_key" },
        { status: 401 },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[import-pdf-catalog]", msg);
    return NextResponse.json({ error: `Error al procesar el PDF: ${msg}` }, { status: 500 });
  }
}
