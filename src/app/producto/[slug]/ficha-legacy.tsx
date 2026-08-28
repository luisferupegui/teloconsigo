import Link from "next/link";
import { getAllProducts, formatCOP } from "@/lib/products";
import { loadCategories } from "@/lib/categories";
import { ProductCard } from "@/components/product-card";
import { SmartImage } from "@/components/smart-image";
import { AddToCartButton } from "@/components/add-to-cart";
import type { Product } from "@/lib/products-types";

// ─── Ficha del catálogo LEGACY (data/products.json) ──────────────────────────
//
// Son los dos productos de demostración que quedaron del prototipo. Se conserva
// esta vista para que no se rompan los enlaces del carrito, favoritos y la
// comparación, pero la página va marcada `noindex` (ver page.tsx): sus datos son
// inventados —incluidas las estrellas y el número de reseñas— y publicarlos en
// Google como si fueran reales es justo lo que se sanciona con acción manual.
//
// Por eso tampoco lleva JSON-LD: no hay nada que declarar que sea cierto.

export function FichaLegacy({ p }: { p: Product }) {
  const cat = loadCategories().find((c) => c.slug === p.categoria);
  const related = getAllProducts()
    .filter((r) => r.categoria === p.categoria && r.id !== p.id)
    .slice(0, 4);

  const descuento =
    p.precioAnterior && p.precioAnterior > p.precio
      ? Math.round(((p.precioAnterior - p.precio) / p.precioAnterior) * 100)
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:underline">Inicio</Link>
        <span className="mx-2">/</span>
        {cat && (
          <>
            <Link href={`/categoria/${cat.slug}`} className="hover:underline">{cat.nombre}</Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span>{p.nombre}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <SmartImage
          src={p.imagen}
          alt={p.nombre}
          className="aspect-square rounded-3xl bg-gradient-to-br from-zinc-50 to-zinc-100"
          emojiSize="text-[180px]"
        />

        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{p.marca}</p>
          <h1 className="mt-1 text-3xl font-bold text-zinc-900">{p.nombre}</h1>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-emerald-600">
              {p.stock > 0 ? `✓ ${p.stock} disponibles` : "Agotado"}
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
            {descuento && (
              <span className="rounded-full bg-[#1e6cff] px-2 py-1 text-xs font-bold text-white">
                -{descuento}% OFF
              </span>
            )}
            {p.precioAnterior && (
              <p className="mt-2 text-sm text-zinc-400 line-through">{formatCOP(p.precioAnterior)}</p>
            )}
            <p className="text-4xl font-bold text-zinc-900">{formatCOP(p.precio)}</p>
            <p className="mt-1 text-xs text-zinc-500">o paga en cuotas con tu tarjeta</p>
            <div className="mt-5 space-y-2">
              <AddToCartButton product={p} showQuantity />
            </div>
            <Link
              href="/asesor"
              className="mt-3 flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              🤖 Pregúntale al Asesor IA sobre este producto
            </Link>
          </div>

          <p className="mt-6 text-zinc-700">{p.descripcion}</p>

          <div className="mt-6">
            <h2 className="text-lg font-bold text-zinc-900">Especificaciones</h2>
            <dl className="mt-3 divide-y divide-zinc-200 rounded-xl border border-zinc-200">
              {Object.entries(p.specs).map(([key, value]) => (
                <div key={key} className="grid grid-cols-[140px_1fr] gap-4 px-4 py-2.5 text-sm">
                  <dt className="font-semibold capitalize text-zinc-600">{key.replace(/([A-Z])/g, " $1")}</dt>
                  <dd className="text-zinc-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-xl border border-zinc-200 p-3">
              <p className="text-xl">🚚</p>
              <p className="mt-1 font-semibold">Envío nacional</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-3">
              <p className="text-xl">🛡️</p>
              <p className="mt-1 font-semibold">Garantía oficial</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-3">
              <p className="text-xl">💳</p>
              <p className="mt-1 font-semibold">Paga seguro</p>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold text-zinc-900">También te puede interesar</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
