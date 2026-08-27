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
  async rewrites() {
    return {
      beforeFiles: [],
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
