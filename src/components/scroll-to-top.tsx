"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Fuerza el scroll al inicio (top: 0) cada vez que cambia la ruta.
 * Necesario porque `scroll-behavior: smooth` en html interfiere con el
 * scroll automático que Next.js intenta hacer en cada navegación.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
