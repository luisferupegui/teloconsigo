"use client";

import { useState } from "react";
import { ArrowDownUp } from "lucide-react";
import type { BusinessProduct } from "@/lib/products-types";
import { BusinessProductCard } from "@/components/business-product-card";

// ─── Ordenar dentro de la sección ────────────────────────────────────────────
//
// Las ocho cards salen en escalera de precio a propósito: de entrada, de medio
// y de gama alta, para que el cliente compare en vez de ver ocho equipos casi
// iguales. Ese es el orden con el que conviene que ENTRE.
//
// Pero quien ya sabe lo que busca no quiere una escalera, quiere lo más barato
// —o lo mejor que pueda pagar— y hasta ahora no había manera de pedirlo: ocho
// cards fijas y sin control. Esto no cambia qué se enseña, sólo en qué orden,
// y del lado del cliente, así que no cuesta una recarga.

type Orden = "sugerido" | "barato" | "caro";

const OPCIONES: { valor: Orden; texto: string }[] = [
  { valor: "sugerido", texto: "Sugerido" },
  { valor: "barato", texto: "Menor precio" },
  { valor: "caro", texto: "Mayor precio" },
];

const precioDe = (p: BusinessProduct) => p.precioDesde ?? p.precio ?? Infinity;

export function RejillaOrdenable({
  products,
  variant = "asesor",
}: {
  products: BusinessProduct[];
  variant?: "conseguir" | "asesor";
}) {
  const [orden, setOrden] = useState<Orden>("sugerido");

  // Con dos cards no hay nada que ordenar; el control sólo estorbaría.
  const ordenables = products.length > 2;

  const lista =
    orden === "sugerido"
      ? products
      : [...products].sort((a, b) =>
          orden === "barato" ? precioDe(a) - precioDe(b) : precioDe(b) - precioDe(a),
        );

  return (
    <>
      {ordenables && (
        <div className="mb-4 flex items-center justify-end gap-2">
          <ArrowDownUp className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
          <label className="text-xs font-medium text-zinc-500" htmlFor={`orden-${products[0]?.referencia ?? "s"}`}>
            Ordenar
          </label>
          <select
            id={`orden-${products[0]?.referencia ?? "s"}`}
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs
                       font-semibold text-zinc-700 transition hover:border-zinc-300
                       focus:border-[#1e6cff] focus:outline-none"
          >
            {OPCIONES.map((o) => (
              <option key={o.valor} value={o.valor}>{o.texto}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {lista.map((p) => (
          <BusinessProductCard key={p.referencia ?? p.slug ?? p.id} product={p} variant={variant} />
        ))}
      </div>
    </>
  );
}
