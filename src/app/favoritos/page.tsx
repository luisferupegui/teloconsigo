"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { useWishlist } from "@/lib/wishlist";
import type { Product } from "@/lib/products-types";
import { ProductCard } from "@/components/product-card";

export default function FavoritosPage() {
  const { ids, clear, count } = useWishlist();
  const [all, setAll] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setAll)
      .catch(() => {});
  }, []);

  const products = ids
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="text-xs text-zinc-500 mb-3">
        <Link href="/" className="hover:underline">
          Inicio
        </Link>
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
                {count} producto{count !== 1 && "s"} guardado
                {count !== 1 && "s"}
              </p>
            </div>
            <button
              onClick={clear}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" /> Limpiar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
