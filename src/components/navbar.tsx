"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Search,
  ShoppingCart,
  UserRound,
  Menu,
  ChevronDown,
  LayoutGrid,
  Heart,
} from "lucide-react";
import { categories } from "@/lib/categories";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useEffect, useRef } from "react";
import { PromoBanner } from "./promo-banner";
import { SearchModal } from "./search-modal";
import type { Product } from "@/lib/products-types";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const { count: cartCount } = useCart();
  const { count: wishCount } = useWishlist();
  const badgeRef = useRef<HTMLSpanElement>(null);
  const prev = useRef(cartCount);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => {});
  }, []);

  // Cmd/Ctrl + K abre búsqueda
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (cartCount !== prev.current && badgeRef.current) {
      badgeRef.current.classList.remove("animate-bounce-once");
      void badgeRef.current.offsetWidth;
      badgeRef.current.classList.add("animate-bounce-once");
      prev.current = cartCount;
    }
  }, [cartCount]);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Banner promocional rotativo */}
      <PromoBanner />

      {/* Search modal */}
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={products}
      />

      {/* Main bar — logo grande */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-32 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center shrink-0 group">
            <Image
              src="/Logo%20Claro%20Con%20Slogan.png"
              alt="Te lo Consigo"
              width={1200}
              height={450}
              quality={100}
              className="h-28 w-auto transition group-hover:scale-105"
              priority
              unoptimized
            />
          </Link>

          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex flex-1 max-w-2xl items-center gap-3 rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-zinc-500 hover:border-[#1e6cff] hover:shadow-md transition group"
            aria-label="Buscar"
          >
            <Search className="h-5 w-5 text-zinc-400 group-hover:text-[#1e6cff] transition" />
            <span className="flex-1 text-left">Buscar productos, marcas, categorías…</span>
            <kbd className="hidden lg:inline-flex items-center gap-1 rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-3 sm:gap-5">
            {/* Mi cuenta */}
            <Link
              href="/cuenta"
              className="group hidden sm:flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-blue-50 transition"
            >
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-[#1e6cff]/0 group-hover:bg-[#1e6cff]/10 blur transition" />
                <UserRound
                  className="relative h-7 w-7 text-zinc-700 group-hover:text-[#1e6cff] transition"
                  strokeWidth={1.75}
                />
              </div>
              <div className="hidden md:flex flex-col leading-tight">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Iniciar sesión
                </span>
                <span className="text-sm font-semibold text-zinc-900 group-hover:text-[#1e6cff]">
                  Mi cuenta
                </span>
              </div>
            </Link>

            <span className="hidden sm:block h-8 w-px bg-zinc-200" />

            {/* Favoritos */}
            <Link
              href="/favoritos"
              className="group relative flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-red-50 transition"
              aria-label={`Favoritos (${wishCount})`}
            >
              <div className="relative">
                <Heart
                  className={`relative h-7 w-7 transition ${
                    wishCount > 0
                      ? "text-red-500 fill-red-500"
                      : "text-zinc-700 group-hover:text-red-500"
                  }`}
                  strokeWidth={1.75}
                />
                {wishCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                    {wishCount}
                  </span>
                )}
              </div>
            </Link>

            <span className="hidden sm:block h-8 w-px bg-zinc-200" />

            {/* Carrito */}
            <Link
              href="/carrito"
              className="group relative flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-blue-50 transition"
              aria-label={`Carrito (${cartCount} items)`}
            >
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-[#1e6cff]/0 group-hover:bg-[#1e6cff]/10 blur transition" />
                <ShoppingCart
                  className="relative h-7 w-7 text-zinc-700 group-hover:text-[#1e6cff] transition"
                  strokeWidth={1.75}
                />
                <span
                  ref={badgeRef}
                  className={`absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-white ${
                    cartCount > 0
                      ? "bg-orange-500 shadow-lg shadow-orange-500/50"
                      : "bg-zinc-300"
                  }`}
                >
                  {cartCount}
                </span>
              </div>
              <span className="hidden md:inline text-sm font-semibold text-zinc-900 group-hover:text-[#1e6cff]">
                Carrito
              </span>
            </Link>

            <button
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden rounded-lg p-2 hover:bg-zinc-100"
              aria-label="Abrir menú"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Dark navigation bar */}
      <nav className="bg-[#0d1e3a] text-white">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-1 px-4 sm:px-6 lg:px-8">
          <div
            className="relative h-full"
            onMouseEnter={() => setCatOpen(true)}
            onMouseLeave={() => setCatOpen(false)}
          >
            <button className="flex h-full items-center gap-2 px-4 text-sm font-semibold bg-[#1e6cff] hover:bg-[#1858d6]">
              <LayoutGrid className="h-4 w-4" /> Categorías
              <ChevronDown className="h-3 w-3" />
            </button>
            {catOpen && (
              <div className="absolute left-0 top-full grid w-[520px] grid-cols-2 gap-1 rounded-b-lg border border-zinc-200 bg-white p-3 text-zinc-900 shadow-xl">
                {categories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/categoria/${cat.slug}`}
                    className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-blue-50 hover:text-[#1e6cff]"
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <span>{cat.nombre}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="hidden lg:flex items-center gap-1 text-sm">
            <Link href="/" className="px-4 py-1.5 rounded hover:bg-white/10">
              Inicio
            </Link>
            <Link href="/catalogo" className="px-4 py-1.5 rounded hover:bg-white/10">
              Tienda
            </Link>
            <Link href="/ofertas" className="px-4 py-1.5 rounded hover:bg-white/10">
              Ofertas
            </Link>
            <Link href="/armador" className="px-4 py-1.5 rounded hover:bg-white/10">
              Armador de PC
            </Link>
            <Link href="/asesor" className="px-4 py-1.5 rounded hover:bg-white/10">
              Asesor IA
            </Link>
            <Link href="/conseguir" className="px-4 py-1.5 rounded hover:bg-white/10">
              Te lo conseguimos
            </Link>
            <Link href="/nosotros" className="px-4 py-1.5 rounded hover:bg-white/10">
              Nosotros
            </Link>
            <Link href="/contacto" className="px-4 py-1.5 rounded hover:bg-white/10">
              Contacto
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-zinc-200 bg-white px-4 py-4 space-y-1">
          <form action="/catalogo" className="flex md:hidden mb-3">
            <input
              type="search"
              name="q"
              placeholder="Buscar…"
              className="w-full rounded-l-full border border-zinc-300 px-4 py-2 text-sm"
            />
            <button className="rounded-r-full bg-[#1e6cff] px-4 text-white text-sm font-semibold">
              <Search className="h-4 w-4" />
            </button>
          </form>
          {[
            ["/", "Inicio"],
            ["/catalogo", "Tienda"],
            ["/ofertas", "Ofertas"],
            ["/armador", "🛠️ Armador de PC"],
            ["/asesor", "🤖 Asesor IA"],
            ["/conseguir", "✨ Te lo conseguimos"],
            ["/nosotros", "Sobre nosotros"],
            ["/contacto", "Contacto"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="block rounded px-3 py-2 font-medium hover:bg-blue-50"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="border-t border-zinc-200 pt-2 grid grid-cols-2 gap-1">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categoria/${cat.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 py-2 text-sm"
              >
                <span>{cat.emoji}</span>
                {cat.nombre}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
