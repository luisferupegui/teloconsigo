"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { useWishlist } from "@/lib/wishlist";
import type { Product, BusinessProduct } from "@/lib/products-types";
import { ProductCard } from "@/components/product-card";
import { BusinessFeaturedCard } from "@/components/business-featured-card";

export default function FavoritosPage() {
  const { ids, clear, count } = useWishlist();
  const [regular, setRegular] = useState<Product[]>([]);
  const [business, setBusiness] = useState<(BusinessProduct & { imageUrl: string | null })[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setRegular)
      .catch(() => {});

    fetch("/api/business-products")
      .then((r) => r.json())
      .then(setBusiness)
      .catch(() => {});
  }, []);

  const favoriteRegular = ids
    .map((id) => regular.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  type BizWithImg = BusinessProduct & { imageUrl: string | null };
  const favoriteBusiness = ids
    .map((id) => business.find((p) => (p.referencia ?? p.slug ?? p.nombre) === id))
    .filter((p): p is BizWithImg => Boolean(p));

  const total = favoriteRegular.length + favoriteBusiness.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="text-xs text-zinc-500 mb-3">
        <Link href="/" className="hover:underline">Inicio</Link>
        <span className="mx-2">/</span>
        <span>Favoritos</span>
      </nav>

      {count === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Heart className="mx-auto h-16 w-16 text-zinc-300" strokeWidth={1.5} />
          <h1 className="mt-4 font-display text-2xl font-bold text-zinc-900">
            Aún no tienes favoritos
          </h1>
          <p className="mt-2 text-zinc-600">
            Marca el ❤️ en cualquier producto para guardarlo aquí.
          </p>
          <Link
            href="/catalogo"
            className="mt-6 inline-flex rounded-full bg-[#1e6cff] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1858d6]"
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h1 className="font-display text-3xl font-bold text-zinc-900">
                Mis favoritos ❤️
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                {total} producto{total !== 1 && "s"} guardado{total !== 1 && "s"}
              </p>
            </div>
            <button
              onClick={clear}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" /> Limpiar
            </button>
          </div>

          {favoriteBusiness.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              {favoriteBusiness.map((p) => (
                <BusinessFeaturedCard key={p.referencia ?? p.nombre} product={p} imageUrl={p.imageUrl} />
              ))}
            </div>
          )}

          {favoriteRegular.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {favoriteRegular.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
