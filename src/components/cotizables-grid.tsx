import Link from "next/link";
import { MessageCircle, Package } from "lucide-react";
import type { ResultadoLista } from "@/lib/buscador-listas";

/** Tarjetas de /tienda?q= para lo que está en las listas de proveedor: sin precio,
 *  con "Cotizar ahora", que abre a Andrea con el producto ya cargado. */
export function CotizablesGrid({ resultados, conTitulo }: { resultados: ResultadoLista[]; conTitulo: boolean }) {
  if (resultados.length === 0) return null;
  return (
    <section className={conTitulo ? "mt-12" : ""}>
      {conTitulo && (
        <div className="mb-5">
          <h2 className="font-display text-lg font-bold text-zinc-900">También te lo cotizamos</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Disponibles bajo pedido. Andrea te confirma precio y tiempo de entrega en un momento.
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {resultados.map((r) => (
          <Link
            key={r.clave}
            href={r.cotizar}
            className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-inset ring-zinc-200
                       transition-all duration-200 hover:-translate-y-1 hover:ring-[#1e6cff]/40
                       hover:shadow-[0_8px_30px_rgba(30,108,255,0.10)]"
          >
            <div className="flex h-24 items-center justify-center border-b border-zinc-100 bg-zinc-50/60">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#1e6cff]/15 bg-[#1e6cff]/[0.06]">
                <Package className="h-6 w-6 text-[#1e6cff]" />
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-between gap-3 p-4">
              <div>
                {r.marca && (
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">{r.marca}</p>
                )}
                <h3 className="line-clamp-3 text-sm font-bold leading-snug text-zinc-900 transition-colors group-hover:text-[#1e6cff]">
                  {r.nombre}
                </h3>
              </div>
              <span className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1e6cff] px-3 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-[#1858d6]">
                <MessageCircle className="h-4 w-4" />
                Cotizar ahora
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
