import { NextRequest, NextResponse } from "next/server";
import {
  addList,
  generateListId,
  generateProductId,
  type SupplierProduct,
  type SupplierList,
  nombreDeProveedor,
} from "@/lib/supplier-catalog";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Paso 2 de la importación: GUARDAR lo que ya se revisó ───────────────────
//
// Recibe los productos que devolvió ./analizar, no el archivo. Volver a leer un
// PDF de 159 páginas para guardarlo costaría otros 40 segundos y podría dar un
// resultado distinto al que la persona aprobó en pantalla: se guarda exactamente
// lo que se vio.

type Entrante = {
  nombre?: unknown;
  marca?: unknown;
  categoria?: unknown;
  precio_costo?: unknown;
  supplierCode?: unknown;
  specs?: unknown;
};

const texto = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

/** Las specs llegan del navegador: se aceptan solo pares texto→texto. */
function specsLimpias(v: unknown): Record<string, string> | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "string" && val.trim()) out[k] = val.trim();
  }
  return Object.keys(out).length ? out : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const productosEntrantes: Entrante[] = Array.isArray(body?.productos) ? body.productos : [];
    const proveedor = nombreDeProveedor(texto(body?.proveedor)) || "Sin proveedor";
    const nombre = texto(body?.nombre, "Lista sin nombre");

    if (productosEntrantes.length === 0) {
      return NextResponse.json({ error: "No se recibió ningún producto" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const usados = new Set<string>();
    const productos: SupplierProduct[] = [];

    for (const p of productosEntrantes) {
      const nombreProducto = texto(p.nombre);
      const precio = Number(p.precio_costo);
      // Un producto sin nombre no se puede ni mostrar ni buscar; un precio que no
      // es un número entraría al catálogo como NaN y rompería el cálculo de margen.
      if (!nombreProducto || !Number.isFinite(precio) || precio < 0) continue;

      const referencia = texto(p.supplierCode) || undefined;
      let id = generateProductId(nombreProducto, proveedor, referencia);
      if (usados.has(id)) {
        let n = 2;
        while (usados.has(`${id}-${n}`)) n++;
        id = `${id}-${n}`;
      }
      usados.add(id);

      productos.push({
        id,
        nombre: nombreProducto,
        marca: texto(p.marca, proveedor),
        categoria: texto(p.categoria, "accesorios"),
        precio_costo: Math.round(precio),
        proveedor,
        referencia,
        specs: specsLimpias(p.specs),
        importedAt: now,
      });
    }

    if (productos.length === 0) {
      return NextResponse.json({ error: "Ningún producto tenía nombre y precio válidos" }, { status: 422 });
    }

    const lista: SupplierList = {
      id: generateListId(proveedor),
      nombre,
      proveedor,
      fecha: now,
      paginas: 0,
      caracteres: 0,
      activa: true,
      productos,
    };
    addList(lista);

    const descartados = productosEntrantes.length - productos.length;
    console.log(`[importador/guardar] "${nombre}" (${proveedor}): ${productos.length} productos` + (descartados ? ` · ${descartados} sin nombre o precio` : ""));

    return NextResponse.json({ ok: true, listId: lista.id, count: productos.length, omitidos: descartados });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error guardando la lista";
    console.error("[importador/guardar]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
