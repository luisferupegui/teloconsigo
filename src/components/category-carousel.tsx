"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS = [
  { name: "Procesadores",           href: "/categoria/procesadores",      img: "/carousel/procesadores.png" },
  { name: "Portátiles",             href: "/catalogo?q=portatil",         img: "/carousel/portatiles.png" },
  { name: "Motherboards",           href: "/categoria/placas-madre",      img: "/carousel/motherboards.png" },
  { name: "Memoria RAM",            href: "/categoria/memoria-ram",       img: "/carousel/memoria-ram.png" },
  { name: "Tarjetas Gráficas",      href: "/categoria/tarjetas-graficas", img: "/carousel/tarjetas-graficas.png" },
  { name: "Fuentes de Poder",       href: "/categoria/fuentes-de-poder",  img: "/carousel/fuentes-de-poder.png" },
  { name: "Monitores",              href: "/categoria/monitores",         img: "/carousel/monitores.png" },
  { name: "Refrigeración",          href: "/categoria/refrigeracion",     img: "/carousel/refrigeracion.png" },
  { name: "Equipos de Escritorio",  href: "/catalogo?q=escritorio",       img: "/carousel/equipos-escritorio.png" },
  { name: "Redes",                  href: "/catalogo?q=redes",            img: "/carousel/redes.png" },
  { name: "Mouse & Pad Mouse",      href: "/categoria/perifericos",       img: "/carousel/mouse-pad.png" },
  { name: "Auriculares y Audio",    href: "/categoria/perifericos",       img: "/carousel/auriculares.png" },
  { name: "Kits de Streaming",      href: "/conseguir",                   img: "/carousel/kits-streaming.png" },
  { name: "Almacenamiento",         href: "/categoria/almacenamiento",    img: "/carousel/almacenamiento.png" },
  { name: "Protección y Accesorios",href: "/catalogo?q=accesorios",       img: "/carousel/proteccion-accesorios.png" },
  { name: "Teclados",               href: "/categoria/perifericos",       img: "/carousel/teclados.png" },
  { name: "Impresoras",             href: "/conseguir",                   img: "/carousel/impresoras.png" },
];

const VISIBLE = 5;
const TOTAL = ITEMS.length;
const MAX_IDX = TOTAL - VISIBLE;
const PAGES = Math.ceil(TOTAL / VISIBLE);

export function CategoryCarousel() {
  const [idx, setIdx] = useState(0);

  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(MAX_IDX, i + 1));
  const currentPage = Math.round((idx / MAX_IDX) * (PAGES - 1));

  return (
    <section className="bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <h2 className="text-center font-display text-3xl font-black uppercase tracking-tight text-zinc-900 sm:text-4xl">
          Explora Nuestros Productos
        </h2>

        <div className="relative mt-12">

          {/* Flecha izquierda */}
          <button
            onClick={prev}
            disabled={idx === 0}
            aria-label="Anterior"
            className="absolute left-0 top-[40%] -translate-y-1/2 -translate-x-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 shadow-md transition hover:border-zinc-400 hover:text-zinc-700 disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Flecha derecha */}
          <button
            onClick={next}
            disabled={idx >= MAX_IDX}
            aria-label="Siguiente"
            className="absolute right-0 top-[40%] -translate-y-1/2 translate-x-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 shadow-md transition hover:border-zinc-400 hover:text-zinc-700 disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Track */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${idx * (100 / VISIBLE)}%)` }}
            >
              {ITEMS.map((cat) => (
                <div key={cat.name} className="w-1/5 flex-none px-3">
                  <Link href={cat.href} className="group flex flex-col items-center gap-4">

                    {/* Imagen flotante — estilo silhouette/product shot */}
                    <div className="relative h-44 w-full">
                      <Image
                        src={cat.img}
                        alt={cat.name}
                        fill
                        sizes="220px"
                        unoptimized
                        className="object-contain drop-shadow-md transition-transform duration-400 group-hover:scale-110 group-hover:drop-shadow-xl"
                      />
                    </div>

                    {/* Separador */}
                    <div className="w-full h-px bg-zinc-100" />

                    {/* Nombre */}
                    <span className="text-center text-sm font-medium text-zinc-600 transition group-hover:text-zinc-900">
                      {cat.name}
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: PAGES }).map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(Math.min(i * VISIBLE, MAX_IDX))}
                aria-label={`Página ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentPage
                    ? "w-6 bg-zinc-800"
                    : "w-2 bg-zinc-300 hover:bg-zinc-400"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
