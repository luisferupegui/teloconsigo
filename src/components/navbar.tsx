"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Menu,
  Heart,
  UserCircle,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { iconoDe } from "@/lib/categories-icons";
import type { Category } from "@/lib/categories";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { SearchModal } from "./search-modal";
import { formatCOP } from "@/lib/products-types";
import { ProductQuickView, type QuickViewProduct } from "./product-quick-view";

// Las categorías llegan por props: este componente es de CLIENTE y la taxonomía se lee
// del disco en el servidor. El layout raíz las carga y las baja hasta aquí.
export function Navbar({ categories = [] }: { categories?: Category[] }) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [products, setProducts] = useState<QuickViewProduct[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [quickView, setQuickView] = useState<QuickViewProduct | null>(null);
  const [searchDDOpen, setSearchDDOpen] = useState(false);
  const pathname = usePathname();
  const { count: cartCount } = useCart();
  const { count: wishCount } = useWishlist();
  const badgeRef = useRef<HTMLSpanElement>(null);
  const prev = useRef(cartCount);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Solo productos PUBLICADOS aparecen en la búsqueda pública.
    fetch("/api/business-products")
      .then((r) => r.json())
      .then((data: Array<Record<string, unknown>>) =>
        setProducts(
          data
            .filter((p) => p.publicado !== false)
            .map((p) => ({
              id:            (p.referencia ?? p.slug ?? p.nombre) as string,
              slug:          (p.slug ?? p.referencia ?? "") as string,
              nombre:        p.nombre as string,
              marca:         p.marca as string,
              categoria:     p.categoria as string,
              precio:        (p.precioDesde ?? p.precio ?? 0) as number,
              imagen:        (p.imageUrl ?? p.imagen ?? "") as string,
              referencia:    (p.referencia ?? "") as string,
              descripcionUso:(p.descripcionUso ?? "") as string,
            })),
        ),
      )
      .catch(() => {});
  }, []);

  // Limpiar buscador al navegar entre páginas
  useEffect(() => {
    setSearchQ("");
    setSearchDDOpen(false);
  }, [pathname]);

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

  // Cerrar dropdown de contacto al clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contactRef.current && !contactRef.current.contains(e.target as Node)) {
        setContactOpen(false);
      }
    };
    if (contactOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contactOpen]);

  // Cerrar el autocompletado de búsqueda al clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchDDOpen(false);
      }
    };
    if (searchDDOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchDDOpen]);

  const navLinks = [
    ["/", "Inicio"],
    ["/catalogo", "Productos"],
    ["/soluciones", "Promociones"],
    ["/armador", "Armador de PC"],
    ["/conseguir", "Te lo conseguimos"],
  ] as const;

  const sq = searchQ.toLowerCase().trim();
  const searchResults =
    sq.length >= 1
      ? products
          .filter((p) => `${p.nombre} ${p.marca} ${p.categoria}`.toLowerCase().includes(sq))
          .slice(0, 7)
      : [];

  return (
    <header
      className="sticky top-0 z-50 bg-[#0b0f1c] border-b border-white/10"
      style={{ willChange: "transform" }}
    >
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        products={products}
        onSelectProduct={(p) => { setSearchOpen(false); setQuickView(p); }}
      />
      <ProductQuickView product={quickView} onClose={() => setQuickView(null)} />

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

          {/* Dropdown Contacto */}
          <div ref={contactRef} className="relative">
            <button
              onClick={() => setContactOpen((v) => !v)}
              className={`px-3.5 py-2 rounded transition-colors duration-200 ${
                contactOpen ? "text-white" : "text-white/50 hover:text-white"
              }`}
            >
              Contacto
            </button>

            {contactOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-48 rounded-xl border
                              border-white/10 bg-[#0f1626] shadow-2xl shadow-black/60
                              py-1 z-50">
                <Link
                  href="/contacto"
                  onClick={() => setContactOpen(false)}
                  className="block px-4 py-2.5 text-sm text-zinc-300
                             hover:text-white hover:bg-white/5 transition"
                >
                  Contacto
                </Link>
                <Link
                  href="/nosotros"
                  onClick={() => setContactOpen(false)}
                  className="block px-4 py-2.5 text-sm text-zinc-300
                             hover:text-white hover:bg-white/5 transition"
                >
                  Sobre Nosotros
                </Link>
              </div>
            )}
          </div>
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

        {/* ── Fila 2: Barra de búsqueda ───────────────────────────── */}
        <div ref={searchRef} className="pt-1.5 pb-3 flex justify-center -translate-y-[2px]">
          <form action="/tienda" method="get" className="w-full max-w-[612px]">

            <div className="relative">

              {/* Pill ─ overflow-hidden da forma de cápsula a sus hijos */}
              <div className="flex items-center rounded-full border border-white/10 bg-white/5
                              overflow-hidden hover:border-white/15
                              focus-within:border-[#1e6cff]/50 focus-within:bg-[#1e6cff]/5
                              transition-colors">

                {/* Icono lupa */}
                <Search className="ml-4 h-4 w-4 text-zinc-500 pointer-events-none shrink-0" />

                {/* Input de texto */}
                <input
                  type="search"
                  name="q"
                  value={searchQ}
                  onChange={(e) => { setSearchQ(e.target.value); setSearchDDOpen(true); }}
                  onFocus={() => setSearchDDOpen(true)}
                  autoComplete="off"
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

              {/* Autocompletado de búsqueda en vivo (solo productos publicados) */}
              {searchDDOpen && sq.length >= 1 && (
                <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-white/10 bg-[#0f1626] shadow-2xl shadow-black/60 py-2 z-50 max-h-[70vh] overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <>
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setSearchDDOpen(false); setQuickView(p); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition text-left"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                            {p.imagen ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.imagen} alt="" className="h-full w-full object-contain" />
                            ) : (
                              <Search className="h-4 w-4 text-zinc-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[10px] uppercase tracking-wider text-zinc-500">{p.marca}</p>
                            <p className="truncate text-sm text-white">{p.nombre}</p>
                          </div>
                          {p.precio > 0 && (
                            <p className="shrink-0 text-sm font-bold text-[#4d8dff]">{formatCOP(p.precio)}</p>
                          )}
                        </button>
                      ))}
                      <button
                        type="submit"
                        onClick={() => setSearchDDOpen(false)}
                        className="mt-1 flex w-full items-center justify-between border-t border-white/10 px-4 py-2.5 text-sm font-semibold text-[#4d8dff] hover:bg-white/5"
                      >
                        Ver todos los resultados para “{searchQ}”
                        <Search className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-zinc-300">Sin resultados para “{searchQ}”.</p>
                      <Link
                        href="/conseguir"
                        onClick={() => setSearchDDOpen(false)}
                        className="mt-2 inline-flex rounded-full bg-[#1e6cff] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#1858d6]"
                      >
                        ✨ Te lo conseguimos
                      </Link>
                    </div>
                  )}
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
            type="button"
            onPointerDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
            style={{ touchAction: "manipulation" }}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border transition select-none
              ${open
                ? "border-[#1e6cff]/60 bg-[#1e6cff]/20 text-[#4d8dff]"
                : "border-white/30 bg-white/5 text-white hover:border-white/50"
              }`}
            aria-label="Abrir menú"
          >
            {open ? <span className="text-base leading-none">✕</span> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile nav pills — siempre visibles, scroll horizontal ── */}
      <div className="lg:hidden border-t border-white/8 bg-[#060a12]">
        <div
          className="flex gap-1 px-3 py-2 overflow-x-auto
                     [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {navLinks.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`shrink-0 inline-flex items-center rounded-full px-4 py-1.5
                          text-[13px] font-semibold transition whitespace-nowrap
                          ${pathname === href
                            ? "bg-[#1e6cff] text-white"
                            : "text-zinc-400 hover:text-white hover:bg-white/8"
                          }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/contacto"
            className={`shrink-0 inline-flex items-center rounded-full px-4 py-1.5
                        text-[13px] font-semibold transition whitespace-nowrap
                        ${pathname === "/contacto"
                          ? "bg-[#1e6cff] text-white"
                          : "text-zinc-400 hover:text-white hover:bg-white/8"
                        }`}
          >
            Contacto
          </Link>
        </div>
      </div>

      {/* ── Mobile menu desplegable ──────────────────────────────── */}
      {open && (
        <div className="lg:hidden border-t border-white/10 bg-[#080c14] px-4 py-4">

          {/* Links secundarios (no están en las pills) */}
          <div className="flex gap-2 mb-4">
            <Link
              href="/nosotros"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg
                         border border-white/10 bg-white/5 px-3 py-2.5
                         text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition"
              onClick={() => setOpen(false)}
            >
              Sobre Nosotros
            </Link>
            <Link
              href="/admin"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg
                         border border-[#1e6cff]/30 bg-[#1e6cff]/10 px-3 py-2.5
                         text-sm font-medium text-[#4d8dff] hover:bg-[#1e6cff]/20 transition"
              onClick={() => setOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4" />
              Panel Admin
            </Link>
          </div>

          {/* Categorías */}
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            Categorías
          </p>
          <div className="grid grid-cols-2 gap-1">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categoria/${cat.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-300
                           hover:text-white hover:bg-white/8 transition"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full
                                border border-[#1e6cff]/30 bg-[#1e6cff]/10 shrink-0">
                  {(() => { const Icon = iconoDe(cat.icon); return <Icon className="h-3 w-3 text-[#4d8dff]" />; })()}
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
