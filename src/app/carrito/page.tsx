"use client";

import Link from "next/link";
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, ShieldCheck, Truck, CreditCard } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatCOP } from "@/lib/products-types";
import { SmartImage } from "@/components/smart-image";

export default function CarritoPage() {
  const { items, total, count, removeItem, updateQuantity, clear } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <ShoppingCart className="mx-auto h-16 w-16 text-zinc-300" strokeWidth={1.5} />
          <h1 className="mt-4 font-display text-2xl font-bold text-zinc-900">
            Tu carrito está vacío
          </h1>
          <p className="mt-2 text-zinc-600">
            Explora el catálogo o arma tu PC ideal con el armador guiado.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/catalogo"
              className="rounded-full bg-[#1e6cff] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1858d6]"
            >
              Explorar catálogo
            </Link>
            <Link
              href="/armador"
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold hover:border-[#1e6cff]"
            >
              🛠️ Armar mi PC
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const envio = total > 500000 ? 0 : 25000;
  const totalFinal = total + envio;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="text-xs text-zinc-500 mb-3">
        <Link href="/" className="hover:underline">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <span>Carrito</span>
      </nav>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-900">
            Tu carrito
          </h1>
          <p className="mt-1 text-zinc-600">
            {count} {count === 1 ? "producto" : "productos"}
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm("¿Vaciar todo el carrito?")) clear();
          }}
          className="text-sm text-zinc-500 hover:text-red-600"
        >
          Vaciar carrito
        </button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 hover:shadow-md transition"
            >
              <Link
                href={`/producto/${item.slug}`}
                className="shrink-0"
              >
                <SmartImage
                  src={item.imagen}
                  alt={item.nombre}
                  className="h-24 w-24 rounded-lg bg-zinc-50"
                  emojiSize="text-4xl"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                  {item.marca}
                </p>
                <Link
                  href={`/producto/${item.slug}`}
                  className="font-semibold text-zinc-900 hover:text-[#1e6cff] line-clamp-2"
                >
                  {item.nombre}
                </Link>
                <p className="mt-1 font-display text-lg font-bold text-[#1e6cff]">
                  {formatCOP(item.precio)}
                </p>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-zinc-400 hover:text-red-600"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <div className="flex items-center rounded-full border border-zinc-300">
                  <button
                    onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                    className="flex h-8 w-8 items-center justify-center hover:bg-zinc-100 rounded-l-full"
                    aria-label="Restar"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">
                    {item.cantidad}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                    className="flex h-8 w-8 items-center justify-center hover:bg-zinc-100 rounded-r-full"
                    aria-label="Sumar"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-sm font-bold">
                  {formatCOP(item.precio * item.cantidad)}
                </p>
              </div>
            </div>
          ))}

          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1e6cff] hover:underline"
          >
            ← Seguir comprando
          </Link>
        </div>

        {/* Resumen */}
        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-bold text-zinc-900">
              Resumen del pedido
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-600">Subtotal</dt>
                <dd className="font-semibold">{formatCOP(total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600">Envío</dt>
                <dd
                  className={
                    envio === 0
                      ? "font-semibold text-emerald-600"
                      : "font-semibold"
                  }
                >
                  {envio === 0 ? "GRATIS 🎉" : formatCOP(envio)}
                </dd>
              </div>
              {envio > 0 && (
                <p className="text-xs text-zinc-500">
                  Agrega {formatCOP(500000 - total)} más para envío gratis.
                </p>
              )}
            </dl>
            <div className="mt-4 flex justify-between border-t border-zinc-200 pt-4">
              <span className="font-bold">Total</span>
              <span className="font-display text-2xl font-bold text-[#1e6cff]">
                {formatCOP(totalFinal)}
              </span>
            </div>

            <button
              onClick={() => alert("🚧 Checkout pendiente — próxima fase con ePayco")}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#1e6cff] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#1e6cff]/30 hover:bg-[#1858d6]"
            >
              Ir a pagar <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-3 text-center text-xs text-zinc-500">
              💳 Visa · Mastercard · PSE · ePayco
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm">
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Truck className="mt-0.5 h-4 w-4 text-[#1e6cff] shrink-0" />
                <span className="text-zinc-700">
                  Envío gratis en pedidos superiores a $500.000
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-[#1e6cff] shrink-0" />
                <span className="text-zinc-700">
                  Garantía oficial del fabricante
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CreditCard className="mt-0.5 h-4 w-4 text-[#1e6cff] shrink-0" />
                <span className="text-zinc-700">
                  Paga seguro con ePayco · cuotas disponibles
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
