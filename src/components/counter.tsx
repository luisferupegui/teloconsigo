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

export function StatsSection() {
  return (
    <section className="bg-gradient-to-br from-[#0d1e3a] via-[#13294b] to-[#0d1e3a] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {[
            { num: 1500, suffix: "+", label: "Clientes felices" },
            { num: 200, suffix: "+", label: "Productos en catálogo" },
            { num: 50, suffix: "+", label: "Marcas oficiales" },
            { num: 100, suffix: "%", label: "Garantía oficial" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-4xl font-bold bg-gradient-to-r from-[#4d8dff] to-[#7eb0ff] bg-clip-text text-transparent sm:text-5xl">
                <Counter end={s.num} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-sm text-zinc-300">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
