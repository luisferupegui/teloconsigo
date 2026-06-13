import { NextRequest, NextResponse } from "next/server";
import { parseSupplierDoc } from "@/lib/parse-supplier-doc";
import {
  addList,
  generateListId,
  generateProductId,
  type SupplierProduct,
  type SupplierList,
} from "@/lib/supplier-catalog";

export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;

// Importa una lista de proveedor desde Word (.docx) o Excel (.xlsx).
// Extracción DETERMINISTA leyendo las celdas de la tabla — sin IA, sin clave API,
// gratis e instantáneo, conservando el vínculo nombre↔precio de cada producto.
export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    const proveedor = (fd.get("proveedor") as string | null) ?? "proveedor";
    const nombre = (fd.get("nombre") as string | null) ?? file?.name ?? "Lista sin nombre";

    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".docx") && !lower.endsWith(".xlsx")) {
      return NextResponse.json({ error: "Solo se aceptan archivos Word (.docx) o Excel (.xlsx)" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Archivo muy grande (máx. 20 MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let parsed;
    try {
      parsed = await parseSupplierDoc(buffer, file.name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo leer el archivo";
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    if (parsed.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron productos. Asegúrate de que la lista esté en una TABLA con nombre y precio por fila." },
        { status: 422 },
      );
    }

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

    console.log(`[import-doc-catalog] "${nombre}" (${proveedor}): ${productos.length} productos`);

    return NextResponse.json({ ok: true, listId: list.id, count: productos.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[import-doc-catalog]", msg);
    return NextResponse.json({ error: `Error al procesar el archivo: ${msg}` }, { status: 500 });
  }
}
