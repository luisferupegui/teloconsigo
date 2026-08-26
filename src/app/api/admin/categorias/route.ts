import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  crearCategoria, editarCategoria, borrarCategoria,
  crearLinea, editarLinea, borrarLinea,
} from "@/lib/categories";

export const dynamic = "force-dynamic";

// CRUD de la taxonomía de la tienda (categorías y las líneas que contienen).
// Antes vivía en código y crear una categoría exigía un despliegue; ahora se gestiona
// desde Admin → Productos y se guarda en data/categories.json.
//
// El cuerpo lleva `tipo` para distinguir sobre qué se opera:
//   tipo:"categoria" → slug, nombre, descripcion, icon
//   tipo:"linea"     → categoria (slug), slug (de la línea), marca, nombre

type Cuerpo = {
  tipo?: "categoria" | "linea";
  slug?: string;
  categoria?: string;
  nombre?: string;
  descripcion?: string;
  icon?: string;
  marca?: string;
};

/** La taxonomía sale en el navbar, la tienda, el sitemap y cada página de categoría. */
function refrescarSitio() {
  revalidatePath("/", "layout");
}

function responder(r: { ok: boolean; error?: string }, extra: Record<string, unknown> = {}) {
  if (!r.ok) return NextResponse.json({ error: r.error ?? "No se pudo completar la operación." }, { status: 400 });
  refrescarSitio();
  return NextResponse.json({ ok: true, ...extra });
}

export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as Cuerpo;
    if (b.tipo === "linea") {
      return responder(crearLinea(String(b.categoria ?? ""), {
        marca: String(b.marca ?? ""), nombre: String(b.nombre ?? ""),
      }));
    }
    const r = crearCategoria({
      nombre: String(b.nombre ?? ""),
      descripcion: String(b.descripcion ?? ""),
      icon: String(b.icon ?? "Package"),
    });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    refrescarSitio();
    return NextResponse.json({ ok: true, slug: r.slug });
  } catch (err) {
    console.error("[categorias POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const b = (await req.json()) as Cuerpo;
    if (b.tipo === "linea") {
      return responder(editarLinea(String(b.categoria ?? ""), String(b.slug ?? ""), {
        marca: String(b.marca ?? ""), nombre: String(b.nombre ?? ""),
      }));
    }
    return responder(editarCategoria(String(b.slug ?? ""), {
      nombre: String(b.nombre ?? ""),
      descripcion: String(b.descripcion ?? ""),
      icon: String(b.icon ?? ""),
    }));
  } catch (err) {
    console.error("[categorias PATCH]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const b = (await req.json()) as Cuerpo;
    if (b.tipo === "linea") {
      return responder(borrarLinea(String(b.categoria ?? ""), String(b.slug ?? "")));
    }
    return responder(borrarCategoria(String(b.slug ?? "")));
  } catch (err) {
    console.error("[categorias DELETE]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
