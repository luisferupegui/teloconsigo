import type { MetadataRoute } from "next";
import { loadPublishedBusinessProducts } from "@/lib/products";
import { loadCategories } from "@/lib/categories";
import { siteConfig, rutaProducto } from "@/lib/seo";

// El sitemap es la lista de lo que Google puede descubrir. Antes publicaba 25
// URLs, y las dos únicas fichas de producto que traía eran las de PRUEBA de
// `data/products.json` ("AMD Ryzen 5 7600", "Kingston Fury Beast"): los 73
// productos reales del catálogo no aparecían por ningún lado, ni tampoco
// /tienda, /nosotros, /contacto ni el resto de páginas del sitio.

const BASE = siteConfig.url;

/** Páginas fijas, con la prioridad que les corresponde en el negocio. */
const ESTATICAS: [ruta: string, prioridad: number, frecuencia: "daily" | "weekly" | "monthly"][] = [
  ["",              1.0, "daily"],
  ["/tienda",       0.9, "daily"],
  ["/catalogo",     0.8, "weekly"],
  ["/soluciones",   0.8, "weekly"],
  ["/armador",      0.8, "weekly"],
  ["/asesor",       0.7, "weekly"],
  ["/conseguir",    0.7, "monthly"],
  ["/nosotros",     0.6, "monthly"],
  ["/contacto",     0.6, "monthly"],
  ["/faq",          0.5, "monthly"],
  ["/envios",       0.4, "monthly"],
  ["/garantia",     0.4, "monthly"],
  ["/devoluciones", 0.4, "monthly"],
  ["/terminos",     0.2, "yearly" as "monthly"],
  ["/privacidad",   0.2, "yearly" as "monthly"],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date();

  const estaticas = ESTATICAS.map(([ruta, priority, changeFrequency]) => ({
    url: `${BASE}${ruta}`,
    lastModified: ahora,
    changeFrequency,
    priority,
  }));

  const categorias = loadCategories().map((c) => ({
    url: `${BASE}/categoria/${c.slug}`,
    lastModified: ahora,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Las fichas de producto: lo que de verdad se busca en Google ("morral targus
  // precio", "portátil lenovo core i5 medellín") y lo que hasta ahora no existía
  // como URL rastreable.
  const productos = loadPublishedBusinessProducts().map((p) => ({
    url: `${BASE}${rutaProducto(p)}`,
    lastModified: ahora,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...estaticas, ...categorias, ...productos];
}
