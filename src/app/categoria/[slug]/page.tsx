import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryFilters } from "@/components/category-filters";
import { categories } from "@/lib/categories";
import { getProductsByCategory } from "@/lib/products";

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
    title: cat.nombre,
    description: cat.descripcion,
  };
}

export default async function CategoriaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();

  const prods = getProductsByCategory(slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="text-xs text-zinc-500 mb-3">
        <Link href="/" className="hover:underline">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <Link href="/catalogo" className="hover:underline">
          Catálogo
        </Link>
        <span className="mx-2">/</span>
        <span>{cat.nombre}</span>
      </nav>

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl
                        border border-[#1e6cff]/25 bg-[#1e6cff]/8 shrink-0">
          <cat.Icon className="h-10 w-10 text-[#1e6cff]" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-900">
            {cat.nombre}
          </h1>
          <p className="text-zinc-600">{cat.descripcion}</p>
        </div>
      </div>

      <div className="mt-8">
        {prods.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center">
            <p className="text-2xl">📦</p>
            <h3 className="mt-3 text-lg font-semibold">
              Aún no tenemos productos en esta categoría
            </h3>
            <p className="mt-2 text-zinc-600">
              Pero podemos conseguirte cualquier {cat.nombre.toLowerCase()}.
            </p>
            <Link
              href="/conseguir"
              className="mt-6 inline-flex rounded-full bg-[#1e6cff] px-6 py-2.5 text-sm font-semibold text-white"
            >
              Te lo conseguimos →
            </Link>
          </div>
        ) : (
          <CategoryFilters products={prods} />
        )}
      </div>
    </div>
  );
}
