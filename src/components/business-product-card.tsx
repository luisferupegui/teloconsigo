"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import type { BusinessProduct } from "@/lib/products-types";
import { useWishlist } from "@/lib/wishlist";
import { formatCOP } from "@/lib/products-types";

// ─── Etiquetas de specs (compartido con /productos y /soluciones) ──────────────

const SPEC_LABEL: Record<string, string | null> = {
  procesador:     "CPU",
  ram:            "RAM",
  almacenamiento: "SSD",
  pantalla:       "Pantalla",
  monitor:        "Monitor",
  so:             "SO",
  garantia:       "Garantía",
  conectividad:   "Red",
  bateria:        "Batería",
  capacidad:      "Cap.",
  interfaz:       "Puerto",
  cobertura:      "Equipos",
  duracion:       "Vigencia",
  clase:          "Clase",
  velocidad:      "Vel.",
  frecuencia:     "Refresco",
  tipo:           "Tipo",
  entrega:        "Entrega",
  incluye:        "Incluye",
  version:        "Versión",
  // omitidos de la vista resumen
  puertos:        null,
  extra:          null,
  angulo:         null,
  brillo:         null,
};

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * Tarjeta de producto de negocio con botón de favoritos.
 *
 * variant="conseguir" (default) → CTA va a /conseguir?ref=...
 * variant="asesor"              → CTA va a /asesor?producto=...&ref=...&precio=...
 */
export function BusinessProductCard({
  product,
  variant = "conseguir",
}: {
  product: BusinessProduct;
  variant?: "conseguir" | "asesor";
}) {
  const { has, toggle } = useWishlist();
  const productKey = product.referencia ?? product.slug ?? product.id;
  const isFavorite  = has(productKey);

  const price = product.precioDesde ?? product.precio;

  const cotizarHref =
    variant === "asesor"
      ? `/asesor?producto=${encodeURIComponent(product.nombre)}&ref=${encodeURIComponent(
          product.referencia ?? product.slug,
        )}&precio=${price ?? ""}`
      : `/conseguir?ref=${product.referencia ?? product.slug}`;

  const specRows = Object.entries(product.specs)
    .map(([k, v]) => {
      const label = k in SPEC_LABEL ? SPEC_LABEL[k] : k;
      return label ? { label, value: String(v) } : null;
    })
    .filter((x): x is { label: string; value: string } => x !== null)
    .slice(0, 3);

  return (
    <div className="relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">

      {/* ── Botón favoritos ── */}
      <button
        type="button"
        onClick={() => toggle(productKey)}
        aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center
                   rounded-full bg-white shadow-sm border border-zinc-100
                   transition-colors hover:bg-zinc-50"
      >
        <Heart
          className={`h-3.5 w-3.5 transition-colors ${
            isFavorite ? "fill-rose-500 text-rose-500" : "text-zinc-400"
          }`}
          strokeWidth={1.5}
        />
      </button>

      {/* ── Nombre + descripción ── */}
      <h3 className="pr-9 text-sm font-semibold text-zinc-900 leading-snug line-clamp-2 min-h-[2.5rem]">
        {product.nombre}
      </h3>
      <p className="mt-1.5 text-xs text-zinc-500 line-clamp-2 min-h-[2rem]">
        {product.descripcionUso}
      </p>

      {/* ── Specs ── */}
      <div className="mt-3 space-y-1.5 flex-1">
        {specRows.map(({ label, value }) => (
          <div key={label} className="flex items-baseline gap-2 text-xs leading-4">
            <span className="shrink-0 min-w-[48px] font-medium text-zinc-400 truncate">
              {label}
            </span>
            <span className="flex-1 min-w-0 text-zinc-700 line-clamp-1">
              {value}
            </span>
          </div>
        ))}
        {/* Relleno para altura uniforme cuando hay menos de 3 specs */}
        {specRows.length < 3 && (
          <div style={{ height: `${(3 - specRows.length) * 1.25}rem` }} />
        )}
      </div>

      {/* ── Precio y CTA ── */}
      <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
        <div>
          {price ? (
            <>
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Desde
              </span>
              <p className="text-base font-bold text-zinc-900 leading-tight mt-0.5">
                {formatCOP(price)}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-zinc-400">Consultar precio</p>
          )}
        </div>
        <Link
          href={cotizarHref}
          className="shrink-0 rounded-full bg-[#1e6cff] px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 active:scale-95"
        >
          Cotizar
        </Link>
      </div>
    </div>
  );
}
