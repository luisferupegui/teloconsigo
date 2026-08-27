"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  loadProducts,
  saveProducts,
  nextId,
  slugify,
  type Product,
} from "@/lib/products";

function parseSpecs(specsString: string): Record<string, string | number> {
  const specs: Record<string, string | number> = {};
  if (!specsString.trim()) return specs;
  const lines = specsString.split("\n");
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key || !value) continue;
    const asNum = Number(value);
    specs[key] = !Number.isNaN(asNum) && /^\d+$/.test(value) ? asNum : value;
  }
  return specs;
}

function buildFromForm(formData: FormData, existing?: Product): Product {
  const nombre = String(formData.get("nombre") || "").trim();
  const specsRaw = String(formData.get("specs") || "");
  return {
    id: existing?.id ?? nextId(),
    slug:
      String(formData.get("slug") || "").trim() ||
      slugify(nombre),
    nombre,
    marca: String(formData.get("marca") || "").trim(),
    categoria: String(formData.get("categoria") || "").trim(),
    precio: Number(formData.get("precio") || 0),
    precioAnterior: formData.get("precioAnterior")
      ? Number(formData.get("precioAnterior"))
      : undefined,
    stock: Number(formData.get("stock") || 0),
    rating: Number(formData.get("rating") || 5),
    reviews: Number(formData.get("reviews") || 0),
    imagen: String(formData.get("imagen") || "📦").trim(),
    destacado: formData.get("destacado") === "on",
    descripcion: String(formData.get("descripcion") || "").trim(),
    specs: parseSpecs(specsRaw),
  };
}

export async function updateProduct(id: string, formData: FormData) {
  const list = loadProducts();
  const existing = list.find((p) => p.id === id);
  if (!existing) throw new Error("Producto no encontrado");
  const updated = buildFromForm(formData, existing);
  const newList = list.map((p) => (p.id === id ? updated : p));
  saveProducts(newList);
  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function importCSV(formData: FormData) {
  const csv = String(formData.get("csv") || "").trim();
  if (!csv) throw new Error("CSV vacío");

  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  const headers = lines[0].split(",").map((h) => h.trim());
  const list = loadProducts();
  let added = 0;
  let updated = 0;

  for (let i = 1; i < lines.length; i++) {
    // CSV simple: maneja comillas para campos con comas
    const row: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (const ch of lines[i]) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === "," && !inQuotes) {
        row.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    row.push(cur);

    const data: Record<string, string> = {};
    headers.forEach((h, idx) => (data[h] = (row[idx] ?? "").trim()));

    if (!data.nombre) continue;

    const specs: Record<string, string | number> = {};
    if (data.specs) {
      data.specs.split(";").forEach((pair) => {
        const [k, v] = pair.split("=").map((s) => s.trim());
        if (k && v) {
          const n = Number(v);
          specs[k] = !Number.isNaN(n) && /^\d+$/.test(v) ? n : v;
        }
      });
    }

    const slug = data.slug || slugify(data.nombre);
    const existingIdx = list.findIndex((p) => p.slug === slug);

    const prod: Product = {
      id: existingIdx >= 0 ? list[existingIdx].id : nextId(),
      slug,
      nombre: data.nombre,
      marca: data.marca || "",
      categoria: data.categoria || "perifericos",
      precio: Number(data.precio || 0),
      precioAnterior: data.precioAnterior
        ? Number(data.precioAnterior)
        : undefined,
      stock: Number(data.stock || 0),
      rating: Number(data.rating || 5),
      reviews: Number(data.reviews || 0),
      imagen: data.imagen || "📦",
      destacado: data.destacado === "true" || data.destacado === "1",
      descripcion: data.descripcion || "",
      specs,
    };

    if (existingIdx >= 0) {
      list[existingIdx] = prod;
      updated++;
    } else {
      list.push(prod);
      added++;
    }
  }

  saveProducts(list);
  revalidatePath("/", "layout");
  return { added, updated };
}
