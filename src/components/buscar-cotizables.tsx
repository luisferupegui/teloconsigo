"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle, Package } from "lucide-react";

// ─── Lo que el buscador encuentra en las listas de proveedor ─────────────────
//
// Sin precio y con "Cotizar ahora": la cotización la hace Andrea con la lista
// vigente al momento de preguntar (ver lib/buscador-listas). Lo usan el
// autocompletado del navbar y el buscador del móvil.

export type Cotizable = { clave: string; nombre: string; marca: string; cotizar: string };

/** Resultados de las listas para lo que se va escribiendo. Espera a que se deje
 *  de teclear un momento y descarta la respuesta de una búsqueda ya vieja: sin
 *  eso, "rtx 5060" podía quedar mostrando lo que llegó tarde de "rt". */
export function useCotizables(q: string, limite = 5): Cotizable[] {
  const [resultados, setResultados] = useState<Cotizable[]>([]);
  const consulta = q.trim();

  useEffect(() => {
    if (consulta.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/buscar?q=${encodeURIComponent(consulta)}&limite=${limite}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { resultados: [] }))
        .then((d: { resultados?: Cotizable[] }) => setResultados(d.resultados ?? []))
        .catch(() => { /* búsqueda abortada o sin red: se queda lo anterior */ });
    }, 220);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [consulta, limite]);

  // Con menos de dos letras no se busca, y lo de una búsqueda anterior no se muestra.
  return consulta.length < 2 ? [] : resultados;
}

/** Filas del desplegable oscuro del buscador. */
export function FilasCotizables({
  resultados,
  alElegir,
}: {
  resultados: Cotizable[];
  alElegir?: () => void;
}) {
  if (resultados.length === 0) return null;
  return (
    <div className="border-t border-white/10 pt-1.5 first:border-t-0 first:pt-0">
      <p className="px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Te lo cotizamos
      </p>
      {resultados.map((r) => (
        <Link
          key={r.clave}
          href={r.cotizar}
          onClick={alElegir}
          className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-white/5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5">
            <Package className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="min-w-0 flex-1">
            {r.marca && <p className="truncate text-[10px] uppercase tracking-wider text-zinc-500">{r.marca}</p>}
            <p className="truncate text-sm text-white">{r.nombre}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#1e6cff]/40 px-2.5 py-1 text-xs font-semibold text-[#4d8dff] transition group-hover:border-[#1e6cff] group-hover:bg-[#1e6cff] group-hover:text-white">
            <MessageCircle className="h-3.5 w-3.5" />
            Cotizar
          </span>
        </Link>
      ))}
    </div>
  );
}
