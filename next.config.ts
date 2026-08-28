import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],

  // Imágenes que el panel sube EN CALIENTE (fotos de producto y de líneas).
  //
  // En producción Next.js indexa `public/` una sola vez al arrancar y responde 404 a
  // cualquier archivo que aparezca después, aunque esté en el disco. Por eso subir una
  // imagen desde /admin funcionaba en local y no "en la web".
  //
  // `fallback` se consulta al final del todo: después de las páginas, las rutas
  // dinámicas y los archivos estáticos, justo antes del 404. Así lo que vino con el
  // build se sigue sirviendo estático y solo lo subido después pasa por el handler,
  // que mira el disco. Ver src/app/api/media/[...ruta]/route.ts.
  // Enlaces de descubrimiento (RFC 8288). Un agente que hace HEAD a la portada
  // ve, sin descargar el HTML, dónde están el catálogo de APIs, el manifiesto de
  // recursos y el mapa del sitio.
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Link",
            value: [
              '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
              '</.well-known/ai-catalog.json>; rel="describedby"; type="application/json"',
              '</sitemap.xml>; rel="sitemap"; type="application/xml"',
              '</faq>; rel="help"; type="text/html"',
            ].join(", "),
          },
        ],
      },
    ];
  },

  async rewrites() {
    return {
      // Markdown para agentes: si la petición dice `Accept: text/markdown`, la
      // respuesta la genera /api/md en vez del HTML. El navegador nunca manda esa
      // cabecera, así que para una persona no cambia nada.
      //
      // Las rutas están enumeradas a propósito y no con un comodín: si un agente
      // pide en markdown una página que no sabemos generar, es mejor que reciba
      // el HTML —que sí tiene el contenido— que un 404.
      beforeFiles: [
        "/",
        "/tienda",
        "/catalogo",
        "/contacto",
        "/envios",
        "/categoria/:slug",
        "/producto/:slug",
      ].map((source) => ({
        source,
        has: [{ type: "header" as const, key: "accept", value: ".*text/markdown.*" }],
        destination: source === "/" ? "/api/md" : `/api/md${source}`,
      })),
      afterFiles: [],
      fallback: [
        { source: "/productos/:ruta*",       destination: "/api/media/productos/:ruta*" },
        { source: "/lineas/:ruta*",          destination: "/api/media/lineas/:ruta*" },
        // Imágenes de línea subidas desde el panel. No viven en `public/` sino en
        // `data/lineas-img/`, que en Railway es volumen persistente: así sobreviven
        // al deploy siguiente. Aquí nunca hay archivo estático, siempre pasa al handler.
        { source: "/lineas-subidas/:ruta*",  destination: "/api/media/lineas-subidas/:ruta*" },
      ],
    };
  },

  experimental: {
    proxyClientMaxBodySize: 52_428_800, // 50 MB — para importar PDFs grandes de Janus
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    qualities: [75, 100],
    localPatterns: [
      { pathname: "/**" },
      { pathname: "/api/product-image", search: "" },
    ],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "cdn.pixabay.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "cdn.simpleicons.org" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
};

export default nextConfig;
