import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/products";
import { categories } from "@/lib/categories";

export const metadata = {
  title: "Catálogo completo",
  description:
    "Explora todos nuestros productos de tecnología: procesadores, tarjetas gráficas, memorias, almacenamiento, periféricos y más.",
};

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const filtrados = q
    ? products.filter((p) =>
        `${p.nombre} ${p.marca} ${p.categoria}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
    : products;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="text-xs text-zinc-500 mb-3">
        <Link href="/" className="hover:underline">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <span>Catálogo</span>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">
            {q ? `Resultados para "${q}"` : "Catálogo completo"}
          </h1>
          <p className="mt-1 text-zinc-600">
            {filtrados.length} producto{filtrados.length !== 1 && "s"}
          </p>
        </div>
        <form action="/catalogo" className="flex max-w-md flex-1">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar productos…"
            className="w-full rounded-l-full border border-zinc-300 px-4 py-2 text-sm"
          />
          <button className="rounded-r-full bg-[#1e6cff] px-5 py-2 text-sm font-semibold text-white">
            Buscar
          </button>
        </form>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-2">
          <h2 className="text-sm font-bold text-zinc-900">Categorías</h2>
          <Link
            href="/catalogo"
            className="block rounded px-3 py-2 text-sm font-medium hover:bg-blue-50"
          >
            Todas
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categoria/${cat.slug}`}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-blue-50"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full
                              border border-[#1e6cff]/25 bg-[#1e6cff]/8 shrink-0">
                <cat.Icon className="h-3 w-3 text-[#1e6cff]" />
              </div>
              {cat.nombre}
            </Link>
          ))}
        </aside>

        <div>
          {filtrados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center">
              <p className="text-2xl">🔍</p>
              <h3 className="mt-3 text-lg font-semibold">
                No encontramos productos para tu búsqueda
              </h3>
              <p className="mt-2 text-zinc-600">
                Pero podemos conseguírtelos. Cuéntanos qué buscas.
              </p>
              <Link
                href="/conseguir"
                className="mt-6 inline-flex rounded-full bg-[#1e6cff] px-6 py-2.5 text-sm font-semibold text-white"
              >
                Te lo conseguimos →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtrados.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
