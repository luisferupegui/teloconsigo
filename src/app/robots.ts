import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nada de esto aporta a la búsqueda y algo de ello no debe salir nunca
        // en un resultado: el panel, las APIs y las páginas que solo tienen
        // sentido con el estado del propio visitante (su carrito, sus favoritos,
        // su comparación). Rastrearlas gasta presupuesto de rastreo en páginas
        // que para Google están siempre vacías.
        disallow: ["/admin", "/api/", "/carrito", "/favoritos", "/comparar"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
