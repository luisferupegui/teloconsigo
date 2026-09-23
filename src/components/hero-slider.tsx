"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Cpu, Zap, Shield, Headphones, Mic } from "lucide-react";

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
  {
    // Estudio de radio: la línea de equipos de alto rendimiento para audio
    // profesional. La imagen trae sus textos impresos, así que el alt dice lo mismo
    // para quien no la ve (y para Google). En el celular el recorte se centra en la
    // locutora y el micrófono, que es lo que cuenta la historia; el logo y el
    // "Audio profesional" de los costados solo caben en pantalla ancha. Y en pantalla
    // ancha el hero es más apaisado que la foto: centrada, el recorte se comía el logo
    // de la pared y el "Audio profesional", que van arriba. Se ancla cerca del borde
    // superior y lo que se pierde es la parte baja (la libreta y la taza).
    img: "/hero-estudio-audio-v3.webp",
    alt: "Estudio de radio equipado por teloconsigo.co — si existe, te lo conseguimos: audio profesional. La buena radio también se construye con tecnología.",
    objectClass: "object-cover object-[68%_center] md:object-[center_12%]",
    hasOverlay: false,
  },
];

/** El slide del estudio lleva su propio llamado a la acción. */
const SLIDE_ESTUDIO = 2;

const INTERVAL = 7000;

export function HeroSlider() {
  const [current, setCurrent] = useState(0);

  // Un temporizador por slide, que se reinicia con CADA cambio. Con un intervalo fijo,
  // quien hacía clic en un punto podía ver el slide cambiar solo un segundo después,
  // porque el reloj seguía contando desde antes del clic.
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, INTERVAL);
    return () => clearTimeout(timer);
  }, [current]);

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
            // Los demás slides ocupan el mismo espacio visible, así que diferirlos no
            // ahorra nada y sí puede dejar un slide vacío la primera vez que aparece
            // en una conexión lenta. Se cargan de una, sin la prioridad del primero.
            loading={i === 0 ? undefined : "eager"}
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

      {/* ── Llamado del slide del estudio ──
          Va abajo a la derecha, sobre el respaldo de la silla: la zona más oscura y
          vacía de la foto, sin texto impreso ni nada que valga la pena tapar (la
          consola y las manos quedan libres). No lleva al catálogo —ahí no hay
          interfaces ni micrófonos que mostrar— sino a Andrea, que pregunta qué
          necesita el estudio y lo cotiza completo. */}
      <div
        className="absolute bottom-14 right-6 lg:right-12 z-30 transition-opacity duration-1000"
        style={{
          opacity: current === SLIDE_ESTUDIO ? 1 : 0,
          pointerEvents: current === SLIDE_ESTUDIO ? "auto" : "none",
        }}
        aria-hidden={current !== SLIDE_ESTUDIO}
      >
        <Link
          href="/asesor?ref=estudio-audio"
          tabIndex={current === SLIDE_ESTUDIO ? 0 : -1}
          className="group flex items-center gap-3 rounded-full border border-white/15 bg-[#050a18]/70 py-2 pl-2 pr-5 text-white shadow-xl shadow-black/40 backdrop-blur-md transition hover:border-[#1e6cff]/60 hover:bg-[#050a18]/85"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1e6cff] shadow-lg shadow-[#1e6cff]/40">
            <Mic className="h-4 w-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold">Cotiza tu estudio</span>
            <span className="block text-[11px] text-zinc-400">Equipos de alto rendimiento para audio</span>
          </span>
        </Link>
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
