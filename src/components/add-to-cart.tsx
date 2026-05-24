"use client";

import { useState } from "react";
import { ShoppingCart, Check, Plus, Minus } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useToast } from "@/components/toast";
import type { Product } from "@/lib/products-types";

export function AddToCartButton({
  product,
  variant = "primary",
  showQuantity = false,
}: {
  product: Product;
  variant?: "primary" | "icon" | "outline";
  showQuantity?: boolean;
}) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);

  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, qty);
    setAdded(true);
    toast({
      type: "success",
      title: "Agregado al carrito",
      description: `${qty > 1 ? `${qty} × ` : ""}${product.nombre}`,
    });
    setTimeout(() => setAdded(false), 1500);
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handle}
        aria-label="Agregar al carrito"
        className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
          added
            ? "bg-emerald-500 text-white"
            : "bg-[#1e6cff] text-white hover:bg-[#1858d6]"
        }`}
      >
        {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
    );
  }

  if (variant === "outline") {
    return (
      <button
        onClick={handle}
        className={`flex w-full items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-bold transition ${
          added
            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
            : "border-zinc-300 bg-white text-zinc-900 hover:border-[#1e6cff] hover:text-[#1e6cff]"
        }`}
      >
        {added ? (
          <>
            <Check className="h-4 w-4" /> Agregado
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" /> Agregar al carrito
          </>
        )}
      </button>
    );
  }

  return (
    <div className="flex w-full gap-2">
      {showQuantity && (
        <div className="flex items-center rounded-full border border-zinc-300 bg-white">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-12 w-10 items-center justify-center hover:bg-zinc-100 rounded-l-full"
            aria-label="Restar"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center font-semibold">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="flex h-12 w-10 items-center justify-center hover:bg-zinc-100 rounded-r-full"
            aria-label="Sumar"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      <button
        onClick={handle}
        className={`flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-lg transition ${
          added
            ? "bg-emerald-500 shadow-emerald-500/30"
            : "bg-[#1e6cff] hover:bg-[#1858d6] shadow-[#1e6cff]/30"
        }`}
      >
        {added ? (
          <>
            <Check className="h-5 w-5" /> ¡Agregado!
          </>
        ) : (
          <>
            <ShoppingCart className="h-5 w-5" /> Agregar al carrito
          </>
        )}
      </button>
    </div>
  );
}
