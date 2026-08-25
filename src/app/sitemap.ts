import type { MetadataRoute } from "next";
import { products } from "@/lib/products";
import { loadCategories } from "@/lib/categories";

const BASE = "https://teloconsigo.co";
// Dominio comprado en Namecheap

export default function sitemap(): MetadataRoute.Sitemap {
  const staticUrls = [
    "",
    "/catalogo",
    "/armador",
    "/asesor",
    "/conseguir",
  ].map((p) => ({
    url: `${BASE}${p}`,
    lastModified: new Date(),
  }));

  const catUrls = loadCategories().map((c) => ({
    url: `${BASE}/categoria/${c.slug}`,
    lastModified: new Date(),
  }));

  const productUrls = products.map((p) => ({
    url: `${BASE}/producto/${p.slug}`,
    lastModified: new Date(),
  }));

  return [...staticUrls, ...catUrls, ...productUrls];
}
