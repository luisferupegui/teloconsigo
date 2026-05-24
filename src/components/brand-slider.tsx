"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

type Marca = {
  nombre: string;
  /** URL directa al logo (SVG en alta resolución) */
  url: string;
};

// Combinamos Simple Icons (logos vectoriales en color) + Wikipedia Commons
// para las marcas que Simple Icons no tiene o muestra incorrectamente.
const marcas: Marca[] = [
  {
    nombre: "NVIDIA",
    url: "https://cdn.simpleicons.org/nvidia/76b900",
  },
  {
    nombre: "AMD",
    url: "https://cdn.simpleicons.org/amd/ED1C24",
  },
  {
    nombre: "Intel",
    url: "https://cdn.simpleicons.org/intel/0071C5",
  },
  {
    nombre: "ASUS",
    url: "https://cdn.simpleicons.org/asus/000000",
  },
  {
    nombre: "MSI",
    url: "https://cdn.simpleicons.org/msibusiness/FF0000",
  },
  {
    nombre: "Gigabyte",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Gigabyte_Technology_logo_%282021%29.svg/640px-Gigabyte_Technology_logo_%282021%29.svg.png",
  },
  {
    nombre: "Corsair",
    url: "https://cdn.simpleicons.org/corsair/000000",
  },
  {
    nombre: "Samsung",
    url: "https://cdn.simpleicons.org/samsung/1428A0",
  },
  {
    nombre: "Logitech",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Logitech_logo.svg/512px-Logitech_logo.svg.png",
  },
  {
    nombre: "Razer",
    url: "https://cdn.simpleicons.org/razer/00FF00",
  },
  {
    nombre: "Kingston",
    url: "https://cdn.simpleicons.org/kingstontechnology/C8102E",
  },
  {
    nombre: "Seagate",
    url: "https://cdn.simpleicons.org/seagate/6CB52D",
  },
  {
    nombre: "Western Digital",
    url: "https://cdn.simpleicons.org/westerndigital/00529B",
  },
  {
    nombre: "HyperX",
    url: "https://cdn.simpleicons.org/hyperx/F8002A",
  },
  {
    nombre: "TP-Link",
    url: "https://cdn.simpleicons.org/tplink/4ACBD6",
  },
];

function BrandLogo({ marca }: { marca: Marca }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="font-display text-2xl font-bold tracking-tight text-zinc-400 hover:text-[#1e6cff] transition">
        {marca.nombre}
      </span>
    );
  }

  return (
    <img
      src={marca.url}
      alt={marca.nombre}
      width={160}
      height={72}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-12 w-auto drop-shadow-sm transition duration-300 group-hover:scale-125 group-hover:drop-shadow-lg"
    />
  );
}

export function BrandSlider() {
  const list = [...marcas, ...marcas];

  return (
    <section className="border-y border-zinc-200 bg-gradient-to-b from-white via-zinc-50 to-white overflow-hidden py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-zinc-500">
          Trabajamos con las mejores marcas del mundo
        </p>
      </div>
      <div className="relative mt-8 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex animate-marquee items-center gap-16 whitespace-nowrap">
          {list.map((m, i) => (
            <div
              key={i}
              className="group flex h-14 shrink-0 items-center justify-center min-w-[120px]"
              title={m.nombre}
            >
              <BrandLogo marca={m} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
