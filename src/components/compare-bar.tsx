"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, GitCompare, ArrowRight } from "lucide-react";
import { useCompare } from "@/lib/compare";
import type { Product } from "@/lib/products-types";
import { SmartImage } from "./smart-image";

export function CompareBar() {
  const { ids, remove, clear, count, MAX } = useCompare();
  const [all, setAll] = useState<Product[]>([]);

  useEffect(() => {
    if (count > 0 && all.length === 0) {
      fetch("/api/products")
        .then((r) => r.json())
        .then(setAll)
        .catch(() => {});
    }
  }, [count, all.length]);

  if (count === 0) return null;

  const products = ids
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95vw] max-w-2xl rounded-2xl bg-white shadow-2xl border border-zinc-200 animate-slide-in-right">
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
        <GitCompare className="h-4 w-4 text-[#1e6cff]" />
        <p className="font-display text-sm font-bold">
          Comparador ({count}/{MAX})
        </p>
        <button
          onClick={clear}
          className="ml-auto text-xs text-zinc-500 hover:text-red-600"
        >
          Limpiar
        </button>
      </div>
      <div className="flex items-center gap-3 p-3">
        <div className="flex flex-1 gap-2 overflow-x-auto">
          {products.map((p) => (
            <div key={p.id} className="relative shrink-0 group">
              <SmartImage
                src={p.imagen}
                alt={p.nombre}
                className="h-14 w-14 rounded border border-zinc-200 bg-zinc-50"
                emojiSize="text-2xl"
              />
              <button
                onClick={() => remove(p.id)}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow opacity-0 group-hover:opacity-100 transition"
              >
                <X className="h-3 w-3" />
              </button>
              <p className="mt-1 w-14 text-center text-[9px] truncate text-zinc-600">
                {p.marca}
              </p>
            </div>
          ))}
          {Array.from({ length: MAX - count }).map((_, i) => (
            <div
              key={i}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-dashed border-zinc-300 text-zinc-300 text-xl"
            >
              +
            </div>
          ))}
        </div>
        <Link
          href="/comparar"
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow transition ${
            count >= 2
              ? "bg-[#1e6cff] text-white hover:bg-[#1858d6]"
              : "bg-zinc-200 text-zinc-400 cursor-not-allowed pointer-events-none"
          }`}
        >
          Comparar <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
