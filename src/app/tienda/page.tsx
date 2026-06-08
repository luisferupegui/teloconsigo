import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { existsSync, statSync } from "fs";
import path from "path";
import { categories, type Linea } from "@/lib/categories";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { loadPublishedBusinessProducts } from "@/lib/products";
import { resolveProductImage } from "@/lib/product-images";
import { TiendaSearchResults } from "@/components/tienda-search-results";
import type { QuickViewProduct } from "@/components/product-quick-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Catálogo | teloconsigo.co",
  description:
    "Explora todas las líneas de productos: procesadores, portátiles, memorias, almacenamiento, impresoras y más.",
};

const ASSET_V = "9";
const withV = (src: string) => `${src}?v=${ASSET_V}`;

const EXTS = ["webp", "jpg", "jpeg", "png"] as const;

function resolveLineImg(catSlug: string, linea: Linea): string | null {
  // Slug-specific file (admin upload) takes priority over brand-level fallback
  for (const ext of EXTS) {
    const rel = `/lineas/${catSlug}/${linea.slug}.${ext}`;
    const abs = path.join(process.cwd(), "public", rel);
    if (existsSync(abs)) return `${rel}?v=${Math.floor(statSync(abs).mtimeMs)}`;
  }
  if (linea.imagen) {
    const abs = path.join(process.cwd(), "public", linea.imagen.replace(/^\//, ""));
    if (existsSync(abs)) return `${linea.imagen}?v=${Math.floor(statSync(abs).mtimeMs)}`;
  }
  return null;
}

// ─── Card de línea (igual que en /categoria/[slug]) ───────────────────────────

function LineaCard({
  linea,
  catSlug,
  CatIcon,
  imageUrl,
}: {
  linea: Linea;
  catSlug: string;
  CatIcon: React.ComponentType<{ className?: string }>;
  imageUrl: string | null;
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
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${linea.marca} ${linea.nombre}`}
            fill
            sizes="(max-width:640px) 45vw, (max-width:1024px) 28vw, 160px"
            unoptimized
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
  searchParams: Promise<{ categoria?: string; q?: string }>;
}) {
  const { categoria, q } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";

  // ── Búsqueda por texto ──────────────────────────────────────────────────────
  if (query) {
    const todos = loadPublishedBusinessProducts();
    const terms = query.split(/\s+/).filter(Boolean);

    // Mapa de sinónimos en español → slug de categoría
    const CAT_SYNONYMS: Record<string, string> = {
      "memoria": "memoria-ram", "ram": "memoria-ram", "ddr": "memoria-ram", "ddr4": "memoria-ram", "ddr5": "memoria-ram",
      "procesador": "procesador", "cpu": "procesador", "intel": "procesador", "ryzen": "procesador",
      "monitor": "monitor", "pantalla": "monitor",
      "disco": "almacenamiento", "ssd": "almacenamiento", "nvme": "almacenamiento", "hdd": "almacenamiento",
      "grafica": "tarjeta-grafica", "gpu": "tarjeta-grafica", "rtx": "tarjeta-grafica", "gtx": "tarjeta-grafica",
      "portatil": "portatil", "laptop": "portatil", "notebook": "portatil",
      "teclado": "teclado", "mouse": "mouse", "audifonos": "auriculares", "auricular": "auriculares",
      "impresora": "impresora", "router": "redes", "red": "redes", "wifi": "redes",
      "fuente": "fuente-poder", "psu": "fuente-poder",
      "placa": "motherboard", "board": "motherboard", "mainboard": "motherboard",
    };

    // Detectar si el query apunta a una categoría específica
    const catMatch = terms.map(t => CAT_SYNONYMS[t]).find(Boolean);

    const resultados = todos.filter((p) => {
      const primary = `${p.nombre} ${p.marca} ${p.categoria}`.toLowerCase();
      // Si detectamos categoría, filtrar por ella primero
      if (catMatch && p.categoria !== catMatch) return false;
      // Todos los términos deben aparecer en nombre+marca+categoría
      return terms.every((t) => primary.includes(t) || (catMatch && CAT_SYNONYMS[t] === catMatch));
    });

    // Mapear a QuickViewProduct (imagen ya resuelta aquí en el servidor)
    const searchProducts: QuickViewProduct[] = resultados.map((p) => ({
      id: p.id,
      slug: p.slug ?? p.referencia ?? "",
      nombre: p.nombre,
      marca: p.marca,
      categoria: p.categoria,
      precio: p.precioDesde ?? p.precio ?? 0,
      imagen: resolveProductImage(p.referencia ?? "", "card") ?? "",
      referencia: p.referencia ?? "",
      descripcionUso: p.descripcionUso ?? "",
    }));

    return (
      <div className="min-h-screen bg-[#f8f9fb]">
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <nav className="text-xs text-zinc-400 mb-3">
              <Link href="/" className="hover:text-zinc-600 transition">Inicio</Link>
              <span className="mx-2">/</span>
              <Link href="/tienda" className="hover:text-zinc-600 transition">Catálogo</Link>
              <span className="mx-2">/</span>
              <span className="text-zinc-600">Búsqueda</span>
            </nav>
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-zinc-400" />
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">
                  Resultados para &quot;{q}&quot;
                </h1>
                <p className="text-sm text-zinc-500 mt-0.5">
                  {resultados.length} producto{resultados.length !== 1 ? "s" : ""} encontrado{resultados.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <TiendaSearchResults products={searchProducts} query={q ?? ""} />
        </div>
      </div>
    );
  }

  // ── Vista normal por categorías ─────────────────────────────────────────────
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
                        imageUrl={resolveLineImg(catActiva.slug, linea)}
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
