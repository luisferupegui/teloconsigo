import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BusinessProduct } from "@/lib/products-types";
import { SmartImage } from "./smart-image";
import { formatCOP } from "@/lib/products-types";

const CAT_MAP: Record<string, string> = {
  portatil: "portatiles",
  pc: "equipos-escritorio",
  monitor: "monitores",
  tablet: "tablets",
  licencia: "licencias",
  accesorio: "accesorios",
};

function imgUrl(marca: string, nombre: string, categoria: string) {
  const cat = CAT_MAP[categoria] ?? "productos";
  const model = nombre.split(" ").slice(0, 4).join(" ");
  return `/api/product-image?brand=${encodeURIComponent(marca)}&model=${encodeURIComponent(model)}&cat=${cat}`;
}

export function BusinessFeaturedCard({ product }: { product: BusinessProduct }) {
  const precio = product.precioDesde ?? product.precio;
  const href = `/soluciones#${product.usoCaso}`;

  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all duration-300 hover:shadow-2xl hover:shadow-[#1e6cff]/15 hover:-translate-y-1 hover:border-[#1e6cff]/50"
    >
      <div className="relative overflow-hidden">
        <div className="transition-transform duration-500 ease-out group-hover:scale-110">
          <SmartImage
            src={imgUrl(product.marca, product.nombre, product.categoria)}
            alt={product.nombre}
            className="h-48 w-full bg-gradient-to-br from-zinc-50 to-zinc-100"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
          {product.marca}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-900 group-hover:text-[#1e6cff] min-h-[40px]">
          {product.nombre}
        </h3>
        <div className="mt-auto pt-3">
          {precio !== null && (
            <>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-semibold">
                Desde
              </p>
              <p className="font-display text-xl font-bold text-[#1e6cff]">
                {formatCOP(precio)}
              </p>
            </>
          )}
          <div className="mt-1 flex items-center gap-1 text-xs">
            <span className="ml-auto flex items-center gap-0.5 font-semibold text-[#1e6cff] transition-all group-hover:gap-1.5">
              Cotizar <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
