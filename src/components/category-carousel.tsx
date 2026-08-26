"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight,
  Cpu, Laptop, CircuitBoard, MemoryStick,
  Gamepad2, Zap, Monitor, Thermometer,
  Box, Wifi, Mouse, Headphones,
  Video, HardDrive, Shield, Keyboard, Printer, Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ─── Categorías + iconos ────────────────────────────────────────────────── */
const ITEMS: {
  name: string;
  desc: string;
  href: string;
  img:  string;
  Icon: LucideIcon;
}[] = [
  {
    name: "Procesadores",
    desc: "Potencia y velocidad para juegos y trabajo.",
    href: "/tienda?categoria=procesadores",
    img:  "/carousel/procesadores.png",
    Icon: Cpu,
  },
  {
    name: "Portátiles",
    desc: "Movilidad y rendimiento para cada necesidad.",
    href: "/tienda?categoria=portatiles",
    img:  "/carousel/portatiles.png",
    Icon: Laptop,
  },
  {
    name: "Motherboards",
    desc: "La base perfecta para tu configuración.",
    href: "/tienda?categoria=motherboards",
    img:  "/carousel/motherboards.png",
    Icon: CircuitBoard,
  },
  {
    name: "Memoria RAM",
    desc: "Más velocidad y fluidez en tu equipo.",
    href: "/tienda?categoria=memoria-ram",
    img:  "/carousel/memoria-ram.png",
    Icon: MemoryStick,
  },
  {
    name: "Tarjetas Gráficas",
    desc: "Gráficos inmersivos para juegos y diseño.",
    href: "/tienda?categoria=tarjetas-graficas",
    img:  "/carousel/tarjetas-graficas.png",
    Icon: Gamepad2,
  },
  {
    name: "Fuentes de Poder",
    desc: "Energía estable y eficiente para tu PC.",
    href: "/tienda?categoria=fuentes-de-poder",
    img:  "/carousel/fuentes-de-poder.png",
    Icon: Zap,
  },
  {
    name: "Monitores",
    desc: "Imágenes nítidas y colores vibrantes.",
    href: "/tienda?categoria=monitores",
    img:  "/carousel/monitores.png",
    Icon: Monitor,
  },
  {
    name: "Refrigeración",
    desc: "Temperaturas óptimas para mayor rendimiento.",
    href: "/tienda?categoria=refrigeracion",
    img:  "/carousel/refrigeracion.png",
    Icon: Thermometer,
  },
  {
    name: "Equipos de Escritorio",
    desc: "Equipos completos listos para trabajar.",
    href: "/tienda?categoria=equipos-escritorio",
    img:  "/carousel/equipos-escritorio.png",
    Icon: Box,
  },
  {
    name: "Redes",
    desc: "Conexión rápida y estable en todo momento.",
    href: "/tienda?categoria=redes",
    img:  "/carousel/redes.png",
    Icon: Wifi,
  },
  {
    name: "Mouse & Pad Mouse",
    desc: "Precisión y control en cada movimiento.",
    href: "/tienda?categoria=mouse-pad",
    img:  "/carousel/mouse-pad.png",
    Icon: Mouse,
  },
  {
    name: "Auriculares y Audio",
    desc: "Sonido inmersivo de alta calidad.",
    href: "/tienda?categoria=auriculares-audio",
    img:  "/carousel/auriculares.png",
    Icon: Headphones,
  },
  {
    name: "Kits de Streaming",
    desc: "Todo lo que necesitas para crear contenido.",
    href: "/tienda?categoria=kits-streaming",
    img:  "/carousel/kits-streaming.png",
    Icon: Video,
  },
  {
    name: "Almacenamiento",
    desc: "Más espacio y velocidad para tus archivos.",
    href: "/tienda?categoria=almacenamiento",
    img:  "/carousel/almacenamiento.png",
    Icon: HardDrive,
  },
  {
    name: "Protección Eléctrica",
    desc: "UPS y reguladores para proteger tus equipos.",
    href: "/tienda?categoria=proteccion",
    img:  "/carousel/proteccion-accesorios.png",
    Icon: Shield,
  },
  {
    name: "Accesorios",
    desc: "Mochilas, cargadores, hubs y cables.",
    href: "/tienda?categoria=accesorios",
    img:  "/carousel/accesorios.png",
    Icon: Package,
  },
  {
    name: "Teclados",
    desc: "Comodidad y precisión para cada uso.",
    href: "/tienda?categoria=teclados",
    img:  "/carousel/teclados.png",
    Icon: Keyboard,
  },
  {
    name: "Impresoras",
    desc: "Impresiones nítidas para hogar y oficina.",
    href: "/tienda?categoria=impresoras",
    img:  "/carousel/impresoras.png",
    Icon: Printer,
  },
];

/* ─── Dots: 1 por cada ~6 categorías ────────────────────────────────────── */
const N_DOTS = Math.ceil(ITEMS.length / 6); // 3

/* ─── Dot grid pattern SVG ───────────────────────────────────────────────── */
const DOT_PATTERN =
  `url("data:image/svg+xml,%3Csvg width='28' height='28' xmlns='http://www.w3.org/2000/svg'%3E` +
  `%3Ccircle cx='1.5' cy='1.5' r='1.5' fill='%232563EB' fill-opacity='0.08'/%3E%3C/svg%3E")`;

/* ─── Componente ─────────────────────────────────────────────────────────── */
export function CategoryCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [dot, setDot]         = useState(0);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    setCanPrev(scrollLeft > 4);
    setCanNext(scrollLeft < max - 4);
    setDot(max > 0 ? Math.round((scrollLeft / max) * (N_DOTS - 1)) : 0);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    sync();
    return () => el.removeEventListener("scroll", sync);
  }, [sync]);

  const scroll = (dir: "prev" | "next") => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir === "next" ? el.clientWidth * 0.9 : -el.clientWidth * 0.9,
      behavior: "smooth",
    });
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({
      left: (i / (N_DOTS - 1)) * (el.scrollWidth - el.clientWidth),
      behavior: "smooth",
    });
  };

  return (
    <section
      className="relative overflow-hidden py-16 sm:py-20"
      style={{ background: "linear-gradient(180deg, #F8FAFC 0%, #EEF2F7 100%)" }}
    >
      {/* ── Decoración de fondo ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: DOT_PATTERN }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 -right-24 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-24 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── Encabezado ── */}
        <div className="text-center mb-10 sm:mb-12">
          <p className="font-mono text-xs uppercase tracking-widest text-[#2563EB] mb-3">
            — Catálogo
          </p>
          <h2 className="font-display text-3xl font-black text-[#0F172A] sm:text-4xl">
            Explora Nuestra{" "}
            <span className="text-[#2563EB]">Tecnología</span>
          </h2>
          <p className="mt-3 text-[#64748B] max-w-md mx-auto leading-relaxed">
            Componentes, accesorios y equipos de alto rendimiento
            para potenciar tu experiencia.
          </p>
        </div>

        {/* ── Carrusel ──
            md:px-14 reserva a cada lado el ancho de una flecha (44px) más aire. Las
            flechas se posicionan contra la caja de relleno, o sea por FUERA de ese
            espacio, así que dejan de taparse con las tarjetas. En teléfono no hay
            ancho que reservar y se mantienen encima, como estaban. ── */}
        <div className="relative md:px-14">

          {/* Flecha izquierda */}
          <button
            onClick={() => scroll("prev")}
            disabled={!canPrev}
            aria-label="Anterior"
            className="absolute left-0 top-[42%] -translate-y-1/2 z-10
                       flex h-11 w-11 items-center justify-center rounded-full
                       border border-black/[0.07] text-[#0F172A]
                       transition-all duration-200
                       hover:scale-105 active:scale-95
                       disabled:opacity-0 disabled:pointer-events-none"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Track */}
          <div
            ref={trackRef}
            className="flex gap-5 overflow-x-auto snap-x snap-mandatory
                       scroll-smooth
                       [-ms-overflow-style:none]
                       [scrollbar-width:none]
                       [&::-webkit-scrollbar]:hidden
                       py-4 -my-4"
          >
            {ITEMS.map(({ name, desc, href, img, Icon }) => (
              <Link
                key={name}
                href={href}
                className="group/card flex-none snap-start
                           w-[calc((100%-1.25rem)/2)]
                           sm:w-[calc((100%-2.5rem)/3)]
                           md:w-[calc((100%-3.75rem)/4)]
                           lg:w-[calc((100%-6.25rem)/6)]"
              >
                {/* Card */}
                <div
                  className="flex flex-col bg-white rounded-[22px] p-4
                             border border-[#E2E8F0]
                             transition-all duration-[250ms] ease-out
                             group-hover/card:-translate-y-[6px]
                             group-hover/card:border-[#2563EB]/35
                             shadow-[0_10px_30px_rgba(15,23,42,0.06)]
                             group-hover/card:shadow-[0_20px_50px_rgba(15,23,42,0.13)]
                             overflow-hidden will-change-transform"
                >
                  {/*
                    ── Imagen ──────────────────────────────────────────────
                    Las imágenes están pre-normalizadas a 600×600 px con
                    el producto al 92% bottom-anchored (ver
                    scripts/normalize-carousel-images.mjs), por eso
                    object-contain ya basta para alinearlas perfectamente.
                  */}
                  <div className="relative h-28 sm:h-32 mb-4 flex-none">
                    <Image
                      src={img}
                      alt={name}
                      fill
                      sizes="(max-width:640px) 40vw, (max-width:768px) 26vw, (max-width:1024px) 19vw, 165px"
                      unoptimized
                      className="object-contain transition-transform duration-300
                                 group-hover/card:scale-110"
                    />
                  </div>

                  {/*
                    ── Icono + Nombre ──────────────────────────────────────
                    Icono de categoría en badge azul suave, seguido del
                    nombre — mismo estilo que la referencia del usuario.
                  */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex h-[26px] w-[26px] items-center justify-center
                                    rounded-lg bg-[#EFF6FF] shrink-0
                                    transition-colors duration-200
                                    group-hover/card:bg-[#DBEAFE]">
                      <Icon className="h-[13px] w-[13px] text-[#2563EB]" />
                    </div>
                    <h3
                      className="font-semibold text-[#0F172A] text-sm leading-tight
                                 transition-colors duration-200
                                 group-hover/card:text-[#2563EB]"
                    >
                      {name}
                    </h3>
                  </div>

                  {/* Descripción */}
                  <p className="text-xs text-[#64748B] leading-snug line-clamp-2">
                    {desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Flecha derecha */}
          <button
            onClick={() => scroll("next")}
            disabled={!canNext}
            aria-label="Siguiente"
            className="absolute right-0 top-[42%] -translate-y-1/2 z-10
                       flex h-11 w-11 items-center justify-center rounded-full
                       border border-black/[0.07] text-[#0F172A]
                       transition-all duration-200
                       hover:scale-105 active:scale-95
                       disabled:opacity-0 disabled:pointer-events-none"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
            }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* ── Dots ── */}
        <div className="mt-8 flex justify-center items-center gap-2">
          {Array.from({ length: N_DOTS }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Página ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === dot
                  ? "w-7 bg-[#2563EB]"
                  : "w-2 bg-[#CBD5E1] hover:bg-[#94A3B8]"
              }`}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
