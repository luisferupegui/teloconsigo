"use client";

import Image from "next/image";

// 51 logos extraídos de Logos Marcas1.png — se omite logo-005 (fragmento "ZXT" incorrecto)
const LOGOS = Array.from({ length: 51 }, (_, i) =>
  `/brands/logo-${String(i + 1).padStart(3, "0")}.png`
).filter((_, i) => i !== 4); // índice 4 = logo-005 (ZXT)

const DISPLAY_H = 36; // altura uniforme en px para todos los logos

export function BrandMarquee() {
  return (
    <section
      aria-label="Marcas asociadas"
      className="relative bg-white border-y border-zinc-100 overflow-hidden"
    >
      {/* Fade masks izquierda / derecha */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />

      <div className="py-6 overflow-hidden">
        <div className="flex items-center animate-marquee-slow">
          {/* Copia 1 */}
          {LOGOS.map((src, i) => (
            <div key={i} className="shrink-0 px-8">
              <Image
                src={src}
                alt=""
                height={DISPLAY_H}
                width={DISPLAY_H * 3} // placeholder; next/image usa object-contain
                unoptimized
                className="h-9 w-auto object-contain opacity-60 hover:opacity-100 transition-opacity duration-300 select-none"
              />
            </div>
          ))}
          {/* Copia 2 — loop sin corte */}
          {LOGOS.map((src, i) => (
            <div key={"b" + i} className="shrink-0 px-8" aria-hidden>
              <Image
                src={src}
                alt=""
                height={DISPLAY_H}
                width={DISPLAY_H * 3}
                unoptimized
                className="h-9 w-auto object-contain opacity-60 select-none"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
