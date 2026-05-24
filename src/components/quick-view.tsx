"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, Star, Check } from "lucide-react";
import { SmartImage } from "./smart-image";
import { AddToCartButton } from "./add-to-cart";
import { formatCOP, type Product } from "@/lib/products-types";

export function QuickView({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (product) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [product]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (product) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, onClose]);

  if (!product) return null;

  const descuento =
    product.precioAnterior && product.precioAnterior > product.precio
      ? Math.round(
          ((product.precioAnterior - product.precio) / product.precioAnterior) *
            100,
        )
      : null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-900/70 backdrop-blur p-4 animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white border border-zinc-200 hover:bg-zinc-100"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid md:grid-cols-2">
          <div className="relative bg-gradient-to-br from-zinc-50 to-zinc-100">
            {descuento && (
              <span className="absolute left-4 top-4 z-10 rounded-md bg-orange-500 px-2 py-1 text-xs font-bold text-white">
                -{descuento}%
              </span>
            )}
            <SmartImage
              src={product.imagen}
              alt={product.nombre}
              className="aspect-square w-full"
              emojiSize="text-[140px]"
            />
          </div>

          <div className="flex flex-col p-6 max-h-[80vh] overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              {product.marca}
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-zinc-900">
              {product.nombre}
            </h2>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="flex items-center gap-0.5 text-amber-500">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-semibold">{product.rating}</span>
              </span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-500">{product.reviews} reseñas</span>
              {product.stock > 0 && (
                <>
                  <span className="text-zinc-400">·</span>
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <Check className="h-3.5 w-3.5" /> En stock
                  </span>
                </>
              )}
            </div>

            <div className="mt-4">
              {product.precioAnterior && (
                <p className="text-sm text-zinc-400 line-through">
                  {formatCOP(product.precioAnterior)}
                </p>
              )}
              <p className="font-display text-3xl font-bold text-[#1e6cff]">
                {formatCOP(product.precio)}
              </p>
            </div>

            <p className="mt-4 text-sm text-zinc-700">{product.descripcion}</p>

            <div className="mt-4 rounded-xl border border-zinc-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Specs principales
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {Object.entries(product.specs)
                  .slice(0, 6)
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <dt className="text-zinc-500 capitalize">{k}</dt>
                      <dd className="font-semibold text-zinc-900 text-right truncate">
                        {v}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>

            <div className="mt-5 space-y-2">
              <AddToCartButton product={product} showQuantity />
              <Link
                href={`/producto/${product.slug}`}
                onClick={onClose}
                className="block w-full rounded-full border border-zinc-300 px-6 py-3 text-center text-sm font-semibold hover:border-[#1e6cff] hover:text-[#1e6cff] transition"
              >
                Ver ficha completa →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
