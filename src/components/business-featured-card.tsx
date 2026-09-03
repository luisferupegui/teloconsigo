"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Cpu, MemoryStick, HardDrive, Monitor,
  Heart, ShieldCheck, Truck,
} from "lucide-react";
import type { BusinessProduct } from "@/lib/products-types";
import { useWishlist } from "@/lib/wishlist";

// ─── Parsers de specs ─────────────────────────────────────────────────────────

function parseCPU(val: string): [string, string] {
  const ultra = val.match(/Core\s+Ultra\s+(\d+)\s+(\w+)/i);
  if (ultra) return [`Core Ultra ${ultra[1]}`, ultra[2]];
  const intel = val.match(/Core\s+(i\d+)[- ](\w+)/i);
  if (intel) return [`Core ${intel[1]}`, intel[2]];
  const intelNum = val.match(/Core\s+(\d+)\s+(\w+)/i);
  if (intelNum) return [`Core ${intelNum[1]}`, intelNum[2]];
  const ryzen = val.match(/Ryzen\s+(\d+)\s+Pro\s+(\w+)/i);
  if (ryzen) return [`Ryzen ${ryzen[1]} Pro`, ryzen[2]];
  const ryzenBase = val.match(/Ryzen\s+(\d+)\s+(\w+)/i);
  if (ryzenBase) return [`Ryzen ${ryzenBase[1]}`, ryzenBase[2]];
  return [val.split(" ").slice(0, 2).join(" "), ""];
}

function parseRam(val: string): [string, string] {
  const m = val.match(/(\d+\s*GB)\s*(DDR\d+|LPDDR\d+|DDR)?/i);
  return m ? [m[1].replace(/\s/, ""), m[2] ?? "RAM"] : [val.slice(0, 6), "RAM"];
}

function parseStorage(val: string): [string, string] {
  const m = val.match(/(\d+(?:\.\d+)?\s*(?:GB|TB))\s*(SSD|HDD|NVMe)?/i);
  return m ? [m[1].replace(/\s/, ""), m[2] ?? "SSD"] : [val.slice(0, 6), "SSD"];
}

function parseScreen(val: string): [string, string] {
  const size = val.match(/(\d+(?:[.,]\d+)?[""])/)?.[1] ?? val.slice(0, 5);
  const res = val.match(/\b(FHD|QHD|4K|2K|WUXGA|WQXGA|UHD)\b/i)?.[1] ?? "FHD";
  return [size.replace(",", "."), res.toUpperCase()];
}

// ─── Config de specs ──────────────────────────────────────────────────────────

const SPEC_PARSERS = [
  { key: "procesador",     Icon: Cpu,         parse: parseCPU     },
  { key: "ram",            Icon: MemoryStick,  parse: parseRam     },
  { key: "almacenamiento", Icon: HardDrive,    parse: parseStorage },
  { key: "pantalla",       Icon: Monitor,      parse: parseScreen  },
] as const;

// ─── URL de imagen fallback ───────────────────────────────────────────────────

const CAT_MAP: Record<string, string> = {
  portatil:  "portatiles",
  pc:        "equipos-escritorio",
  monitor:   "monitores",
  tablet:    "tablets",
  licencia:  "licencias",
  accesorio: "accesorios",
};

function imgUrl(marca: string, nombre: string, categoria: string) {
  const cat   = CAT_MAP[categoria] ?? "productos";
  const model = nombre.split(" ").slice(0, 4).join(" ");
  return `/api/product-image?brand=${encodeURIComponent(marca)}&model=${encodeURIComponent(model)}&cat=${cat}`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function BusinessFeaturedCard({
  product,
  imageUrl,
}: {
  product: BusinessProduct;
  imageUrl?: string | null;
}) {
  const { has, toggle } = useWishlist();
  const productKey = product.referencia ?? product.slug ?? product.nombre;
  const isFavorite = has(productKey);

  const precio = product.precioDesde ?? product.precio;
  const href   = `/asesor?producto=${encodeURIComponent(product.nombre)}&ref=${encodeURIComponent(product.referencia ?? product.slug ?? "")}&precio=${precio ?? ""}`;

  const displayName = product.nombre
    .replace(new RegExp(`^${product.marca}\\s+`, "i"), "")
    .trim();

  const specs = SPEC_PARSERS
    .filter((s) => product.specs[s.key])
    .map((s) => {
      const [main, sub] = s.parse(product.specs[s.key]);
      return { Icon: s.Icon, main, sub };
    });

  const subtitleParts = [
    product.specs.procesador      ? parseCPU(product.specs.procesador).join(" ").trim()           : null,
    product.specs.ram             ? parseRam(product.specs.ram)[0]                                : null,
    product.specs.almacenamiento  ? parseStorage(product.specs.almacenamiento).join(" ").trim()   : null,
  ].filter(Boolean);
  const subtitle = subtitleParts.join(" · ");

  function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle(productKey);
  }

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-lg
                 transition-all duration-300 hover:-translate-y-1
                 hover:shadow-xl hover:shadow-indigo-500/15"
    >

      {/* ── Área de imagen ── */}
      <div className="relative overflow-hidden bg-white">

        {/* Corazón */}
        <button
          onClick={toggleFavorite}
          aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center
                     rounded-full bg-white shadow-md transition-colors hover:bg-gray-50"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isFavorite ? "fill-rose-500 text-rose-500" : "text-zinc-400"
            }`}
            strokeWidth={1.5}
          />
        </button>

        {/* Imagen del producto — contenedor 4:3 equilibra fotos landscape y cuadradas */}
        <div className="relative h-48 transition-transform duration-500 group-hover:scale-[1.04]">
          <div className="absolute inset-0 flex items-center justify-center p-2">
            <div className="relative w-full max-w-[190px] aspect-[4/3]">
              <Image
                src={imageUrl ?? imgUrl(product.marca, product.nombre, product.categoria)}
                alt={product.nombre}
                fill
                sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                unoptimized
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Garantía strip (debajo de imagen, sin solapar) ── */}
      <div className="flex items-center gap-2 border-b border-zinc-100 bg-white px-4 py-2">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Garantía Oficial
        </span>
      </div>

      {/* ── Contenido ── */}
      <div className="flex flex-1 flex-col p-4">

        {/* Marca + badge NUEVO */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
            {product.marca}
          </p>
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-bold
                           uppercase tracking-wider text-white">
            Nuevo
          </span>
        </div>

        {/* Nombre */}
        <h3 className="mt-0.5 line-clamp-2 text-[14px] font-black leading-snug text-zinc-900">
          {displayName}
        </h3>

        {/* Subtítulo */}
        {subtitle && (
          <p className="mt-1 text-[10px] text-zinc-500">{subtitle}</p>
        )}

        {/* Separador */}
        <div className="my-3 h-px bg-zinc-100" />

        {/* Grid de specs — 2×2 en móvil para que quepan en la card estrecha */}
        {specs.length > 0 && (
          <div className={`grid gap-y-2
            ${specs.length >= 4 ? "grid-cols-2" : specs.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {specs.map(({ Icon, main, sub }, i) => (
              <div key={i}
                className={`flex flex-col items-center gap-1 text-center px-1.5
                  ${(specs.length >= 4 ? i % 2 === 0 : i < specs.length - 1)
                    ? "border-r border-zinc-100" : ""}`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg
                                border border-indigo-100 bg-indigo-50">
                  <Icon className="h-3.5 w-3.5 text-indigo-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[10px] font-bold leading-tight text-zinc-900 break-words w-full">{main}</p>
                  <p className="text-[9px] leading-tight text-zinc-400">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Precio + envío */}
        <div className="mt-4 flex items-end justify-between gap-2">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-400">
              Desde
            </p>
            {precio !== null ? (
              <p className="text-[20px] font-black leading-tight text-indigo-600">
                $ {new Intl.NumberFormat("es-CO").format(precio)}
              </p>
            ) : (
              <p className="text-sm font-semibold text-zinc-400">Consultar precio</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5 text-right">
            <Truck className="h-4 w-4 text-emerald-500" />
            <p className="text-[10px] font-semibold leading-tight text-emerald-600">
              Envío
              <br />
              a todo el país
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-3 w-full rounded-xl bg-indigo-600 py-3 text-center
                        text-sm font-bold text-white transition-colors
                        group-hover:bg-indigo-700">
          Cotiza Ya Mismo
        </div>

      </div>
    </Link>
  );
}
