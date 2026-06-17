"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Cpu, Zap, Shield, Headphones } from "lucide-react";

const SLIDES = [
  {
    img: "/hero-banner.png",
    alt: "Gaming PC Setup",
    objectClass: "object-contain object-right",
    hasOverlay: true,
  },
  {
    img: "/hero3.png",
    alt: "Potencia Sin Límites — ROG Components",
    objectClass: "object-cover object-center",
    hasOverlay: false,
  },
];

const INTERVAL = 7000;

export function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #050a18 0%, #091228 55%, #060c1c 100%)",
      }}
    >
      {/* ── Imágenes con crossfade ── */}
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <Image
            src={slide.img}
            alt={slide.alt}
            fill
            sizes="100vw"
            priority={i === 0}
            className={slide.objectClass}
          />
        </div>
      ))}

      {/* ── Degradado slide 0: texto legible izquierda ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background:
            "linear-gradient(to right, #050a18 32%, rgba(5,10,24,0.72) 50%, rgba(5,10,24,0.1) 70%, transparent 85%)",
          opacity: current === 0 ? 1 : 0,
        }}
      />

      {/* ── Degradado slide 1: viñeta perimetral sutil ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(5,10,24,0.55) 100%)",
          opacity: current === 1 ? 1 : 0,
        }}
      />

      {/* ── Degradado inferior permanente ── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none z-10"
        style={{ background: "linear-gradient(to top, #0a0f1a 0%, transparent 100%)" }}
      />

      {/* ── Contenido — texto + botones (solo slide 0) ── */}
      <div
        className="relative z-20 mx-auto max-w-7xl px-6 pt-14 pb-24 sm:pt-16 sm:pb-28 lg:px-8 lg:pt-20 lg:pb-32 transition-opacity duration-1000"
        style={{
          opacity: current === 0 ? 1 : 0,
          pointerEvents: current === 0 ? "auto" : "none",
        }}
      >
        <div className="max-w-[500px]">
          <h1 className="font-display text-4xl font-black leading-tight text-white sm:text-5xl lg:text-[3.25rem]">
            Todo el hardware que necesitas,{" "}
            <span className="text-[#1e6cff]">te lo consigo.</span>
          </h1>
          <p className="mt-4 text-base text-zinc-300 sm:text-lg max-w-sm">
            Componentes y accesorios para computadoras domésticas y corporativas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/catalogo"
              className="rounded-md bg-[#1e6cff] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#1858d6] shadow-lg shadow-[#1e6cff]/30"
            >
              Ver productos
            </Link>
            <Link
              href="/soluciones"
              className="rounded-md border border-white/25 bg-white/10 px-7 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              Ofertas del día
            </Link>
          </div>
        </div>
      </div>

      {/* ── Íconos de valor (solo slide 0) ── */}
      <div
        className="absolute bottom-6 left-0 right-0 z-20 pointer-events-none transition-opacity duration-1000"
        style={{ opacity: current === 0 ? 1 : 0 }}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center gap-6 lg:gap-10">
            {[
              { Icon: Cpu, label: "Tecnología de\núltima generación" },
              { Icon: Zap, label: "Máximo\nrendimiento" },
              { Icon: Shield, label: "Calidad y\nconfianza" },
              { Icon: Headphones, label: "Soporte\nespecializado" },
            ].map(({ Icon, label }, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {i > 0 && (
                  <div className="hidden sm:block h-6 w-px bg-white/20 mr-3 lg:mr-6" />
                )}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#1e6cff]/50 bg-[#1e6cff]/10">
                  <Icon className="h-4 w-4 text-[#4d8dff]" />
                </div>
                <span className="hidden sm:block text-[10px] uppercase tracking-widest text-zinc-400 whitespace-pre-line leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Indicadores de slide (dots) ── */}
      <div className="absolute bottom-6 right-6 lg:right-12 z-30 flex items-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "w-6 h-2 bg-white"
                : "w-2 h-2 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
