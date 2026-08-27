import { NextRequest, NextResponse } from "next/server";
import { loadLists, saveLists, setListActive, deleteList, deleteProductsFromList, loadMargins, applyMargin, restoreListsFromBackup } from "@/lib/supplier-catalog";

export const dynamic = "force-dynamic";

// GET — con ?id=… devuelve los PRODUCTOS de esa lista (con precio cliente).
//        Sin id, devuelve los metadatos de todas las listas (liviano).
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const list = loadLists().find((l) => l.id === id);
    if (!list) return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });
    const margins = loadMargins();
    return NextResponse.json({
      id: list.id,
      nombre: list.nombre,
      proveedor: list.proveedor,
      productos: list.productos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        marca: p.marca,
        categoria: p.categoria,
        referencia: p.referencia ?? "",
        precio_costo: p.precio_costo,
        precio_final: applyMargin(p.precio_costo, p.categoria, margins, p.nombre),
      })),
    });
  }

  const lists = loadLists();
  const resumen = lists.map((l) => ({
    id: l.id,
    nombre: l.nombre,
    proveedor: l.proveedor,
    fecha: l.fecha,
    paginas: l.paginas,
    caracteres: l.caracteres,
    activa: l.activa,
    productos: l.productos.length,
  }));

  const activas = lists.filter((l) => l.activa);
  return NextResponse.json({
    lists: resumen,
    totals: {
      listas: lists.length,
      listasActivas: activas.length,
      productosActivos: activas.reduce((acc, l) => acc + l.productos.length, 0),
    },
  });
}

// PATCH — activar / desactivar una lista.  body: { id, activa }
export async function PATCH(req: NextRequest) {
  try {
    const { id, activa } = (await req.json()) as { id?: string; activa?: boolean };
    if (!id || typeof activa !== "boolean") {
      return NextResponse.json({ error: "Falta id o activa" }, { status: 400 });
    }
    if (!setListActive(id, activa)) {
      return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al actualizar la lista" }, { status: 500 });
  }
}

// DELETE — eliminar una lista.  body: { id }
export async function DELETE(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: string };
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
    if (!deleteList(id)) {
      return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar la lista" }, { status: 500 });
  }
}

// POST — acciones especiales.
//   { action: "restore" }
//   { action: "deleteProducts", listId, productIds: string[] }
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { action?: string; listId?: string; productIds?: string[]; proveedor?: string };
    const { action } = body;

    if (action === "restore") {
      const restored = restoreListsFromBackup();
      if (restored === null) {
        return NextResponse.json({ error: "No hay backup disponible para restaurar" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, restored });
    }

    // El proveedor se escribe al importar, pero se equivoca uno o cambia de nombre; sin
    // esto había que borrar la lista entera y volver a subirla para corregir una palabra.
    if (action === "setProveedor") {
      const { listId, proveedor } = body;
      if (!listId) return NextResponse.json({ error: "Falta listId" }, { status: 400 });
      const nombre = (proveedor ?? "").trim().toLowerCase();
      const lists = loadLists();
      const lista = lists.find((l) => l.id === listId);
      if (!lista) return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });
      // Vacío = sin proveedor asignado, que es distinto de borrar la lista.
      const valor = nombre || "sin-proveedor";
      lista.proveedor = valor;
      for (const prod of lista.productos) prod.proveedor = valor;
      saveLists(lists);
      return NextResponse.json({ ok: true, proveedor: valor });
    }

    if (action === "deleteProducts") {
      const { listId, productIds } = body;
      if (!listId || !Array.isArray(productIds) || productIds.length === 0) {
        return NextResponse.json({ error: "Faltan listId o productIds" }, { status: 400 });
      }
      const result = deleteProductsFromList(listId, productIds);
      if (!result.found) {
        return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, deleted: result.deleted });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Error en la acción" }, { status: 500 });
  }
}
