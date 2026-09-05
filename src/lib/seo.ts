import type { BusinessProduct } from "./products-types";
import { slugify } from "./products-types";
import { CONTACTO } from "./contacto";

// ─── SEO: un solo sitio donde vive la identidad del negocio ──────────────────
//
// Todo lo que Google necesita saber de teloconsigo.co sale de aquí: los datos de
// la ficha de empresa, la URL canónica de cada página y los datos estructurados
// (JSON-LD) de cada tipo de página.
//
// El teléfono y el correo NO se escriben aquí: vienen de `contacto.ts`, que es de
// donde también tiran el pie de página, el botón de WhatsApp y Andrea. Lo que
// Google publica del negocio y lo que el cliente ve en pantalla tienen que ser el
// mismo dato, o la ficha de empresa manda llamadas a una línea que ya no existe.
//
// REGLA QUE NO SE ROMPE: el JSON-LD describe lo que la página MUESTRA. Nada de
// adornar. Google penaliza como engañoso un schema que promete algo que el
// visitante no encuentra, y una penalización manual cuesta más que cualquier
// estrella de más en el resultado de búsqueda.

export const siteConfig = {
  nombre: "Te lo Consigo",
  nombreLegal: "teloconsigo.co",
  url: "https://teloconsigo.co",
  descripcion:
    "Tienda de tecnología en Colombia. Componentes, periféricos, portátiles y equipos para empresas, con asesoría personalizada. Si no lo encuentras, te lo conseguimos.",
  logo: "/logo-header@2x.png",
  imagenSocial: "/hero-banner.png",
  telefono: CONTACTO.telefono,
  email: CONTACTO.email,
  ciudad: "Medellín",
  region: "Antioquia",
  pais: "CO",
  moneda: "COP",
  idioma: "es-CO",
} as const;

/** URL absoluta a partir de una ruta del sitio. */
export const urlAbsoluta = (ruta: string) =>
  `${siteConfig.url}${ruta.startsWith("/") ? ruta : `/${ruta}`}`;

/** Slug con el que un producto del catálogo vive en la web.
 *  Los productos importados no traen slug propio, así que se deriva del nombre
 *  (verificado: los 73 publicados dan slugs únicos). */
export const slugProducto = (p: BusinessProduct) => p.slug || slugify(p.nombre);

/** Ruta canónica de la ficha de un producto. */
export const rutaProducto = (p: BusinessProduct) => `/producto/${slugProducto(p)}`;

// ─── Datos estructurados ─────────────────────────────────────────────────────

/** La empresa. Va UNA vez, en el layout raíz — no se repite por página.
 *
 *  Es `OnlineStore` y no `LocalBusiness` a propósito: no hay tienda física con
 *  dirección de calle que un cliente pueda visitar, y declarar una que no existe
 *  es justo el tipo de dato que Google castiga. Se declara la ciudad, que sí es
 *  cierta, y el área que se atiende. */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.nombre,
    alternateName: siteConfig.nombreLegal,
    url: siteConfig.url,
    logo: urlAbsoluta(siteConfig.logo),
    image: urlAbsoluta(siteConfig.imagenSocial),
    description: siteConfig.descripcion,
    email: siteConfig.email,
    telephone: siteConfig.telefono,
    currenciesAccepted: siteConfig.moneda,
    address: {
      "@type": "PostalAddress",
      addressLocality: siteConfig.ciudad,
      addressRegion: siteConfig.region,
      addressCountry: siteConfig.pais,
    },
    areaServed: { "@type": "Country", name: "Colombia" },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: siteConfig.telefono,
      email: siteConfig.email,
      contactType: "sales",
      areaServed: "CO",
      availableLanguage: ["es"],
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
  };
}

/** El sitio, con su buscador. Le dice a Google que /tienda?q= es la búsqueda
 *  interna, que es lo que habilita el cuadro de búsqueda en el resultado. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    url: siteConfig.url,
    name: siteConfig.nombre,
    description: siteConfig.descripcion,
    inLanguage: siteConfig.idioma,
    publisher: { "@id": `${siteConfig.url}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/tienda?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Migas de pan. Google las usa para mostrar la ruta en vez de la URL cruda. */
export function breadcrumbSchema(items: { nombre: string; ruta: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.nombre,
      item: urlAbsoluta(it.ruta),
    })),
  };
}

/** Ficha de producto: `Product` + `Offer` con el precio real.
 *
 *  SIN `aggregateRating`: el catálogo no tiene reseñas de clientes. Inventarlas
 *  daría estrellas en el resultado de búsqueda, y es exactamente lo que Google
 *  sanciona con acción manual. Cuando haya reseñas de verdad, se añaden aquí. */
export function productSchema(p: BusinessProduct, imagen: string | null) {
  const precio = p.precioDesde ?? p.precio;
  const specs = Object.entries(p.specs ?? {}).map(([k, v]) => ({
    "@type": "PropertyValue",
    name: k.replace(/_/g, " "),
    value: String(v),
  }));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nombre,
    description: p.descripcionUso || p.nombre,
    sku: p.referencia ?? undefined,
    brand: { "@type": "Brand", name: p.marca },
    ...(imagen ? { image: [urlAbsoluta(imagen)] } : {}),
    ...(specs.length ? { additionalProperty: specs } : {}),
    ...(precio
      ? {
          offers: {
            "@type": "Offer",
            url: urlAbsoluta(rutaProducto(p)),
            price: String(precio),
            priceCurrency: siteConfig.moneda,
            availability: "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@id": `${siteConfig.url}/#organization` },
          },
        }
      : {}),
  };
}

/** Listado de productos de una categoría. */
export function itemListSchema(
  nombre: string,
  productos: { nombre: string; ruta: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: nombre,
    numberOfItems: productos.length,
    itemListElement: productos.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.nombre,
      url: urlAbsoluta(p.ruta),
    })),
  };
}
