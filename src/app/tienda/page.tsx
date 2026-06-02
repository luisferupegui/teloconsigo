import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { categories, type Linea } from "@/lib/categories";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Catálogo | teloconsigo.co",
  description:
    "Explora todas las líneas de productos: procesadores, portátiles, memorias, almacenamiento, impresoras y más.",
};

const ASSET_V = "9";
const withV = (src: string) => `${src}?v=${ASSET_V}`;

// ─── Card de línea (igual que en /categoria/[slug]) ───────────────────────────

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
      className="group flex flex-col rounded-xl bg-white
                 ring-1 ring-zinc-200 ring-inset
                 shadow-sm transition-all duration-200
                 hover:-translate-y-1 hover:ring-[#1e6cff]/40
                 hover:shadow-[0_8px_30px_rgba(30,108,255,0.10)]
                 overflow-hidden will-change-transform"
    >
      {/* Imagen */}
      <div className="relative flex items-center justify-center bg-white h-32 border-b border-zinc-100">
        {linea.imagen ? (
          <Image
            src={withV(linea.imagen)}
            alt={`${linea.marca} ${linea.nombre}`}
            fill
            sizes="(max-width:640px) 45vw, (max-width:1024px) 28vw, 160px"
            quality={95}
            loading="eager"
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.07]"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl
                          bg-[#1e6cff]/8 border border-[#1e6cff]/15">
            <CatIcon className="h-6 w-6 text-[#1e6cff]" />
          </div>
        )}
      </div>

      {/* Texto */}
      <div className="flex flex-col flex-1 justify-between p-3.5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">
            {linea.marca}
          </p>
          <h3 className="text-sm font-bold text-zinc-900 leading-snug
                         group-hover:text-[#1e6cff] transition-colors">
            {linea.nombre}
          </h3>
        </div>
        <p className="mt-2.5 text-xs font-semibold text-[#1e6cff] opacity-0
                     group-hover:opacity-100 transition-opacity">
          Cotizar →
        </p>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TiendaPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;

  const catActiva = categoria
    ? categories.find((c) => c.slug === categoria)
    : null;

  if (categoria && !catActiva) notFound();

  return (
    <div className="min-h-screen bg-[#f8f9fb]">

      {/* ── Header ───────────────────────────── */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <nav className="text-xs text-zinc-400 mb-3">
            <Link href="/" className="hover:text-zinc-600 transition">Inicio</Link>
            <span className="mx-2">/</span>
            <Link href="/catalogo" className="hover:text-zinc-600 transition">Productos</Link>
            <span className="mx-2">/</span>
            {catActiva ? (
              <>
                <Link href="/tienda" className="hover:text-zinc-600 transition">Catálogo</Link>
                <span className="mx-2">/</span>
                <span className="text-zinc-600">{catActiva.nombre}</span>
              </>
            ) : (
              <span className="text-zinc-600">Catálogo</span>
            )}
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400
                           hover:text-[#1e6cff] transition mb-2"
              >
                <ArrowLeft className="h-3 w-3" /> Volver a Soluciones
              </Link>
              <h1 className="text-2xl font-bold text-zinc-900">
                {catActiva ? catActiva.nombre : "Catálogo completo"}
              </h1>
              {catActiva && (
                <p className="text-sm text-zinc-500 mt-0.5">{catActiva.descripcion}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Contenido ────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[200px_1fr]">

          {/* Sidebar */}
          <aside className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-3 mb-3">
              Categorías
            </p>
            <Link
              href="/tienda"
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition
                ${!catActiva
                  ? "bg-[#1e6cff] text-white font-semibold shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
            >
              Todas
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/tienda?categoria=${cat.slug}`}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition
                  ${catActiva?.slug === cat.slug
                    ? "bg-[#1e6cff] text-white font-semibold shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
              >
                <cat.Icon className={`h-3.5 w-3.5 shrink-0
                  ${catActiva?.slug === cat.slug ? "text-white" : "text-[#1e6cff]"}`}
                />
                {cat.nombre}
              </Link>
            ))}
          </aside>

          {/* Grid principal */}
          <div>
            {catActiva ? (
              /* ── Categoría específica: mostrar sus líneas ── */
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl
                                  border border-[#1e6cff]/25 bg-[#1e6cff]/8">
                    <catActiva.Icon className="h-5 w-5 text-[#1e6cff]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-zinc-900">{catActiva.nombre}</h2>
                    <p className="text-xs text-zinc-500">
                      {catActiva.lineas?.length ?? 0} líneas disponibles
                    </p>
                  </div>
                </div>

                {(catActiva.lineas?.length ?? 0) === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center">
                    <p className="text-zinc-500 text-sm">Próximamente</p>
                    <Link href="/conseguir" className="mt-4 inline-block text-sm font-semibold text-[#1e6cff]">
                      Solicitar igual →
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
                    {catActiva.lineas!.map((linea) => (
                      <LineaCard
                        key={linea.slug}
                        linea={linea}
                        catSlug={catActiva.slug}
                        CatIcon={catActiva.Icon}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ── Vista general: cards de todas las categorías ── */
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/tienda?categoria=${cat.slug}`}
                    className="group flex items-center gap-4 rounded-xl border border-zinc-200
                               bg-white p-5 shadow-sm transition-all
                               hover:-translate-y-0.5 hover:border-[#1e6cff]/40
                               hover:shadow-[0_6px_20px_rgba(30,108,255,0.08)]"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center
                                    rounded-xl border border-[#1e6cff]/20 bg-[#1e6cff]/8
                                    group-hover:bg-[#1e6cff]/15 transition">
                      <cat.Icon className="h-6 w-6 text-[#1e6cff]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-zinc-900 group-hover:text-[#1e6cff] transition">
                        {cat.nombre}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">
                        {cat.descripcion}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        {cat.lineas?.length ?? 0} líneas
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-[#1e6cff]
                                          group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
