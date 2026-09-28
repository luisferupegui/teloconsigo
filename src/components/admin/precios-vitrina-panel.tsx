"use client";

import { useCallback, useRef, useState } from "react";
import { TrendingUp, Loader2, AlertTriangle, PhoneCall } from "lucide-react";

// ─── Revisión de precios de la vitrina ────────────────────────────────────────
//
// El dólar se mueve, los costos de las listas se mueven con él, y el precio impreso en una
// card no se mueve solo. Esta pantalla le pregunta a Andrea —por su camino de verdad, el
// mismo que recorre un cliente que pincha la card— cuánto cotiza hoy cada una, y lo pone al
// lado de lo publicado.
//
// EL BUCLE LO LLEVA EL NAVEGADOR, una card por petición. Cotizar veinte lleva varios
// minutos, así que se ve avanzar, se puede parar a la mitad y lo ya revisado se queda en
// pantalla. Si fuera una sola petición, el admin miraría una rueda girando sin saber si
// sigue viva.
//
// Y NADA SE GUARDA SOLO. Un precio de una card es una decisión comercial: la pantalla
// propone, marca lo que se salió de rango y espera. Las diferencias pequeñas ni se marcan
// —el ruido del mercado no es un cambio de precio—, y las cards que Andrea no logra cotizar
// no se tocan: ahí el problema no es el precio.

type Card = { referencia: string; nombre: string; seccion: "destacado" | "accesorio"; publicado: number | null };
type Resultado = {
  cotizado: number | null;
  precios: number[];
  entrega: string | null;
  deriva: boolean;
  error?: string;
};

/** Desde cuánto se considera que el precio se movió de verdad. Por debajo es ruido del
 *  mercado: una tienda con una oferta de fin de semana no cambia lo que vale la card. */
const DIFERENCIA_QUE_IMPORTA = 10;

const cop = (n: number) => "$" + new Intl.NumberFormat("es-CO").format(n);

export function PreciosVitrinaPanel({ flash }: { flash: (ok: boolean, msg: string) => void }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [res, setRes] = useState<Record<string, Resultado>>({});
  const [revisando, setRevisando] = useState(false);
  const [hechas, setHechas] = useState(0);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState(false);
  const parar = useRef(false);

  const revisar = useCallback(async () => {
    parar.current = false;
    setRevisando(true);
    setRes({});
    setMarcadas(new Set());
    setHechas(0);
    try {
      const r = await fetch("/api/admin/precios-vitrina");
      const d = await r.json();
      if (!r.ok) { flash(false, d.error ?? "No se pudo leer la vitrina"); return; }
      const lista: Card[] = d.cards ?? [];
      setCards(lista);

      for (const c of lista) {
        if (parar.current) break;
        try {
          const rr = await fetch("/api/admin/precios-vitrina", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ referencia: c.referencia }),
          });
          const dd = await rr.json();
          const resultado: Resultado = rr.ok
            ? { cotizado: dd.cotizado ?? null, precios: dd.precios ?? [], entrega: dd.entrega ?? null, deriva: !!dd.deriva }
            : { cotizado: null, precios: [], entrega: null, deriva: false, error: dd.error ?? "falló" };
          setRes((prev) => ({ ...prev, [c.referencia]: resultado }));
          // Se propone cambiar solo lo que se movió de verdad y se pudo cotizar.
          if (resultado.cotizado !== null && c.publicado) {
            const dif = Math.abs((resultado.cotizado - c.publicado) / c.publicado) * 100;
            if (dif > DIFERENCIA_QUE_IMPORTA) {
              setMarcadas((prev) => new Set(prev).add(c.referencia));
            }
          }
        } catch {
          setRes((prev) => ({ ...prev, [c.referencia]: { cotizado: null, precios: [], entrega: null, deriva: false, error: "error de red" } }));
        }
        setHechas((n) => n + 1);
      }
    } catch {
      flash(false, "Error de red");
    } finally {
      setRevisando(false);
    }
  }, [flash]);

  const aplicar = useCallback(async () => {
    const cambios = cards
      .filter((c) => marcadas.has(c.referencia) && res[c.referencia]?.cotizado)
      .map((c) => ({ referencia: c.referencia, precio: res[c.referencia].cotizado as number }));
    if (cambios.length === 0) return;

    setGuardando(true);
    try {
      const r = await fetch("/api/admin/precios-vitrina", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cambios }),
      });
      const d = await r.json();
      if (!r.ok) { flash(false, d.error ?? "No se pudo guardar"); return; }
      flash(true, `Listo: ${d.actualizadas} card(s) con precio nuevo.`);
      setMarcadas(new Set());
    } catch {
      flash(false, "Error de red");
    } finally {
      setGuardando(false);
    }
  }, [cards, marcadas, res, flash]);

  const alternar = (ref: string) =>
    setMarcadas((prev) => {
      const s = new Set(prev);
      if (s.has(ref)) s.delete(ref); else s.add(ref);
      return s;
    });

  const porAplicar = cards.filter((c) => marcadas.has(c.referencia) && res[c.referencia]?.cotizado).length;
  const conProblema = Object.values(res).filter((r) => r.deriva || (r.cotizado === null && !r.error)).length;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <TrendingUp className="h-5 w-5 shrink-0 mt-0.5 text-zinc-500" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zinc-900">Revisar precios de la vitrina</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Le pide a Andrea una cotización de cada card del home —destacados y accesorios— por el mismo
            camino que recorre un cliente que la pincha, y la compara con el precio publicado. Sirve para
            poner los precios al día cuando se mueve el dólar, y además delata las cards que Andrea no logra
            cotizar: esas derivan al cliente al teléfono, que es una venta que no se cierra.
            <br />
            <span className="text-zinc-400">
              Cada card se vuelve a cotizar desde cero, ignorando lo que hubiera guardado: por eso tarda
              unos minutos y consume créditos de Serper. Nada se guarda hasta que apruebes los cambios.
            </span>
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={revisar}
              disabled={revisando || guardando}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {revisando ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Cotizando {hechas + 1} de {cards.length}…</span> : "Revisar precios"}
            </button>

            {revisando && (
              <button
                onClick={() => { parar.current = true; }}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
              >
                Detener
              </button>
            )}

            {!revisando && porAplicar > 0 && (
              <button
                onClick={aplicar}
                disabled={guardando}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
              >
                {guardando ? "Guardando…" : `Aplicar ${porAplicar} precio(s)`}
              </button>
            )}
          </div>

          {conProblema > 0 && !revisando && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {conProblema} card(s) sin precio: Andrea no las cotiza y manda al cliente al teléfono. Eso no
              se arregla cambiando el precio — revisa que el producto esté en una lista activa o que su
              nombre traiga la referencia del fabricante.
            </p>
          )}

          {cards.length > 0 && (
            <div className="mt-4 -mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="text-zinc-400">
                  <tr>
                    <th className="w-8 pb-2" />
                    <th className="pb-2 font-semibold">Card</th>
                    <th className="pb-2 pl-4 text-right font-semibold">Publicado</th>
                    <th className="pb-2 pl-4 text-right font-semibold whitespace-nowrap">Cotiza hoy</th>
                    <th className="pb-2 pl-4 text-right font-semibold">Dif.</th>
                    <th className="pb-2 pl-3 font-semibold">Entrega</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {cards.map((c) => {
                    const r = res[c.referencia];
                    const dif = r?.cotizado && c.publicado
                      ? Math.round(((r.cotizado - c.publicado) / c.publicado) * 100)
                      : null;
                    const grave = dif !== null && Math.abs(dif) > 25;
                    const mueve = dif !== null && Math.abs(dif) > DIFERENCIA_QUE_IMPORTA;
                    return (
                      <tr key={c.referencia} className="align-top">
                        <td className="py-2">
                          {r?.cotizado != null && (
                            <input
                              type="checkbox"
                              checked={marcadas.has(c.referencia)}
                              onChange={() => alternar(c.referencia)}
                              className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-300"
                              aria-label={`Actualizar el precio de ${c.nombre}`}
                            />
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <span className="text-zinc-900">{c.nombre}</span>
                          <span className="ml-2 text-zinc-400">
                            {c.seccion === "destacado" ? "destacado" : "accesorio"}
                          </span>
                        </td>
                        <td className="py-2 pl-4 text-right tabular-nums whitespace-nowrap text-zinc-600">
                          {c.publicado ? cop(c.publicado) : "—"}
                        </td>
                        <td className="py-2 pl-4 text-right tabular-nums whitespace-nowrap text-zinc-900">
                          {!r ? <span className="text-zinc-300">·</span>
                            : r.error ? <span className="text-red-600">{r.error}</span>
                            : r.deriva ? <span className="flex items-center justify-end gap-1 text-amber-700"><PhoneCall className="h-3 w-3" />deriva al equipo</span>
                            : r.cotizado ? cop(r.cotizado)
                            : <span className="text-amber-700">sin precio</span>}
                        </td>
                        <td className={`py-2 pl-4 text-right tabular-nums font-semibold ${
                          dif === null ? "text-zinc-300" : grave ? "text-red-600" : mueve ? "text-amber-600" : "text-emerald-600"
                        }`}>
                          {dif === null ? "" : `${dif > 0 ? "+" : ""}${dif}%`}
                        </td>
                        <td className="py-2 pl-3 text-zinc-500">{r?.entrega ?? ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
