"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X, Heart, Tag } from "lucide-react";
import { formatCOP } from "@/lib/products-types";
import { useWishlist } from "@/lib/wishlist";

/** Número WhatsApp del negocio (sin '+') */
const WA_NUMBER = "14079169299";

// ─── Tipo compartido entre Navbar y SearchModal ───────────────────────────────

export type QuickViewProduct = {
  id: string;
  slug: string;
  nombre: string;
  marca: string;
  categoria: string;
  precio: number;
  imagen: string;
  referencia: string;
  descripcionUso: string;
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function ProductQuickView({
  product,
  onClose,
}: {
  product: QuickViewProduct | null;
  onClose: () => void;
}) {
  const { has, toggle } = useWishlist();

  /* Bloquear scroll mientras el modal está abierto */
  useEffect(() => {
    document.body.style.overflow = product ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [product]);

  /* Cerrar con Escape */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (product) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, onClose]);

  if (!product) return null;

  const productKey  = product.referencia || product.id;
  const isFavorite  = has(productKey);

  /* Convertir descripcionUso en bullets (separados por "·" o salto de línea) */
  const specs = product.descripcionUso
    ? product.descripcionUso.split(/[·\n]/).map((s) => s.trim()).filter(Boolean)
    : [];

  /* Mensaje de WhatsApp pre-llenado */
  const waText = encodeURIComponent(
    `Hola! Me interesa este producto:\n*${product.nombre}*` +
    (product.referencia ? `\nRef: ${product.referencia}` : "") +
    (product.precio > 0 ? `\nPrecio desde: ${formatCOP(product.precio)}` : "") +
    `\n¿Pueden cotizármelo?`
  );
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${waText}`;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Botón favoritos ── */}
        <button
          type="button"
          onClick={() => toggle(productKey)}
          aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          className="absolute right-14 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 transition"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isFavorite ? "fill-rose-500 text-rose-500" : "text-zinc-400"
            }`}
            strokeWidth={1.5}
          />
        </button>

        {/* ── Botón cerrar ── */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 transition"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4 text-zinc-600" />
        </button>

        <div className="flex flex-col sm:flex-row">

          {/* ── Imagen ── */}
          {/* min-h fija para móvil; en sm+ la altura la dicta el contenido del lado derecho */}
          <div className="relative min-h-[220px] sm:h-auto sm:w-64 shrink-0
                          bg-white sm:rounded-l-2xl
                          border-b border-zinc-100 sm:border-b-0 sm:border-r sm:border-zinc-100">
            {product.imagen ? (
              <Image
                src={product.imagen}
                alt={product.nombre}
                fill
                className="object-contain p-7"
                sizes="(max-width:640px) 100vw, 256px"
                unoptimized
              />
            ) : (
              <div className="flex h-full min-h-[220px] items-center justify-center text-7xl">
                📦
              </div>
            )}
          </div>

          {/* ── Información ── */}
          <div className="flex flex-1 flex-col gap-3 p-5">

            {/* Marca + nombre + referencia */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                {product.marca}
              </p>
              <h2 className="mt-1 pr-8 text-[17px] font-bold leading-snug text-zinc-900">
                {product.nombre}
              </h2>
              {product.referencia && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
                  <Tag className="h-3 w-3" /> {product.referencia}
                </p>
              )}
            </div>

            {/* Precio */}
            {product.precio > 0 && (
              <div className="rounded-xl bg-blue-50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                  Precio desde
                </p>
                <p className="text-2xl font-bold text-[#1e6cff]">
                  {formatCOP(product.precio)}
                </p>
                <p className="mt-0.5 text-[10px] text-blue-300">
                  Sujeto a disponibilidad · IVA incluido
                </p>
              </div>
            )}

            {/* Especificaciones */}
            {specs.length > 0 && (
              <ul className="space-y-1.5">
                {specs.slice(0, 5).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                    <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#1e6cff]" />
                    {s}
                  </li>
                ))}
              </ul>
            )}

            {/* Botón WhatsApp */}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto flex items-center justify-center gap-2.5 rounded-xl bg-[#25d366] px-5 py-3 text-sm font-bold text-white shadow-sm shadow-green-200 hover:bg-[#1fbc57] transition"
            >
              {/* SVG oficial de WhatsApp */}
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Cotizar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
