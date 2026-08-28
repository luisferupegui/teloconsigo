import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getProductBySlug, loadPublishedBusinessProducts } from "@/lib/products";
import { formatCOP, type BusinessProduct } from "@/lib/products-types";
import { resolveProductImage } from "@/lib/product-images";
import { JsonLd } from "@/components/json-ld";
import {
  siteConfig, rutaProducto, slugProducto,
  productSchema, breadcrumbSchema,
} from "@/lib/seo";
import { FichaLegacy } from "./ficha-legacy";

// ─── Ficha de producto ───────────────────────────────────────────────────────
//
// Hasta ahora esta ruta solo servía los DOS productos de demostración del
// prototipo, y los 73 productos reales del catálogo no tenían ninguna URL que
// Google pudiera rastrear: vivían en modales de /tienda y en /conseguir?ref=…,
// que no son páginas. Es decir, el catálogo entero era invisible en las
// búsquedas — que es justo lo que se quería arreglar.
//
// Ahora la ruta resuelve primero el catálogo real (indexable, con datos
// estructurados) y conserva el legacy como respaldo para no romper los enlaces
// del carrito y la comparación.

const CATEGORIA_LABEL: Record<string, string> = {
  portatil:  "Portátiles",
  pc:        "Equipos de escritorio",
  monitor:   "Monitores",
  tablet:    "Tablets",
  licencia:  "Licencias y software",
  accesorio: "Accesorios",
};

/** Nombre legible de una spec ("precio_iva" → "Precio iva"). */
const etiquetaSpec = (k: string) =>
  k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

function buscarProducto(slug: string): BusinessProduct | null {
  return loadPublishedBusinessProducts().find((p) => slugProducto(p) === slug) ?? null;
}

export async function generateStaticParams() {
  return loadPublishedBusinessProducts().map((p) => ({ slug: slugProducto(p) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = buscarProducto(slug);

  if (!p) {
    // Ficha legacy: son datos de demostración, no deben entrar en el índice.
    const legacy = getProductBySlug(slug);
    if (!legacy) return {};
    return { title: legacy.nombre, robots: { index: false, follow: true } };
  }

  const precio = p.precioDesde ?? p.precio;
  const imagen = resolveProductImage(p.referencia ?? slugProducto(p), "detalle");
  // La descripción se arma con lo que el cliente busca: marca, producto y precio.
  const descripcion = [
    p.descripcionUso || `${p.nombre} ${p.marca}`,
    precio ? `Precio ${formatCOP(precio)}.` : null,
    "Envío a toda Colombia con garantía. Cotiza en línea con Andrea.",
  ].filter(Boolean).join(" ").slice(0, 300);

  return {
    title: `${p.nombre} — ${p.marca}`,
    description: descripcion,
    alternates: { canonical: rutaProducto(p) },
    openGraph: {
      title: `${p.nombre} — ${p.marca}`,
      description: descripcion,
      type: "website",
      locale: "es_CO",
      url: rutaProducto(p),
      siteName: siteConfig.nombre,
      ...(imagen ? { images: [{ url: imagen, alt: `${p.marca} ${p.nombre}` }] } : {}),
    },
  };
}

export default async function ProductoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = buscarProducto(slug);

  if (!p) {
    const legacy = getProductBySlug(slug);
    if (!legacy) notFound();
    return <FichaLegacy p={legacy} />;
  }

  const precio    = p.precioDesde ?? p.precio;
  const imagen    = resolveProductImage(p.referencia ?? slugProducto(p), "detalle");
  const categoria = CATEGORIA_LABEL[p.categoria] ?? "Catálogo";
  const specs     = Object.entries(p.specs ?? {}).filter(([, v]) => v);

  const migas = [
    { nombre: "Inicio", ruta: "/" },
    { nombre: "Catálogo", ruta: "/tienda" },
    { nombre: p.nombre, ruta: rutaProducto(p) },
  ];

  const relacionados = loadPublishedBusinessProducts()
    .filter((r) => r.categoria === p.categoria && r.id !== p.id)
    .slice(0, 4);

  const hrefAsesor = `/asesor?producto=${encodeURIComponent(p.nombre)}${
    p.referencia ? `&ref=${encodeURIComponent(p.referencia)}` : ""
  }${precio ? `&precio=${precio}` : ""}`;

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <JsonLd data={productSchema(p, imagen)} />
      <JsonLd data={breadcrumbSchema(migas)} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Migas */}
        <nav aria-label="Ruta de navegación" className="mb-6 flex flex-wrap items-center gap-1 text-xs text-zinc-400">
          {migas.map((m, i) => (
            <span key={m.ruta} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {i < migas.length - 1
                ? <Link href={m.ruta} className="transition hover:text-zinc-700">{m.nombre}</Link>
                : <span className="text-zinc-600">{m.nombre}</span>}
            </span>
          ))}
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Imagen */}
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {imagen ? (
              <Image
                src={imagen}
                alt={`${p.marca} ${p.nombre}`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-8"
                priority
              />
            ) : (
              <span className="text-sm text-zinc-300">Imagen no disponible</span>
            )}
          </div>

          {/* Datos */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#1e6cff]">{p.marca}</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-zinc-900">{p.nombre}</h1>
            <p className="mt-2 text-sm text-zinc-500">
              {categoria}
              {p.referencia && <> · Ref. <span className="font-mono text-xs">{p.referencia}</span></>}
            </p>

            {precio && (
              <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="text-4xl font-bold text-zinc-900">{formatCOP(precio)}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {p.precioIvaIncluido ? "IVA incluido" : "Antes de IVA"} · Envío a toda Colombia
                </p>

                <div className="mt-5 flex flex-col gap-2">
                  <Link
                    href={hrefAsesor}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#1e6cff] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1a5ce0]"
                  >
                    Cotizar con Andrea
                  </Link>
                  <Link
                    href={`/conseguir?ref=${encodeURIComponent(p.referencia ?? slugProducto(p))}`}
                    className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    Pedir por WhatsApp o correo
                  </Link>
                </div>
              </div>
            )}

            {p.descripcionUso && (
              <p className="mt-6 leading-relaxed text-zinc-700">{p.descripcionUso}</p>
            )}

            {specs.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-bold text-zinc-900">Especificaciones</h2>
                <dl className="mt-3 divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  {specs.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[140px_1fr] gap-4 px-4 py-2.5 text-sm">
                      <dt className="font-semibold text-zinc-600">{etiquetaSpec(k)}</dt>
                      <dd className="text-zinc-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
              {[["🚚", "Envío nacional"], ["🛡️", "Garantía oficial"], ["💬", "Asesoría real"]].map(([e, t]) => (
                <div key={t} className="rounded-xl border border-zinc-200 bg-white p-3">
                  <p className="text-xl">{e}</p>
                  <p className="mt-1 font-semibold text-zinc-700">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {relacionados.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-2xl font-bold text-zinc-900">También te puede interesar</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {relacionados.map((r) => {
                const img = resolveProductImage(r.referencia ?? slugProducto(r), "card");
                return (
                  <Link
                    key={r.id}
                    href={rutaProducto(r)}
                    className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="relative flex h-32 items-center justify-center border-b border-zinc-100">
                      {img
                        ? <Image src={img} alt={`${r.marca} ${r.nombre}`} fill sizes="200px" className="object-contain p-3" />
                        : <span className="text-xs text-zinc-300">Sin imagen</span>}
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-3">
                      <p className="line-clamp-2 text-sm font-semibold text-zinc-900 group-hover:text-[#1e6cff]">{r.nombre}</p>
                      {(r.precioDesde ?? r.precio) && (
                        <p className="mt-2 text-sm font-bold text-[#1e6cff]">{formatCOP(r.precioDesde ?? r.precio!)}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
