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

export const maxDuration = 300;

const MAX_BYTES = 20 * 1024 * 1024;

const PROMPT = `Eres un extractor de datos especializado en listas de precios de tecnología.
Analiza este PDF de lista de precios de proveedor y extrae TODOS los productos que encuentres.

Para cada producto crea un objeto JSON con EXACTAMENTE estos campos:
- "nombre": nombre completo del producto (string)
- "marca": fabricante o marca (string)
- "categoria": usa EXACTAMENTE uno de estos valores: portatil, procesador, monitor, memoria-ram, almacenamiento, tarjeta-grafica, fuente-poder, refrigeracion, escritorio, redes, mouse, auriculares, teclado, impresora, accesorios, motherboard
- "precio_costo": precio en pesos colombianos sin IVA, solo el número entero (number)
- "referencia": código SKU del proveedor si existe, si no usa "" (string)
- "specs": objeto con las especificaciones técnicas más relevantes, máximo 5 campos (object)

REGLAS IMPORTANTES:
- El precio_costo debe ser el precio de costo SIN IVA y SIN ningún margen
- Si el precio está en dólares, NO lo conviertas, devuélvelo en pesos como está en el PDF
- Si no puedes determinar una categoría exacta, usa "accesorios"
- Devuelve ÚNICAMENTE el array JSON puro, sin markdown, sin \`\`\`json, sin explicaciones
- Si no encuentras productos válidos, devuelve []`;

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    const proveedor = (fd.get("proveedor") as string | null) ?? "proveedor";

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

    const anthropic = new Anthropic({ apiKey });

    const pdfDoc: DocumentBlockParam = {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64 },
    };

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: [pdfDoc, { type: "text", text: PROMPT }],
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "[]";

    let extracted: Omit<SupplierProduct, "id" | "proveedor" | "importedAt">[] = [];
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
      extracted = JSON.parse(cleaned);
      if (!Array.isArray(extracted)) extracted = [];
    } catch {
      return NextResponse.json({ error: "Claude no pudo estructurar el PDF", raw }, { status: 422 });
    }

    const now = new Date().toISOString();
    const productos: SupplierProduct[] = extracted.map((p) => ({
      ...p,
      id: generateProductId(p.nombre, proveedor, p.referencia),
      proveedor,
      importedAt: now,
    }));

    const list: SupplierList = {
      id: generateListId(proveedor),
      nombre: file.name,
      proveedor,
      fecha: now,
      paginas: 0,
      caracteres: 0,
      activa: true,
      productos,
    };
    addList(list);

    return NextResponse.json({ ok: true, listId: list.id, count: productos.length, products: productos });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "La clave API de Anthropic es inválida (401). Ve a Ajustes y pega una clave válida (sk-ant-…).", code: "invalid_key" },
        { status: 401 },
      );
    }
    console.error("[import-pdf-catalog]", err);
    return NextResponse.json({ error: "Error al procesar el PDF" }, { status: 500 });
  }
}
