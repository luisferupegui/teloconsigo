"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Menu,
  Heart,
  UserCircle,
  LayoutDashboard,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { categories } from "@/lib/categories";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { SearchModal } from "./search-modal";
import type { Product } from "@/lib/products-types";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const { count: cartCount } = useCart();
  const { count: wishCount } = useWishlist();
  const badgeRef = useRef<HTMLSpanElement>(null);
  const prev = useRef(cartCount);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);

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

  // Animación badge carrito
  useEffect(() => {
    if (cartCount !== prev.current && badgeRef.current) {
      badgeRef.current.classList.remove("animate-bounce-once");
      void badgeRef.current.offsetWidth;
      badgeRef.current.classList.add("animate-bounce-once");
      prev.current = cartCount;
    }
  }, [cartCount]);

  // Cerrar menú usuario al clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  // Cerrar dropdown de categorías al clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatOpen(false);
      }
    };
    if (catOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [catOpen]);

  const navLinks = [
    ["/", "Inicio"],
    ["/catalogo", "Productos"],
    ["/soluciones", "Promociones"],
    ["/armador", "Armador de PC"],
    ["/conseguir", "Te lo conseguimos"],
    ["/contacto", "Contacto"],
  ] as const;

  const selectedCatData = categories.find((c) => c.slug === selectedCat);

  return (
    <header className="sticky top-0 z-50 bg-[#0b0f1c] border-b border-white/10">
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={products}
      />

      {/* ══════════════════════════════════════════════════════════════
          DESKTOP — CSS Grid: logo y acciones abarcan las 2 filas.
          Col 1 (auto): logo  |  Col 2 (1fr): nav / búsqueda  |  Col 3 (auto): acciones
         ══════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:grid grid-cols-[auto_1fr_auto] gap-x-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Logo — abarca ambas filas ───────────────────────────── */}
        <div className="row-span-2 self-center py-3">
          <Link href="/" className="group shrink-0 block mix-blend-lighten" style={{ transform: "translateY(-5%)", display: "block" }}>
            <Image
              src="/Logo Oscuro Con Slogan.png"
              alt="Te lo Consigo"
              width={1774}
              height={887}
              quality={100}
              className="h-[115px] w-auto transition-opacity duration-200 group-hover:opacity-80"
              priority
              unoptimized
            />
          </Link>
        </div>

        {/* ── Fila 1: Nav links ───────────────────────────────────── */}
        <nav
          style={{ fontFamily: "var(--font-nav)" }}
          className="flex items-center justify-center gap-0.5 text-[20px]
                     tracking-wider uppercase text-white subpixel-antialiased pt-3 pb-1.5"
        >
          {navLinks.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="px-3.5 py-2 rounded transition-colors duration-200
                         text-white/50 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* ── Acciones — fila 1, mismo nivel que el nav ───────────── */}
        <div className="flex items-center gap-2 pt-3 pb-1.5">

          {/* Favoritos */}
          <Link
            href="/favoritos"
            className="relative flex h-9 w-9 items-center justify-center rounded-full
                       border border-white/15 text-zinc-400
                       hover:text-red-400 hover:border-red-400/40 transition"
            aria-label={`Favoritos (${wishCount})`}
          >
            <Heart className={`h-4 w-4 transition ${wishCount > 0 ? "fill-red-500 text-red-500" : ""}`} />
            {wishCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center
                               rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                {wishCount}
              </span>
            )}
          </Link>

          {/* Carrito */}
          <Link
            href="/carrito"
            className="relative flex items-center gap-2 rounded-full border border-[#1e6cff]/50
                       bg-[#1e6cff]/10 px-4 py-2 text-sm font-semibold text-[#4d8dff]
                       hover:bg-[#1e6cff]/20 hover:border-[#1e6cff]/80 transition"
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

          {/* Usuario / Admin */}
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                userMenuOpen
                  ? "border-[#1e6cff]/60 bg-[#1e6cff]/15 text-[#4d8dff]"
                  : "border-white/15 text-zinc-400 hover:text-white hover:border-white/30"
              }`}
              aria-label="Menú de usuario"
            >
              <UserCircle className="h-5 w-5" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/10
                              bg-[#0f1626] shadow-2xl shadow-black/60 py-1 z-50">
                <div className="px-4 py-3 border-b border-white/8">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-0.5">
                    Modo desarrollo
                  </p>
                  <p className="text-sm font-semibold text-white">Administrador</p>
                </div>
                <Link
                  href="/admin"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300
                             hover:text-white hover:bg-white/5 transition"
                >
                  <LayoutDashboard className="h-4 w-4 text-[#4d8dff]" />
                  Panel Admin
                </Link>
                <button
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-400
                             hover:text-red-400 hover:bg-red-500/5 transition"
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Fila 2: Barra de búsqueda con categorías ────────────── */}
        <div className="pt-1.5 pb-3 flex justify-center -translate-y-[2px]">
          <form action="/catalogo" method="get" className="w-full max-w-[612px]">
            {selectedCat && (
              <input type="hidden" name="categoria" value={selectedCat} />
            )}

            {/*
              catRef envuelve todo: trigger + dropdown.
              El dropdown es hermano del pill (fuera de overflow-hidden)
              → no sufre clipping.
            */}
            <div ref={catRef} className="relative">

              {/* Pill ─ overflow-hidden da forma de cápsula a sus hijos */}
              <div className="flex items-center rounded-full border border-white/10 bg-white/5
                              overflow-hidden hover:border-white/15
                              focus-within:border-[#1e6cff]/50 focus-within:bg-[#1e6cff]/5
                              transition-colors">

                {/* Selector de categoría */}
                <button
                  type="button"
                  onClick={() => setCatOpen((v) => !v)}
                  className="flex items-center gap-1.5 pl-4 pr-3 py-2.5 text-sm text-zinc-300
                             hover:text-white hover:bg-white/8 border-r border-white/10
                             shrink-0 whitespace-nowrap transition-colors"
                >
                  {selectedCatData ? (
                    <>
                      <div className="flex h-5 w-5 items-center justify-center rounded-full
                                      border border-[#1e6cff]/40 bg-[#1e6cff]/10 shrink-0">
                        <selectedCatData.Icon className="h-2.5 w-2.5 text-[#4d8dff]" />
                      </div>
                      <span className="max-w-[110px] truncate">{selectedCatData.nombre}</span>
                    </>
                  ) : (
                    "Todas las categorías"
                  )}
                  <ChevronDown
                    className={`h-3 w-3 text-zinc-500 ml-0.5 transition-transform duration-200 ${
                      catOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Icono lupa */}
                <Search className="ml-4 h-4 w-4 text-zinc-500 pointer-events-none shrink-0" />

                {/* Input de texto */}
                <input
                  type="search"
                  name="q"
                  placeholder="Buscar productos, marcas, componentes…"
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white
                             placeholder-zinc-500 focus:outline-none min-w-0"
                />

                {/* Botón enviar */}
                <button
                  type="submit"
                  className="bg-[#1e6cff] hover:bg-[#1e6cff]/85 px-5 py-2.5
                             text-white transition-colors shrink-0"
                  aria-label="Buscar"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>

              {/* Dropdown de categorías ─ fuera del overflow-hidden */}
              {catOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-60 rounded-xl border
                                border-white/10 bg-[#0f1626] shadow-2xl shadow-black/60
                                py-1 z-50 max-h-72 overflow-y-auto scrollbar-neon">
                  <button
                    type="button"
                    onClick={() => { setSelectedCat(""); setCatOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition ${
                      !selectedCat
                        ? "text-white bg-white/5"
                        : "text-zinc-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Todas las categorías
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => { setSelectedCat(cat.slug); setCatOpen(false); }}
                      className={`w-full text-left flex items-center gap-2.5 px-4 py-2
                                  text-sm transition ${
                        selectedCat === cat.slug
                          ? "text-white bg-white/5"
                          : "text-zinc-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full
                                      border border-[#1e6cff]/30 bg-[#1e6cff]/8 shrink-0">
                        <cat.Icon className="h-3 w-3 text-[#4d8dff]" />
                      </div>
                      {cat.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE — fila única: logo + acciones
         ══════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden flex h-16 items-center gap-3 max-w-7xl mx-auto px-4">
        <Link href="/" className="shrink-0 group">
          <Image
            src="/Logo Oscuro Con Slogan.png"
            alt="Te lo Consigo"
            width={1774}
            height={887}
            quality={100}
            className="h-12 w-auto mix-blend-lighten transition-opacity group-hover:opacity-80"
            priority
            unoptimized
          />
        </Link>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full
                       border border-white/15 text-zinc-400 hover:text-white transition"
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </button>

          <Link
            href="/favoritos"
            className="relative flex h-9 w-9 items-center justify-center rounded-full
                       border border-white/15 text-zinc-400
                       hover:text-red-400 hover:border-red-400/40 transition"
          >
            <Heart className={`h-4 w-4 ${wishCount > 0 ? "fill-red-500 text-red-500" : ""}`} />
            {wishCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center
                               rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                {wishCount}
              </span>
            )}
          </Link>

          <Link
            href="/carrito"
            className="relative flex items-center gap-2 rounded-full border border-[#1e6cff]/50
                       bg-[#1e6cff]/10 px-3 py-2 text-sm font-semibold text-[#4d8dff]
                       hover:bg-[#1e6cff]/20 transition"
          >
            <ShoppingCart className="h-4 w-4" />
            <span ref={badgeRef} className={cartCount > 0 ? "text-white" : "text-zinc-500"}>
              {cartCount}
            </span>
          </Link>

          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full
                       border border-white/15 text-zinc-400 hover:text-white transition"
            aria-label="Abrir menú"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Mobile menu desplegable ──────────────────────────────── */}
      {open && (
        <div className="lg:hidden border-t border-white/10 bg-[#080c14] px-4 py-4 space-y-1">
          <form action="/catalogo" method="get" className="flex mb-4">
            <input
              type="search"
              name="q"
              placeholder="Buscar…"
              className="w-full rounded-l-full border border-white/15 bg-white/5
                         px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-r-full bg-[#1e6cff] px-4 text-white text-sm font-semibold"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          {navLinks.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="block rounded px-3 py-2.5 text-sm font-medium text-zinc-300
                         hover:bg-white/8 hover:text-white transition"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}

          <Link
            href="/admin"
            className="flex items-center gap-2 rounded px-3 py-2.5 text-sm font-medium
                       text-[#4d8dff] hover:bg-white/8 transition"
            onClick={() => setOpen(false)}
          >
            <LayoutDashboard className="h-4 w-4" />
            Panel Admin
          </Link>

          <div className="border-t border-white/10 pt-3 mt-2 grid grid-cols-2 gap-1">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categoria/${cat.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded px-2 py-2 text-sm text-zinc-400
                           hover:text-white hover:bg-white/5 transition"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full
                                border border-[#1e6cff]/30 bg-[#1e6cff]/8 shrink-0">
                  <cat.Icon className="h-2.5 w-2.5 text-[#4d8dff]" />
                </div>
                {cat.nombre}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
