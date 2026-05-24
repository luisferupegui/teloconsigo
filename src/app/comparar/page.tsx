"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ShoppingCart, Trash2, GitCompare } from "lucide-react";
import { useCompare } from "@/lib/compare";
import { useCart } from "@/lib/cart";
import { useToast } from "@/components/toast";
import { formatCOP, type Product } from "@/lib/products-types";
import { SmartImage } from "@/components/smart-image";

export default function CompararPage() {
  const { ids, remove, clear } = useCompare();
  const { addItem } = useCart();
  const { toast } = useToast();
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

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 text-center">
        <GitCompare
          className="mx-auto h-16 w-16 text-zinc-300"
          strokeWidth={1.5}
        />
        <h1 className="mt-4 font-display text-2xl font-bold text-zinc-900">
          No tienes productos para comparar
        </h1>
        <p className="mt-2 text-zinc-600">
          Marca el ⇄ en los productos que te interesan para compararlos.
        </p>
        <Link
          href="/catalogo"
          className="mt-6 inline-flex rounded-full bg-[#1e6cff] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1858d6]"
        >
          Explorar catálogo
        </Link>
      </div>
    );
  }

  const allSpecKeys = Array.from(
    new Set(products.flatMap((p) => Object.keys(p.specs))),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="text-xs text-zinc-500 mb-3">
        <Link href="/" className="hover:underline">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <span>Comparar</span>
      </nav>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-900">
            Comparar productos
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {products.length} productos lado a lado
          </p>
        </div>
        <button
          onClick={clear}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" /> Limpiar
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="sticky left-0 bg-zinc-50 px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-500 min-w-[140px]">
                Producto
              </th>
              {products.map((p) => (
                <th
                  key={p.id}
                  className="border-l border-zinc-100 p-4 min-w-[220px]"
                >
                  <div className="relative">
                    <button
                      onClick={() => remove(p.id)}
                      className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 shadow"
                      aria-label="Quitar"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <Link href={`/producto/${p.slug}`}>
                      <SmartImage
                        src={p.imagen}
                        alt={p.nombre}
                        className="mx-auto h-32 w-32 rounded-lg bg-zinc-50"
                        emojiSize="text-5xl"
                      />
                    </Link>
                    <p className="mt-3 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                      {p.marca}
                    </p>
                    <Link
                      href={`/producto/${p.slug}`}
                      className="block mt-1 text-sm font-semibold text-zinc-900 hover:text-[#1e6cff] line-clamp-2"
                    >
                      {p.nombre}
                    </Link>
                    <p className="mt-2 font-display text-lg font-bold text-[#1e6cff]">
                      {formatCOP(p.precio)}
                    </p>
                    <button
                      onClick={() => {
                        addItem(p);
                        toast({
                          type: "success",
                          title: "Agregado al carrito",
                          description: p.nombre,
                        });
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#1e6cff] px-4 py-2 text-xs font-bold text-white hover:bg-[#1858d6]"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" /> Agregar
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <td className="sticky left-0 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700">
                Valoración
              </td>
              {products.map((p) => (
                <td
                  key={p.id}
                  className="border-l border-zinc-100 px-4 py-3 text-center text-sm"
                >
                  <span className="text-amber-500">★</span>{" "}
                  <span className="font-semibold">{p.rating}</span>{" "}
                  <span className="text-zinc-500 text-xs">({p.reviews})</span>
                </td>
              ))}
            </tr>
            <tr className="border-b border-zinc-100">
              <td className="sticky left-0 bg-white px-4 py-3 text-sm font-semibold text-zinc-700">
                Stock
              </td>
              {products.map((p) => (
                <td
                  key={p.id}
                  className="border-l border-zinc-100 px-4 py-3 text-center text-sm"
                >
                  <span
                    className={
                      p.stock > 0
                        ? "text-emerald-600 font-semibold"
                        : "text-red-600 font-semibold"
                    }
                  >
                    {p.stock > 0 ? `${p.stock} disponibles` : "Agotado"}
                  </span>
                </td>
              ))}
            </tr>

            <tr className="border-b border-zinc-200 bg-zinc-100">
              <td
                colSpan={products.length + 1}
                className="sticky left-0 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-600"
              >
                Especificaciones
              </td>
            </tr>
            {allSpecKeys.map((key, i) => (
              <tr
                key={key}
                className={
                  i % 2 === 0
                    ? "border-b border-zinc-100 bg-zinc-50/50"
                    : "border-b border-zinc-100"
                }
              >
                <td
                  className={`sticky left-0 px-4 py-3 text-sm font-semibold text-zinc-700 capitalize ${
                    i % 2 === 0 ? "bg-zinc-50" : "bg-white"
                  }`}
                >
                  {key.replace(/([A-Z])/g, " $1")}
                </td>
                {products.map((p) => (
                  <td
                    key={p.id}
                    className="border-l border-zinc-100 px-4 py-3 text-center text-sm text-zinc-900"
                  >
                    {p.specs[key] ?? (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
