"use client";

import { useEffect, useState } from "react";
import { Truck, ShieldCheck, Headphones, Zap, Gift } from "lucide-react";

const promos = [
  { icon: Truck, text: "Envíos a todo el país" },
  { icon: ShieldCheck, text: "Productos originales y garantizados" },
  { icon: Headphones, text: "Atención personalizada" },
  { icon: Gift, text: "Envío GRATIS en pedidos sobre $500.000" },
  { icon: Zap, text: "🔥 Hasta 30% OFF en periféricos esta semana" },
];

export function PromoBanner() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % promos.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative bg-[#1e6cff] text-white text-xs overflow-hidden">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="relative h-5 w-full max-w-md flex items-center justify-center">
          {promos.map((p, i) => {
            const Icon = p.icon;
            return (
              <span
                key={i}
                className={`absolute inset-0 flex items-center justify-center gap-2 transition-all duration-500 ${
                  i === idx
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 -translate-y-2 pointer-events-none"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{p.text}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
