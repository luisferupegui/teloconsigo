import { siteConfig, urlAbsoluta } from "@/lib/seo";

// ─── Catálogo de APIs (RFC 9727) ─────────────────────────────────────────────
//
// Le dice a un agente qué APIs públicas tiene el sitio y dónde está su
// documentación. El formato es `application/linkset+json` (RFC 9264).
//
// SOLO SE ANUNCIA LO QUE ES PÚBLICO Y SEGURO DE LLAMAR. Deliberadamente NO
// aparecen aquí:
//   • /api/asesor — cada llamada consume la cuota de DeepSeek y de Serper, y no
//     tiene autenticación ni límite de uso. Publicarlo es invitar a que alguien
//     nos gaste el presupuesto.
//   • /api/conseguir — envía correo al equipo. Anunciarlo es abrir un buzón de spam.
//   • /api/admin/* — panel. Ya lo cierra `proxy.ts`, pero además no se nombra.

export const dynamic = "force-dynamic";

export async function GET() {
  const linkset = {
    linkset: [
      {
        anchor: urlAbsoluta("/api/business-products"),
        "service-doc": [{ href: urlAbsoluta("/tienda"), title: "Catálogo de productos publicados" }],
        describedby: [{ href: urlAbsoluta("/.well-known/ai-catalog.json"), type: "application/json" }],
        author: [{ href: siteConfig.url, title: siteConfig.nombre }],
      },
      {
        anchor: siteConfig.url,
        "service-doc": [{ href: urlAbsoluta("/faq"), title: "Preguntas frecuentes" }],
        item: [
          { href: urlAbsoluta("/sitemap.xml"), type: "application/xml", title: "Mapa del sitio" },
          { href: urlAbsoluta("/tienda"), type: "text/html", title: "Catálogo" },
        ],
      },
    ],
  };

  return Response.json(linkset, {
    headers: {
      "Content-Type": "application/linkset+json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
