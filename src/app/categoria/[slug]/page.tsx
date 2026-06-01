import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { categories, type Linea } from "@/lib/categories";
import type React from "react";

/* Cache-busting para imágenes de línea/categoría.
   Las URLs del optimizador (/_next/image?url=…) son idénticas tras
   reemplazar los archivos, así que los navegadores siguen sirviendo la
   versión vieja en caché. Subir esta versión fuerza una URL nueva →
   refetch garantizado de la imagen nítida, sin que el usuario limpie caché.
   ▸ Súbela (v4, v5…) cada vez que reproceses las imágenes de /public/lineas. */
const ASSET_V = "9";
const withV = (src: string) => `${src}?v=${ASSET_V}`;

export async function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return {};
  return {
    title: `${cat.nombre} | teloconsigo.co`,
    description: cat.descripcion,
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
        {linea.imagen ? (
          <Image
            src={withV(linea.imagen)}
            alt={`${linea.marca} ${linea.nombre}`}
            fill
            sizes="(max-width:640px) 45vw, (max-width:1024px) 28vw, 180px"
            quality={100}
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
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();

  // Agrupar líneas. Si tienen `tipo` (p. ej. impresoras: láser / inyección),
  // se agrupan en dos niveles: tipo → marca. Si no, solo por marca.
  const TIPO_LABEL: Record<string, string> = {
    laser: "Impresoras Láser",
    inyeccion: "Impresoras de Inyección de Tinta",
  };
  const TIPO_ORDEN = ["laser", "inyeccion"] as const;
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

      {/* Breadcrumb */}
      <nav className="text-xs text-zinc-500 mb-5">
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
