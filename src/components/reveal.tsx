"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

/**
 * Reveal — animación de entrada al hacer scroll.
 *
 * Estrategia:
 * 1. SSR y primer render → shown=true (visible siempre, sin flash de contenido).
 * 2. Tras hidratación, si el elemento ya está en pantalla → se queda visible.
 * 3. Si está bajo el fold → se pone invisible y anima al entrar al viewport.
 * 4. Esto garantiza que en móvil (donde el IO puede fallar) las cards
 *    del primer render son siempre visibles.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(true); // visible por defecto (SSR-safe)

  useEffect(() => {
    if (!ref.current) return;

    const rect   = ref.current.getBoundingClientRect();
    const inView = rect.top < window.innerHeight + 80;

    // Si ya está visible en pantalla → no hace falta animación
    if (inView) return;

    // Está bajo el fold → animar al entrar
    setShown(false);

    const d = delay;
    // Fallback por si el IO no dispara (iOS Safari, webview)
    const fallback = setTimeout(() => setShown(true), 800 + d);

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          clearTimeout(fallback);
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0, rootMargin: "60px 0px 60px 0px" },
    );
    obs.observe(ref.current);
    return () => { obs.disconnect(); clearTimeout(fallback); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={`transition-all duration-700 ease-out ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  );
}
