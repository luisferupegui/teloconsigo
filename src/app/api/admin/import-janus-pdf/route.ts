import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { parseJanusPdf } from "@/lib/parse-janus-pdf";
import { parseListaPdf } from "@/lib/parse-supplier-doc";
import {
  addList,
  generateListId,
  generateProductId,
  type SupplierProduct,
  type SupplierList,
} from "@/lib/supplier-catalog";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 50 * 1024 * 1024;

// Parse multipart via busboy (bundled in Next.js) — avoids the edge-runtime
// FormData parser which fails on large binary files.
// Strategy: read raw bytes first with req.arrayBuffer() (no size limit), then
// feed a Readable built from those bytes to busboy so it parses cleanly.
async function parseMultipart(req: NextRequest): Promise<{
  fileBuffer: Buffer;
  fileName: string;
  nombre: string;
  aplicarIva: boolean;
}> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Busboy = require("next/dist/compiled/busboy");
  const contentType = req.headers.get("content-type") ?? "";

  // req.arrayBuffer() goes through readAllBytes with no size cap
  const rawBody = Buffer.from(await req.arrayBuffer());
if (rawBody.length > MAX_BYTES) {
    throw new Error("Archivo muy grande (máx. 50 MB)");
  }

  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: { "content-type": contentType } });
    const chunks: Buffer[] = [];
    let fileName = "";
    let nombre = "Lista Janus PDF";
    let aplicarIva = false;
    let gotFile = false;

    busboy.on(
      "file",
      (_field: string, file: NodeJS.ReadableStream, info: { filename: string }) => {
        fileName = info.filename;
        gotFile = true;
        file.on("data", (chunk: Buffer) => chunks.push(chunk));
        file.on("error", reject);
      },
    );

    busboy.on("field", (name: string, value: string) => {
      if (name === "nombre") nombre = value;
      if (name === "aplicarIva") aplicarIva = value === "true";
    });

    busboy.on("finish", () => {
      if (!gotFile) return reject(new Error("No se recibió archivo"));
      resolve({ fileBuffer: Buffer.concat(chunks), fileName, nombre, aplicarIva });
    });

    busboy.on("error", reject);

    // Feed raw bytes into a fresh Readable → busboy
    const bodyStream = new Readable({
      read() {
        this.push(rawBody);
        this.push(null);
      },
    });
    bodyStream.pipe(busboy);
  });
}

export async function POST(req: NextRequest) {
  try {
    let fileBuffer: Buffer;
    let fileName: string;
    let nombre: string;
    let aplicarIva: boolean;

    try {
      ({ fileBuffer, fileName, nombre, aplicarIva } = await parseMultipart(req));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error leyendo el archivo";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (!fileName.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Solo se aceptan archivos PDF" },
        { status: 400 },
      );
    }

    // Se prueban los dos lectores de PDF: el de Janus tiene columnas fijas calibradas
    // para SU formato, y el genérico deduce las columnas del propio documento. Gana el
    // que encuentre más productos, así una lista de otro proveedor ya no queda en cero.
    let parsed: Awaited<ReturnType<typeof parseJanusPdf>> = [];
    let generico: Awaited<ReturnType<typeof parseListaPdf>> = [];
    const errores: string[] = [];
    try { parsed = await parseJanusPdf(fileBuffer, { aplicarIva }); }
    catch (e) { errores.push(e instanceof Error ? e.message : "lector Janus"); }
    try { generico = await parseListaPdf(fileBuffer); }
    catch (e) { errores.push(e instanceof Error ? e.message : "lector genérico"); }

    if (generico.length > parsed.length) {
      parsed = generico.map((p) => ({
        nombre: p.nombre, marca: p.marca, categoria: p.categoria,
        precio_costo: p.precio_costo, specs: p.specs ?? {}, referencia: p.referencia,
      })) as typeof parsed;
    }

    if (parsed.length === 0) {
      return NextResponse.json(
        {
          error: errores.length
            ? `No se pudo leer el PDF: ${errores.join(" · ")}`
            : "No se encontraron productos en el PDF. Revisa que tenga una tabla con columnas de código, producto y precio.",
        },
        { status: 422 },
      );
    }

    const proveedor = "janus";
    const now = new Date().toISOString();
    const usedIds = new Set<string>();

    const productos: SupplierProduct[] = parsed.map((p) => {
      let id = generateProductId(p.nombre, proveedor, p.referencia);
      if (usedIds.has(id)) {
        let n = 2;
        while (usedIds.has(`${id}-${n}`)) n++;
        id = `${id}-${n}`;
      }
      usedIds.add(id);
      return { ...p, proveedor, importedAt: now, id };
    });

    const list: SupplierList = {
      id: generateListId(proveedor),
      nombre,
      proveedor,
      fecha: now,
      paginas: 0,
      caracteres: 0,
      activa: true,
      productos,
    };
    addList(list);

    console.log(
      `[import-janus-pdf] "${nombre}": ${productos.length} productos`,
    );

    return NextResponse.json({
      ok: true,
      listId: list.id,
      count: productos.length,
      preview: productos.slice(0, 8).map((p) => ({
        nombre: p.nombre,
        precio_costo: p.precio_costo,
        categoria: p.categoria,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[import-janus-pdf]", msg);
    return NextResponse.json(
      { error: `Error al procesar el PDF: ${msg}` },
      { status: 500 },
    );
  }
}
