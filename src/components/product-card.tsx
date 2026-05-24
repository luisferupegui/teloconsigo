"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, GitCompare, Eye, Star } from "lucide-react";
import { Product, formatCOP } from "@/lib/products-types";
import { SmartImage } from "./smart-image";
import { AddToCartButton } from "./add-to-cart";
import { useWishlist } from "@/lib/wishlist";
import { useCompare } from "@/lib/compare";
import { useToast } from "./toast";
import { QuickView } from "./quick-view";

export function ProductCard({ product }: { product: Product }) {
  const { has: hasW, toggle: toggleW } = useWishlist();
  const { has: hasC, toggle: toggleC, count: compareCount, MAX } = useCompare();
  const { toast } = useToast();
  const [quickOpen, setQuickOpen] = useState(false);

  const isWishlisted = hasW(product.id);
  const isCompared = hasC(product.id);

  const descuento =
    product.precioAnterior && product.precioAnterior > product.precio
      ? Math.round(
          ((product.precioAnterior - product.precio) / product.precioAnterior) *
            100,
        )
      : null;

  const onWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleW(product.id);
    toast({
      type: "success",
      title: isWishlisted ? "Removido de favoritos" : "Agregado a favoritos ❤️",
      description: product.nombre,
    });
  };

  const onCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isCompared && compareCount >= MAX) {
      toast({
        type: "error",
        title: `Máximo ${MAX} productos`,
        description: "Quita uno del comparador antes de agregar otro.",
      });
      return;
    }
    toggleC(product.id);
    toast({
      type: "success",
      title: isCompared ? "Removido del comparador" : "Agregado al comparador",
      description: product.nombre,
    });
  };

  const onQuick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickOpen(true);
  };

  return (
    <>
      <Link
        href={`/producto/${product.slug}`}
        className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all duration-300 hover:shadow-2xl hover:shadow-[#1e6cff]/15 hover:-translate-y-1 hover:border-[#1e6cff]/50"
      >
        {descuento && (
          <span className="absolute left-3 top-3 z-10 rounded-md bg-orange-500 px-2 py-1 text-xs font-bold text-white shadow-lg shadow-orange-500/30">
            -{descuento}%
          </span>
        )}

        {/* Floating action icons (right) */}
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5">
          <button
            onClick={onWishlist}
            aria-label="Favorito"
            className={`flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm transition hover:scale-110 ${
              isWishlisted
                ? "border-red-500 text-red-500"
                : "border-zinc-200 text-zinc-400 hover:border-red-500 hover:text-red-500"
            }`}
          >
            <Heart
              className="h-4 w-4"
              fill={isWishlisted ? "currentColor" : "none"}
            />
          </button>
          <button
            onClick={onCompare}
            aria-label="Comparar"
            className={`flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm transition opacity-0 group-hover:opacity-100 hover:scale-110 ${
              isCompared
                ? "border-[#1e6cff] text-[#1e6cff]"
                : "border-zinc-200 text-zinc-400 hover:border-[#1e6cff] hover:text-[#1e6cff]"
            }`}
          >
            <GitCompare className="h-4 w-4" />
          </button>
          <button
            onClick={onQuick}
            aria-label="Vista rápida"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 shadow-sm transition opacity-0 group-hover:opacity-100 hover:scale-110 hover:border-[#1e6cff] hover:text-[#1e6cff]"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>

        <div className="relative overflow-hidden">
          <div className="transition-transform duration-500 ease-out group-hover:scale-110">
            <SmartImage
              src={product.imagen}
              alt={product.nombre}
              className="h-48 w-full bg-gradient-to-br from-zinc-50 to-zinc-100"
            />
          </div>
          <div className="absolute right-3 bottom-3 translate-y-12 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <AddToCartButton product={product} variant="icon" />
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
            {product.marca}
          </p>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-900 group-hover:text-[#1e6cff] min-h-[40px]">
            {product.nombre}
          </h3>
          <div className="mt-auto pt-3">
            {product.precioAnterior && (
              <p className="text-xs text-zinc-400 line-through">
                {formatCOP(product.precioAnterior)}
              </p>
            )}
            <p className="font-display text-xl font-bold text-[#1e6cff]">
              {formatCOP(product.precio)}
            </p>
            <div className="mt-1 flex items-center gap-1 text-xs">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              <span className="font-semibold text-zinc-700">
                {product.rating}
              </span>
              <span className="text-zinc-400">({product.reviews})</span>
              <span className="ml-auto text-emerald-600 font-semibold">
                {product.stock > 0 ? "En stock" : "Agotado"}
              </span>
            </div>
          </div>
        </div>
      </Link>

      <QuickView
        product={quickOpen ? product : null}
        onClose={() => setQuickOpen(false)}
      />
    </>
  );
}
