import "server-only";
import fs from "fs";
import path from "path";

// Taxonomía de la tienda: las CATEGORÍAS que se ven en el navbar y en /categoria/[slug],
// y las LÍNEAS (marca + familia) que cada una contiene.
//
// Antes vivía como código en este mismo archivo, así que crear o renombrar una categoría
// exigía un despliegue. Ahora vive en `data/categories.json` — el mismo volumen persistente
// que el resto de los datos — y se gestiona desde el panel (Admin → Productos).
//
// El icono se guarda como TEXTO ("Cpu"); `iconoDe()` en `categories-icons.ts` lo traduce
// al componente. Ese módulo es apto para cliente; este NO (lee del disco), así que a los
// componentes de cliente las categorías se les pasan por props desde el layout.

export type Linea = {
  marca: string;
  nombre: string;
  slug: string;
  imagen?: string;
  tipo?: "laser" | "inyeccion" | "almacenamiento-mem" | "conectividad" | "perifericos" | "audio-video" | "energia-soporte";
};

export type Category = {
  slug: string;
  nombre: string;
  descripcion: string;
  /** Nombre del icono en `ICONOS` (categories-icons.ts), no el componente. */
  icon: string;
  lineas: Linea[];
};

const CATEGORIES_PATH = path.join(process.cwd(), "data", "categories.json");

export function loadCategories(): Category[] {
  try {
    const raw = JSON.parse(fs.readFileSync(CATEGORIES_PATH, "utf-8"));
    if (!Array.isArray(raw)) return [];
    return raw.map((c: Partial<Category>) => ({
      slug: String(c.slug ?? ""),
      nombre: String(c.nombre ?? ""),
      descripcion: String(c.descripcion ?? ""),
      icon: String(c.icon ?? "Package"),
      lineas: Array.isArray(c.lineas) ? (c.lineas as Linea[]) : [],
    })).filter((c) => c.slug && c.nombre);
  } catch {
    return [];
  }
}

export function saveCategories(cats: Category[]): void {
  fs.writeFileSync(CATEGORIES_PATH, JSON.stringify(cats, null, 2), "utf-8");
}

export function getCategory(slug: string): Category | null {
  return loadCategories().find((c) => c.slug === slug) ?? null;
}

/** Slug web a partir de un texto libre ("Tarjetas Gráficas" → "tarjetas-graficas"). */
export function slugCategoria(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── CRUD de categorías ──────────────────────────────────────────────────────

export function crearCategoria(datos: { nombre: string; descripcion: string; icon: string }): { ok: true; slug: string } | { ok: false; error: string } {
  const nombre = datos.nombre.trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
  const slug = slugCategoria(nombre);
  if (!slug) return { ok: false, error: "Ese nombre no genera una dirección web válida." };

  const cats = loadCategories();
  if (cats.some((c) => c.slug === slug)) return { ok: false, error: `Ya existe una categoría con la dirección "${slug}".` };

  cats.push({ slug, nombre, descripcion: datos.descripcion.trim(), icon: datos.icon || "Package", lineas: [] });
  saveCategories(cats);
  return { ok: true, slug };
}

export function editarCategoria(slug: string, datos: { nombre: string; descripcion: string; icon: string }): { ok: boolean; error?: string } {
  const cats = loadCategories();
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) return { ok: false, error: "No encontré esa categoría." };
  if (!datos.nombre.trim()) return { ok: false, error: "El nombre es obligatorio." };
  // El slug NO se toca al editar: es la dirección pública de la categoría y cambiarlo
  // rompería los enlaces que ya estén compartidos o indexados.
  cat.nombre = datos.nombre.trim();
  cat.descripcion = datos.descripcion.trim();
  cat.icon = datos.icon || cat.icon;
  saveCategories(cats);
  return { ok: true };
}

export function borrarCategoria(slug: string): { ok: boolean; error?: string } {
  const cats = loadCategories();
  const i = cats.findIndex((c) => c.slug === slug);
  if (i === -1) return { ok: false, error: "No encontré esa categoría." };
  cats.splice(i, 1);
  saveCategories(cats);
  return { ok: true };
}

// ─── CRUD de líneas dentro de una categoría ──────────────────────────────────

export function crearLinea(catSlug: string, datos: { marca: string; nombre: string }): { ok: boolean; error?: string } {
  const cats = loadCategories();
  const cat = cats.find((c) => c.slug === catSlug);
  if (!cat) return { ok: false, error: "No encontré esa categoría." };

  const marca = datos.marca.trim();
  const nombre = datos.nombre.trim();
  if (!marca || !nombre) return { ok: false, error: "La marca y el nombre son obligatorios." };

  const slug = slugCategoria(`${marca} ${nombre}`);
  if (cat.lineas.some((l) => l.slug === slug)) return { ok: false, error: `"${marca} ${nombre}" ya existe en esta categoría.` };

  cat.lineas.push({ marca, nombre, slug });
  saveCategories(cats);
  return { ok: true };
}

export function editarLinea(catSlug: string, lineaSlug: string, datos: { marca: string; nombre: string }): { ok: boolean; error?: string } {
  const cats = loadCategories();
  const cat = cats.find((c) => c.slug === catSlug);
  const linea = cat?.lineas.find((l) => l.slug === lineaSlug);
  if (!cat || !linea) return { ok: false, error: "No encontré ese producto." };
  if (!datos.marca.trim() || !datos.nombre.trim()) return { ok: false, error: "La marca y el nombre son obligatorios." };
  // Igual que con la categoría, el slug se conserva: es la clave de su imagen subida.
  linea.marca = datos.marca.trim();
  linea.nombre = datos.nombre.trim();
  saveCategories(cats);
  return { ok: true };
}

/** Fija (o quita) la imagen de una línea.
 *
 *  Hace falta porque la imagen vive en DOS sitios: el archivo en `public/lineas/…` y este
 *  campo, que es el que se usa cuando no hay archivo con el slug. Al subir una imagen solo
 *  se escribía el archivo, y al borrarla solo se borraba el archivo — así que "Eliminar
 *  imagen" decía "hecho", el panel la quitaba de la vista, y al recargar reaparecía: la
 *  que seguía apuntada aquí. Manteniendo los dos lados sincronizados, borrar borra. */
export function setLineaImagen(catSlug: string, lineaSlug: string, imagen: string | null): boolean {
  const cats = loadCategories();
  const linea = cats.find((c) => c.slug === catSlug)?.lineas.find((l) => l.slug === lineaSlug);
  if (!linea) return false;
  if (imagen) linea.imagen = imagen;
  else delete linea.imagen;
  saveCategories(cats);
  return true;
}

export function borrarLinea(catSlug: string, lineaSlug: string): { ok: boolean; error?: string } {
  const cats = loadCategories();
  const cat = cats.find((c) => c.slug === catSlug);
  if (!cat) return { ok: false, error: "No encontré esa categoría." };
  const i = cat.lineas.findIndex((l) => l.slug === lineaSlug);
  if (i === -1) return { ok: false, error: "No encontré ese producto." };
  cat.lineas.splice(i, 1);
  saveCategories(cats);
  return { ok: true };
}
