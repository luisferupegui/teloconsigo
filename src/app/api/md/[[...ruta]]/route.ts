import { NextRequest } from "next/server";
import { loadCategories } from "@/lib/categories";
import { loadPublishedBusinessProducts } from "@/lib/products";
import { formatCOP, type BusinessProduct } from "@/lib/products-types";
import { siteConfig, rutaProducto, slugProducto, urlAbsoluta } from "@/lib/seo";

// ─── Markdown para agentes ───────────────────────────────────────────────────
//
// Un rastreador de IA que pide `Accept: text/markdown` recibe el contenido de la
// página en texto limpio en vez de HTML con menús, scripts y estilos. Para el
// navegador no cambia nada: el HTML sigue siendo la respuesta por defecto.
//
// El enrutado lo hace un rewrite en next.config.ts con `has: accept ~ markdown`,
// y SOLO para las rutas que aquí se saben generar. El resto del sitio sigue
// devolviendo HTML aunque lo pidan en markdown: es mejor eso que un 404.
//
// El markdown NO se produce raspando el HTML renderizado: se arma del mismo
// catálogo del que vive la página. Así no puede desincronizarse ni describir
// algo que la página ya no muestra.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIA_LABEL: Record<string, string> = {
  portatil: "Portátiles", pc: "Equipos de escritorio", monitor: "Monitores",
  tablet: "Tablets", licencia: "Licencias y software", accesorio: "Accesorios",
};

const pie = () =>
  `\n---\n\n**${siteConfig.nombre}** · ${siteConfig.ciudad}, Colombia · ` +
  `[${siteConfig.telefono}](tel:${siteConfig.telefono}) · ${siteConfig.email}\n` +
  `Atención de lunes a viernes, 8:00–18:00. Envíos a toda Colombia.\n`;

function fichaProducto(p: BusinessProduct): string {
  const precio = p.precioDesde ?? p.precio;
  const specs = Object.entries(p.specs ?? {}).filter(([, v]) => v);
  return [
    `# ${p.nombre}`,
    ``,
    `- **Marca:** ${p.marca}`,
    p.referencia ? `- **Referencia:** ${p.referencia}` : null,
    `- **Categoría:** ${CATEGORIA_LABEL[p.categoria] ?? p.categoria}`,
    precio ? `- **Precio:** ${formatCOP(precio)} COP${p.precioIvaIncluido ? " (IVA incluido)" : " (antes de IVA)"}` : null,
    `- **Disponibilidad:** disponible bajo pedido, envío a toda Colombia`,
    `- **URL:** ${urlAbsoluta(rutaProducto(p))}`,
    ``,
    p.descripcionUso ? `${p.descripcionUso}\n` : null,
    specs.length ? `## Especificaciones\n` : null,
    ...specs.map(([k, v]) => `- **${k.replace(/_/g, " ")}:** ${v}`),
    ``,
    `## Cómo comprarlo`,
    ``,
    `Cotiza en línea con Andrea, la asesora de la tienda: ${urlAbsoluta("/asesor")}`,
    pie(),
  ].filter((l) => l !== null).join("\n");
}

function paginaCategoria(slug: string): string | null {
  const cat = loadCategories().find((c) => c.slug === slug);
  if (!cat) return null;
  const porMarca = new Map<string, string[]>();
  for (const l of cat.lineas ?? []) {
    if (!porMarca.has(l.marca)) porMarca.set(l.marca, []);
    porMarca.get(l.marca)!.push(l.nombre);
  }
  return [
    `# ${cat.nombre} en Colombia`,
    ``,
    cat.descripcion,
    ``,
    `${cat.lineas.length} líneas de ${porMarca.size} marcas. URL: ${urlAbsoluta(`/categoria/${cat.slug}`)}`,
    ``,
    ...[...porMarca.entries()].flatMap(([marca, nombres]) => [
      `## ${marca}`,
      ...nombres.map((n) => `- ${n}`),
      ``,
    ]),
    pie(),
  ].join("\n");
}

function paginaTienda(): string {
  const cats = loadCategories();
  return [
    `# Catálogo de ${siteConfig.nombre}`,
    ``,
    siteConfig.descripcion,
    ``,
    `## Categorías`,
    ``,
    ...cats.map((c) => `- **[${c.nombre}](${urlAbsoluta(`/categoria/${c.slug}`)})** — ${c.descripcion} (${c.lineas.length} líneas)`),
    pie(),
  ].join("\n");
}

function paginaInicio(): string {
  const productos = loadPublishedBusinessProducts();
  const cats = loadCategories();
  return [
    `# ${siteConfig.nombre} — tecnología en Colombia`,
    ``,
    siteConfig.descripcion,
    ``,
    `- **Sitio:** ${siteConfig.url}`,
    `- **Ubicación:** ${siteConfig.ciudad}, ${siteConfig.region}, Colombia`,
    `- **Contacto:** ${siteConfig.telefono} · ${siteConfig.email}`,
    `- **Catálogo publicado:** ${productos.length} productos en ${cats.length} categorías`,
    ``,
    `## Qué hacemos`,
    ``,
    `Vendemos tecnología con asesoría: componentes, portátiles, equipos de escritorio,`,
    `monitores, periféricos y equipamiento para empresas. Si un producto no está en el`,
    `catálogo, lo conseguimos y lo cotizamos con precio y tiempo de entrega en firme.`,
    ``,
    `## Cómo cotizar`,
    ``,
    `- **Asesora en línea (Andrea):** ${urlAbsoluta("/asesor")} — precio, disponibilidad y entrega en minutos`,
    `- **Armador de PC:** ${urlAbsoluta("/armador")} — arma un equipo con compatibilidad verificada`,
    `- **Pedido especial:** ${urlAbsoluta("/conseguir")} — para lo que no esté en catálogo`,
    ``,
    `## Categorías`,
    ``,
    ...cats.map((c) => `- [${c.nombre}](${urlAbsoluta(`/categoria/${c.slug}`)})`),
    pie(),
  ].join("\n");
}

/** Páginas informativas: su contenido vive en el JSX, así que aquí se resume lo
 *  que un agente necesita saber, sin inventar nada que la página no diga. */
const INFORMATIVAS: Record<string, () => string> = {
  "/contacto": () => [
    `# Contacto — ${siteConfig.nombre}`,
    ``,
    `- **Teléfono y WhatsApp:** ${siteConfig.telefono}`,
    `- **Correo:** ${siteConfig.email}`,
    `- **Ubicación:** ${siteConfig.ciudad}, ${siteConfig.region}, Colombia`,
    `- **Horario:** lunes a viernes, 8:00 am – 6:00 pm`,
    `- **Cobertura:** envíos a toda Colombia`,
    ``,
    `Para cotizar un producto es más rápido la asesora en línea: ${urlAbsoluta("/asesor")}`,
    pie(),
  ].join("\n"),
  "/envios": () => [
    `# Envíos y entregas`,
    ``,
    `Despachamos a cualquier municipio de Colombia con Servientrega, Coordinadora,`,
    `Interrapidísimo y TCC.`,
    ``,
    `- **Medellín:** 1 día hábil`,
    `- **Bogotá, Cali, Barranquilla:** 1–3 días hábiles`,
    `- **Otras ciudades:** 3–5 días hábiles`,
    ``,
    `Los tiempos corren desde la confirmación del pago. Todo envío lleva guía de rastreo.`,
    pie(),
  ].join("\n"),
};

function markdownDe(ruta: string): string | null {
  if (ruta === "/" || ruta === "") return paginaInicio();
  if (ruta === "/tienda" || ruta === "/catalogo") return paginaTienda();
  if (INFORMATIVAS[ruta]) return INFORMATIVAS[ruta]();

  const cat = ruta.match(/^\/categoria\/([^/]+)$/);
  if (cat) return paginaCategoria(decodeURIComponent(cat[1]));

  const prod = ruta.match(/^\/producto\/([^/]+)$/);
  if (prod) {
    const slug = decodeURIComponent(prod[1]);
    const p = loadPublishedBusinessProducts().find((x) => slugProducto(x) === slug);
    return p ? fichaProducto(p) : null;
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ruta?: string[] }> },
) {
  const { ruta } = await params;
  const camino = `/${(ruta ?? []).join("/")}`.replace(/\/$/, "") || "/";
  const md = markdownDe(camino);

  if (!md) return new Response("No encontrado", { status: 404 });

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // Aproximación de tokens (~4 caracteres por token) para que un agente
      // sepa cuánto le va a costar leer la página antes de pedirla entera.
      "x-markdown-tokens": String(Math.ceil(md.length / 4)),
      "Cache-Control": "public, max-age=0, must-revalidate",
      Vary: "Accept",
    },
  });
}
