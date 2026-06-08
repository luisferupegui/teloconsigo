"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, X, ArrowRight, TrendingUp } from "lucide-react";
import { formatCOP } from "@/lib/products-types";
import { SmartImage } from "./smart-image";
import type { QuickViewProduct } from "./product-quick-view";

export function SearchModal({
  open,
  onClose,
  products,
  onSelectProduct,
}: {
  open: boolean;
  onClose: () => void;
  products: QuickViewProduct[];
  onSelectProduct?: (p: QuickViewProduct) => void;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQ("");
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const term = q.toLowerCase().trim();

  // Solo catálogo publicado (los productos del PDF se ven al publicarlos).
  const catalogResults = term
    ? products
        .filter((p) => `${p.nombre} ${p.marca} ${p.categoria}`.toLowerCase().includes(term))
        .slice(0, 8)
    : [];

  const hasResults = catalogResults.length > 0;
  const trending = ["RTX 4070", "Ryzen 7", "DDR5 32GB", "SSD NVMe", "Monitor QHD"];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-zinc-900/60 backdrop-blur p-4 pt-20 animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-4">
          <Search className="h-5 w-5 text-zinc-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar productos, marcas, categorías…"
            className="flex-1 bg-transparent text-base focus:outline-none placeholder-zinc-400"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-zinc-400 hover:text-zinc-700">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex rounded border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
            ESC
          </kbd>
        </div>

        <div className="max-h-[65vh] overflow-y-auto">
          {/* Tendencias */}
          {!term && (
            <div className="p-5">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <TrendingUp className="h-3.5 w-3.5" /> Tendencias
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {trending.map((t) => (
                  <button
                    key={t}
                    onClick={() => setQ(t)}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm hover:border-[#1e6cff] hover:bg-blue-50 hover:text-[#1e6cff] transition"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sin resultados */}
          {term && !hasResults && (
            <div className="p-10 text-center">
              <p className="text-3xl">🔍</p>
              <p className="mt-3 font-display text-lg font-bold text-zinc-900">
                Sin resultados para &quot;{q}&quot;
              </p>
              <p className="mt-1 text-sm text-zinc-600">Pero podemos conseguírtelo.</p>
              <Link
                href="/conseguir"
                onClick={onClose}
                className="mt-4 inline-flex rounded-full bg-[#1e6cff] px-5 py-2 text-sm font-bold text-white hover:bg-[#1858d6]"
              >
                ✨ Te lo conseguimos
              </Link>
            </div>
          )}

          {/* Resultados del catálogo */}
          {catalogResults.length > 0 && (
            <div>
              <p className="px-5 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Catálogo
              </p>
              <ul className="divide-y divide-zinc-100">
                {catalogResults.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => { onClose(); onSelectProduct?.(p); }}
                      className="flex w-full items-center gap-4 px-5 py-3 hover:bg-blue-50 text-left transition"
                    >
                      <SmartImage
                        src={p.imagen}
                        alt={p.nombre}
                        className="h-12 w-12 shrink-0 rounded bg-zinc-50"
                        emojiSize="text-2xl"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                          {p.marca}
                        </p>
                        <p className="truncate font-semibold text-zinc-900">{p.nombre}</p>
                      </div>
                      <p className="font-display font-bold text-[#1e6cff]">{formatCOP(p.precio)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ver todos */}
          {hasResults && term && (
            <Link
              href={`/tienda?q=${encodeURIComponent(q)}`}
              onClick={onClose}
              className="flex items-center justify-between bg-zinc-50 px-5 py-3 text-sm font-semibold text-[#1e6cff] hover:bg-blue-50"
            >
              Ver todos los resultados para &quot;{q}&quot;
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
