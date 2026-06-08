"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { ProductQuickView, type QuickViewProduct } from "./product-quick-view";
import { useWishlist } from "@/lib/wishlist";
import { formatCOP } from "@/lib/products-types";

/**
 * Grid de resultados de búsqueda en /tienda?q=...
 * Es un Client Component para poder abrir ProductQuickView sin navegar a /producto/[slug].
 */
export function TiendaSearchResults({
  products,
  query,
}: {
  products: QuickViewProduct[];
  query: string;
}) {
  const [quickView, setQuickView] = useState<QuickViewProduct | null>(null);
  const { has, toggle } = useWishlist();

  /* ── Sin resultados ────────────────────────────────────────────────────────── */
  if (products.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <h2 className="text-xl font-bold text-zinc-900">Sin resultados</h2>
        <p className="text-sm text-zinc-500 mt-2 mb-6">
          No encontramos productos para &quot;{query}&quot;, pero podemos conseguírtelo.
        </p>
        <Link
          href={`/conseguir?q=${encodeURIComponent(query)}`}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1e6cff] px-6 py-3 text-sm font-bold text-white hover:bg-[#1858d6]"
        >
          ✨ Te lo conseguimos
        </Link>
      </div>
    );
  }

  /* ── Grid de productos ─────────────────────────────────────────────────────── */
  return (
    <>
      <ProductQuickView product={quickView} onClose={() => setQuickView(null)} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => {
          const productKey = p.referencia || p.id;
          const isFavorite  = has(productKey);
          return (
            /* Wrapper relativo para poder posicionar el corazón sin anidar <button> en <button> */
            <div key={productKey} className="relative group">

              {/* ── Tarjeta (abre QuickView) ── */}
              <button
                type="button"
                onClick={() => setQuickView(p)}
                className="group/card rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm
                           hover:shadow-md hover:border-[#1e6cff]/30 transition-all text-left w-full"
              >
                <div className="relative h-40 w-full mb-3 rounded-xl bg-zinc-50 overflow-hidden">
                  {p.imagen ? (
                    <Image
                      src={p.imagen}
                      alt={p.nombre}
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl">📦</div>
                  )}
                </div>

                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {p.marca}
                </p>
                <p className="mt-0.5 font-semibold text-zinc-900 text-sm leading-tight line-clamp-2
                              group-hover/card:text-[#1e6cff] transition">
                  {p.nombre}
                </p>
                {p.precio > 0 && (
                  <p className="mt-2 font-display font-bold text-[#1e6cff]">
                    Desde {formatCOP(p.precio)}
                  </p>
                )}
              </button>

              {/* ── Botón favoritos (fuera del <button> de la tarjeta) ── */}
              <button
                type="button"
                onClick={() => toggle(productKey)}
                aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center
                           rounded-full bg-white shadow-sm border border-zinc-100
                           transition-colors hover:bg-zinc-50 z-10"
              >
                <Heart
                  className={`h-3.5 w-3.5 transition-colors ${
                    isFavorite ? "fill-rose-500 text-rose-500" : "text-zinc-400"
                  }`}
                  strokeWidth={1.5}
                />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
