"use client";

import { useEffect, useRef, useState } from "react";

export function Counter({
  end,
  duration = 1800,
  suffix = "",
  prefix = "",
}: {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.floor(end * eased));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString("es-CO")}
      {suffix}
    </span>
  );
}

const STATS = [
  { num: 1500, suffix: "+", label: "Clientes satisfechos",  sub: "y creciendo cada día"       },
  { num: 200,  suffix: "+", label: "Productos en catálogo", sub: "continuamente actualizados"  },
  { num: 50,   suffix: "+", label: "Marcas oficiales",      sub: "distribuidores certificados" },
  { num: 100,  suffix: "%", label: "Garantía oficial",      sub: "productos 100% originales"   },
];

export function StatsSection() {
  return (
    <section className="relative bg-[#0a0f1a] text-white overflow-hidden">
      {/* Grid tech de fondo */}
      <div className="absolute inset-0 bg-tech-grid-dark opacity-20 pointer-events-none" />
      {/* Glow central */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-[600px] rounded-full bg-[#1e6cff]/8 blur-[100px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="text-center mb-10">
          <p className="font-mono text-xs uppercase tracking-widest text-[#1e6cff] mb-1">
            — En números
          </p>
          <h2 className="font-display text-3xl font-black text-white sm:text-4xl">
            LA CONFIANZA DE NUESTROS CLIENTES
          </h2>
        </div>

        {/* Grid de stats con divisores */}
        <div className="grid grid-cols-2 gap-px lg:grid-cols-4 bg-zinc-800 rounded-sm overflow-hidden ring-1 ring-zinc-800">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="group bg-[#0a0f1a] px-6 py-10 text-center transition-colors hover:bg-zinc-900"
            >
              <p className="font-display text-5xl font-black bg-gradient-to-r from-[#4d8dff] to-[#7e4dff] bg-clip-text text-transparent sm:text-6xl">
                <Counter end={s.num} suffix={s.suffix} />
              </p>
              <p className="mt-3 font-bold text-white text-sm uppercase tracking-wide">
                {s.label}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
