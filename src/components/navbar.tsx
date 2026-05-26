"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Search,
  ShoppingCart,
  Menu,
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

  const navLinks = [
    ["/", "Inicio"],
    ["/catalogo", "Tienda"],
    ["/ofertas", "Ofertas"],
    ["/armador", "Armador de PC"],
    ["/asesor", "Asesor IA"],
    ["/conseguir", "Te lo conseguimos"],
    ["/contacto", "Contacto"],
  ] as const;

  return (
    <header className="sticky top-0 z-50 bg-[#0b0f1c] border-b border-white/10">
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={products}
      />

      {/* Barra única: logo + nav links + acciones */}
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="shrink-0 group">
          <Image
            src="/logo-oscuro.png"
            alt="Te lo Consigo"
            width={1774}
            height={887}
            quality={100}
            className="h-16 w-auto transition-opacity duration-200 group-hover:opacity-75"
            priority
            unoptimized
          />
        </Link>

        {/* Nav links — desktop */}
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-0.5 text-sm font-medium text-zinc-400">
          {navLinks.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="px-3.5 py-2 rounded hover:bg-white/8 hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Acciones */}
        <div className="flex items-center gap-2 ml-auto lg:ml-0">
          {/* Buscar */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-zinc-400 hover:text-white hover:border-white/30 transition"
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Favoritos */}
          <Link
            href="/favoritos"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-zinc-400 hover:text-red-400 hover:border-red-400/40 transition"
            aria-label={`Favoritos (${wishCount})`}
          >
            <Heart
              className={`h-4 w-4 transition ${wishCount > 0 ? "fill-red-500 text-red-500" : ""}`}
            />
            {wishCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                {wishCount}
              </span>
            )}
          </Link>

          {/* Carrito */}
          <Link
            href="/carrito"
            className="relative flex items-center gap-2 rounded-full border border-[#1e6cff]/50 bg-[#1e6cff]/10 px-4 py-2 text-sm font-semibold text-[#4d8dff] hover:bg-[#1e6cff]/20 hover:border-[#1e6cff]/80 transition"
            aria-label={`Carrito (${cartCount} items)`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span
              ref={badgeRef}
              className={cartCount > 0 ? "text-white" : "text-zinc-500"}
            >
              {cartCount}
            </span>
          </Link>

          {/* Menú móvil */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-zinc-400 hover:text-white transition"
            aria-label="Abrir menú"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-white/10 bg-[#080c14] px-4 py-4 space-y-1">
          <form action="/catalogo" className="flex mb-4">
            <input
              type="search"
              name="q"
              placeholder="Buscar…"
              className="w-full rounded-l-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
            <button className="rounded-r-full bg-[#1e6cff] px-4 text-white text-sm font-semibold">
              <Search className="h-4 w-4" />
            </button>
          </form>
          {navLinks.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="block rounded px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/8 hover:text-white transition"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="border-t border-white/10 pt-3 mt-2 grid grid-cols-2 gap-1">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categoria/${cat.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded px-2 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition"
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
