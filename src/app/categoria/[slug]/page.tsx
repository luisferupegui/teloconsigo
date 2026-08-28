import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { loadCategories, type Linea } from "@/lib/categories";
import { conIconos } from "@/lib/categories-icons";
import { resolveLineImage } from "@/lib/line-images";
import { JsonLd } from "@/components/json-ld";
import { siteConfig, breadcrumbSchema, itemListSchema } from "@/lib/seo";

// La taxonomía se lee del disco en cada render (vive en data/categories.json y se
// gestiona desde el panel), y `conIconos` le devuelve el `cat.Icon` que ya usaba el JSX.
const categorias = () => conIconos(loadCategories());
import type React from "react";

export async function generateStaticParams() {
  return categorias().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = categorias().find((c) => c.slug === slug);
  if (!cat) return {};
  // La descripción nombra las marcas reales de la categoría: es lo que la gente
  // escribe en Google ("monitores samsung medellín") y lo que hace que el
  // resultado se lea como una respuesta y no como un título genérico.
  const marcas = [...new Set((cat.lineas ?? []).map((l) => l.marca))].slice(0, 6);
  const descripcion = [
    cat.descripcion,
    marcas.length ? `Encuentra ${marcas.join(", ")} y más.` : "",
    "Envío a toda Colombia con garantía y asesoría personalizada.",
  ].filter(Boolean).join(" ").slice(0, 300);

  return {
    title: `${cat.nombre} en Colombia`,
    description: descripcion,
    alternates: { canonical: `/categoria/${cat.slug}` },
    openGraph: {
      title: `${cat.nombre} en Colombia | ${siteConfig.nombre}`,
      description: descripcion,
      type: "website",
      locale: "es_CO",
      url: `/categoria/${cat.slug}`,
      siteName: siteConfig.nombre,
    },
  };
}

/* ── Card de línea/familia ─────────────────────────────────────────── */
function LineaCard({
  linea,
  catSlug,
  CatIcon,
}: {
  linea: Linea;
  catSlug: string;
  CatIcon: React.ComponentType<{ className?: string }>;
}) {
  // Misma resolución que en /tienda y en el panel: primero lo subido desde el admin,
  // luego la imagen que trae el repositorio. Esta página solo miraba `linea.imagen`,
  // así que una imagen cambiada desde el panel no llegaba a verse aquí.
  const imageUrl = resolveLineImage(catSlug, linea.slug, linea.imagen);
  const href = `/conseguir?cat=${catSlug}&marca=${encodeURIComponent(linea.marca)}&linea=${encodeURIComponent(linea.nombre)}`;
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl bg-white
                 ring-1 ring-zinc-200 ring-inset
                 shadow-sm transition-all duration-200
                 hover:-translate-y-1 hover:ring-[#1e6cff]/40
                 hover:shadow-[0_8px_30px_rgba(30,108,255,0.10)]
                 overflow-hidden will-change-transform"
    >
      {/* Imagen o ícono fallback */}
      <div className="relative flex items-center justify-center bg-white h-36 border-b border-zinc-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${linea.marca} ${linea.nombre}`}
            fill
            sizes="(max-width:640px) 45vw, (max-width:1024px) 28vw, 180px"
            unoptimized
            loading="eager"
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.08]"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl
                          bg-[#1e6cff]/8 border border-[#1e6cff]/15">
            <CatIcon className="h-7 w-7 text-[#1e6cff]" />
          </div>
        )}
      </div>

      {/* Texto + CTA */}
      <div className="flex flex-col flex-1 justify-between p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">
            {linea.marca}
          </p>
          <h3 className="text-sm font-bold text-zinc-900 leading-snug
                         group-hover:text-[#1e6cff] transition-colors">
            {linea.nombre}
          </h3>
        </div>
        <p className="mt-3 text-xs font-semibold text-[#1e6cff] opacity-0
                     group-hover:opacity-100 transition-opacity">
          Cotizar →
        </p>
      </div>
    </Link>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default async function CategoriaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = categorias().find((c) => c.slug === slug);
  if (!cat) notFound();

  // Agrupar líneas. Si tienen `tipo` (p. ej. impresoras: láser / inyección),
  // se agrupan en dos niveles: tipo → marca. Si no, solo por marca.
  const TIPO_LABEL: Record<string, string> = {
    laser: "Impresoras Láser",
    inyeccion: "Impresoras de Inyección de Tinta",
    "almacenamiento-mem": "Almacenamiento y Memoria",
    conectividad: "Conectividad y Expansión",
    perifericos: "Periféricos de Entrada",
    "audio-video": "Audio, Video y Streaming",
    "energia-soporte": "Energía, Soporte y Mantenimiento",
  };
  const TIPO_ORDEN = ["laser", "inyeccion", "almacenamiento-mem", "conectividad", "perifericos", "audio-video", "energia-soporte"] as const;
  const lineas = cat.lineas ?? [];
  const usaTipo = lineas.some((l) => l.tipo);

  const agruparPorMarca = (ls: Linea[]): [string, Linea[]][] => {
    const m = new Map<string, Linea[]>();
    for (const l of ls) {
      if (!m.has(l.marca)) m.set(l.marca, []);
      m.get(l.marca)!.push(l);
    }
    return [...m.entries()];
  };

  const secciones: { titulo: string | null; marcas: [string, Linea[]][] }[] = usaTipo
    ? TIPO_ORDEN.filter((t) => lineas.some((l) => l.tipo === t)).map((t) => ({
        titulo: TIPO_LABEL[t],
        marcas: agruparPorMarca(lineas.filter((l) => l.tipo === t)),
      }))
    : [{ titulo: null, marcas: agruparPorMarca(lineas) }];

  const totalLineas = lineas.length;
  const totalMarcas = new Set(lineas.map((l) => l.marca)).size;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Lo que la página muestra, también para Google: la ruta de navegación y
          el listado de líneas de esta categoría. */}
      <JsonLd data={breadcrumbSchema([
        { nombre: "Inicio", ruta: "/" },
        { nombre: "Catálogo", ruta: "/catalogo" },
        { nombre: cat.nombre, ruta: `/categoria/${cat.slug}` },
      ])} />
      <JsonLd data={itemListSchema(
        cat.nombre,
        lineas.map((l) => ({
          nombre: `${l.marca} ${l.nombre}`,
          ruta: `/asesor?producto=${encodeURIComponent(`${l.marca} ${l.nombre}`)}`,
        })),
      )} />

      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación" className="text-xs text-zinc-500 mb-5">
        <Link href="/" className="hover:underline">Inicio</Link>
        <span className="mx-2">/</span>
        <Link href="/catalogo" className="hover:underline">Catálogo</Link>
        <span className="mx-2">/</span>
        <span>{cat.nombre}</span>
      </nav>

      {/* ── Header ── */}
      <div className="flex items-center gap-5 mb-2">
        {/* Badge de ícono azul — MISMO estilo para todas las categorías
            (sin fotos en el encabezado, por consistencia visual). */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl
                        border border-[#1e6cff]/25 bg-[#1e6cff]/8 shrink-0">
          <cat.Icon className="h-10 w-10 text-[#1e6cff]" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-900">
            {cat.nombre}
          </h1>
          <p className="mt-1 text-zinc-500">{cat.descripcion}</p>
        </div>
      </div>

      {/* Contador */}
      {totalLineas > 0 && (
        <p className="text-xs text-zinc-400 mb-8 mt-1">
          {totalMarcas} marca{totalMarcas !== 1 ? "s" : ""} · {totalLineas} línea{totalLineas !== 1 ? "s" : ""}
        </p>
      )}

      {/* ── Sin líneas ── */}
      {totalLineas === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-12 text-center">
          <p className="text-2xl">📦</p>
          <h3 className="mt-3 text-lg font-semibold">Próximamente</h3>
          <p className="mt-2 text-zinc-500">
            Estamos configurando las líneas de {cat.nombre.toLowerCase()}.
          </p>
          <Link
            href={`/conseguir?cat=${cat.slug}`}
            className="mt-5 inline-flex rounded-full bg-[#1e6cff] px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            Te lo conseguimos →
          </Link>
        </div>
      )}

      {/* ── Secciones (por tipo si aplica) → marcas → familias ── */}
      <div className="space-y-12">
        {secciones.map((sec) => (
          <div key={sec.titulo ?? "all"}>
            {sec.titulo && (
              <h2 className="font-display text-xl font-bold text-zinc-900 mb-6
                             pb-2 border-b-2 border-[#1e6cff]/20">
                {sec.titulo}
              </h2>
            )}
            <div className="space-y-10">
              {sec.marcas.map(([marca, lineasMarca]) => (
                <section key={marca}>
                  {/* Cabecera de marca */}
                  <div className="flex items-center gap-3 mb-5">
                    <span className="inline-flex items-center rounded-full border border-zinc-200
                                     bg-zinc-50 px-3.5 py-1.5 text-sm font-bold text-zinc-800 shadow-sm">
                      {marca}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {lineasMarca.length} línea{lineasMarca.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Grid de cards */}
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {lineasMarca.map((linea) => (
                      <LineaCard
                        key={linea.slug}
                        linea={linea}
                        catSlug={slug}
                        CatIcon={cat.Icon}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── CTA final ── */}
      {totalLineas > 0 && (
        <div className="mt-14 rounded-2xl bg-gradient-to-r from-[#0f3d91] to-[#1e6cff] p-8 text-white text-center">
          <cat.Icon className="mx-auto mb-3 h-7 w-7 opacity-75" />
          <h2 className="text-lg font-bold mb-2">¿No ves lo que buscas?</h2>
          <p className="text-blue-100 text-sm mb-5 max-w-md mx-auto leading-relaxed">
            Manejamos muchas más referencias. Cuéntanos exactamente qué necesitas
            y te cotizamos en minutos.
          </p>
          <Link
            href={`/conseguir?cat=${slug}`}
            className="inline-flex rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition"
          >
            Solicitar cotización →
          </Link>
        </div>
      )}
    </div>
  );
}
