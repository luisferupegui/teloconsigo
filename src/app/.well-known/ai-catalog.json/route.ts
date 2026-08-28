import { loadCategories } from "@/lib/categories";
import { loadPublishedBusinessProducts } from "@/lib/products";
import { siteConfig, urlAbsoluta } from "@/lib/seo";

// ─── Manifiesto ARD (Agentic Resource Discovery) ─────────────────────────────
//
// Describe, para un agente, qué recursos ofrece el sitio y qué preguntas sabe
// responder cada uno. Las `representativeQueries` son lo que hace útil el
// manifiesto: son las que un registro usa para decidir si este sitio sirve para
// una consulta concreta, así que están escritas como las escribiría un cliente
// colombiano de verdad, no como etiquetas de catálogo.
//
// Aquí tampoco se anuncia `/api/asesor` ni `/api/conseguir` (ver api-catalog).

export const dynamic = "force-dynamic";

const urn = (namespace: string, nombre: string) =>
  `urn:air:teloconsigo.co:${namespace}:${nombre}`;

export async function GET() {
  const cats = loadCategories();
  const productos = loadPublishedBusinessProducts();

  const catalogo = {
    specVersion: "0.1",
    host: {
      name: siteConfig.nombre,
      description: siteConfig.descripcion,
      url: siteConfig.url,
      contact: siteConfig.email,
      location: { locality: siteConfig.ciudad, region: siteConfig.region, country: "CO" },
      languages: ["es-CO"],
    },
    entries: [
      {
        id: urn("catalogo", "productos"),
        displayName: "Catálogo de productos",
        description: `${productos.length} productos publicados: portátiles, equipos de escritorio, monitores, accesorios y licencias, con precio en pesos colombianos.`,
        type: "application/json",
        url: urlAbsoluta("/api/business-products"),
        representativeQueries: [
          "¿Cuánto cuesta un portátil Lenovo en Colombia?",
          "Monitores de 24 pulgadas con precio en pesos",
          "Dónde comprar accesorios de computador en Medellín",
          "Precio de un todo en uno para oficina en Colombia",
        ],
      },
      {
        id: urn("catalogo", "categorias"),
        displayName: "Categorías de la tienda",
        description: `Las ${cats.length} categorías del catálogo y las marcas que hay en cada una.`,
        type: "text/markdown",
        url: urlAbsoluta("/tienda"),
        representativeQueries: [
          "¿Qué categorías de tecnología venden?",
          "¿Qué marcas de monitores manejan?",
          "Tienda de componentes de PC en Colombia",
        ],
      },
      {
        id: urn("sitio", "mapa"),
        displayName: "Mapa del sitio",
        description: "Todas las páginas indexables: categorías, fichas de producto e información de la tienda.",
        type: "application/xml",
        url: urlAbsoluta("/sitemap.xml"),
        representativeQueries: [
          "¿Qué páginas tiene teloconsigo.co?",
          "Listado de productos de teloconsigo",
        ],
      },
      {
        id: urn("sitio", "preguntas-frecuentes"),
        displayName: "Preguntas frecuentes",
        description: "Envíos, tiempos de entrega por ciudad, métodos de pago, garantía, cambios y devoluciones.",
        type: "text/markdown",
        url: urlAbsoluta("/faq"),
        representativeQueries: [
          "¿Cuánto tarda un envío a Bogotá?",
          "¿Qué garantía tienen los productos?",
          "¿Cómo devuelvo un producto que compré?",
          "¿Hacen envíos a todo Colombia?",
        ],
      },
    ],
  };

  return Response.json(catalogo, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
