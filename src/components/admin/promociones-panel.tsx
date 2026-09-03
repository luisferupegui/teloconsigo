"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw, Loader2, TrendingUp, TrendingDown, PackageX, CheckCircle2, AlertCircle, Sparkles,
} from "lucide-react";

// ─── Sincronizar la vitrina con las listas del mes ───────────────────────────
//
// La página de promociones se llenó una vez y se quedó quieta. Cuando se midió
// por primera vez, de los 65 productos que estaban en promoción NINGUNO era
// correcto: 45 ya no existían en ninguna lista y los otros 20 estaban a un
// precio distinto del real.
//
// Y no es cosmético: el Dell Inspiron 5440 se ofrecía a $3.934.000 cuando el
// costo del mes lo pone en $4.919.000 — cada venta perdía $985.000. Otro estaba
// un millón por encima del precio real, o sea invendible.
//
// Esta pantalla no elige productos ni adivina: compara lo publicado contra las
// listas vigentes y muestra qué cambió. Aplicar es un acto aparte, y son dos
// decisiones distintas —cambiar precios y retirar productos— así que van en dos
// botones y no en uno.

type Repreciar = {
  referencia: string; nombre: string;
  precioActual: number; precioNuevo: number; diferencia: number;
  proveedor: string; lista: string;
};
type Descatalogado = { referencia: string; nombre: string; precioActual: number };

type Candidato = {
  referencia: string; nombre: string; marca: string; categoria: string;
  proveedor: string; precioCosto: number; precioVenta: number;
  tramo: string; porque: string;
};
type PropuestaSeccion = {
  id: string; nombre: string; publicados: number; faltan: number;
  candidatos: Candidato[]; disponibles: number;
};

type Analisis = {
  enPromocion: number;
  repreciar: Repreciar[];
  descatalogados: Descatalogado[];
  sinReferencia: number;
  alDia: number;
  relleno: PropuestaSeccion[];
};

const cop = (n: number) => (n > 0 ? "$" + n.toLocaleString("es-CO") : "—");

function Stat({ label, value, tono }: { label: string; value: number; tono: "normal" | "aviso" | "malo" | "bien" }) {
  const color = { normal: "text-zinc-900", aviso: "text-amber-600", malo: "text-red-600", bien: "text-emerald-600" }[tono];
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

export function PromocionesPanel() {
  const [datos, setDatos] = useState<Analisis | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aplicando, setAplicando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState("");
  // Todo marcado de entrada: lo normal es querer aplicarlo entero, y quitar
  // alguna casilla cuesta menos que marcar cuarenta y cinco.
  const [precios, setPrecios] = useState<Set<string>>(new Set());
  const [retirar, setRetirar] = useState<Set<string>>(new Set());
  const [aRellenar, setARellenar] = useState<Record<string, Set<string>>>({});

  // La petición va aparte de los `setState` para que el efecto no toque estado
  // de forma síncrona: hacerlo encadena renders y es lo que avisa
  // react-hooks/set-state-in-effect.
  const pedirAnalisis = useCallback(async (): Promise<Analisis> => {
    const res = await fetch("/api/admin/promociones");
    const d = await res.json();
    if (!res.ok) throw new Error(d.error ?? "No se pudo analizar");
    return d as Analisis;
  }, []);

  const recibir = useCallback((d: Analisis) => {
    setDatos(d);
    setPrecios(new Set(d.repreciar.map((r) => r.referencia)));
    setRetirar(new Set(d.descatalogados.map((r) => r.referencia)));
    setARellenar(Object.fromEntries(d.relleno.map((s) => [s.id, new Set(s.candidatos.map((c) => c.referencia))])));
  }, []);

  /** Recarga desde un manejador de evento (el botón "Volver a mirar"). */
  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try {
      recibir(await pedirAnalisis());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [pedirAnalisis, recibir]);

  useEffect(() => {
    let vivo = true;
    // El `await` va antes que cualquier `setState`, y el testigo evita escribir
    // estado si la pestaña se cambió mientras llegaba la respuesta.
    (async () => {
      try {
        const d = await pedirAnalisis();
        if (vivo) recibir(d);
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, [pedirAnalisis, recibir]);

  async function aplicar(accion: "actualizarPrecios" | "quitarDePromocion") {
    const refs = [...(accion === "actualizarPrecios" ? precios : retirar)];
    if (refs.length === 0) return;
    setAplicando(accion === "actualizarPrecios" ? "precios" : "retirar");
    setError(""); setHecho("");
    try {
      const res = await fetch("/api/admin/promociones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, referencias: refs }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "No se pudo aplicar");
      setHecho(
        accion === "actualizarPrecios"
          ? `${d.actualizados} precios actualizados`
          : `${d.retirados} productos fuera de promociones`,
      );
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setAplicando(null);
    }
  }

  const alternar = (set: Set<string>, fijar: (s: Set<string>) => void, ref: string) => {
    const copia = new Set(set);
    if (copia.has(ref)) copia.delete(ref); else copia.add(ref);
    fijar(copia);
  };

  const alternarRelleno = (seccion: string, ref: string) =>
    setARellenar((prev) => {
      const copia = new Set(prev[seccion] ?? []);
      if (copia.has(ref)) copia.delete(ref); else copia.add(ref);
      return { ...prev, [seccion]: copia };
    });

  async function publicarSeccion(seccion: string) {
    const refs = [...(aRellenar[seccion] ?? [])];
    if (refs.length === 0) return;
    setAplicando(seccion); setError(""); setHecho("");
    try {
      const res = await fetch("/api/admin/promociones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "publicar", seccion, referencias: refs }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "No se pudo publicar");
      setHecho(`${d.publicados} productos publicados en la vitrina`);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setAplicando(null);
    }
  }

  if (cargando && !datos) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-8 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Comparando la vitrina con las listas vigentes…
      </div>
    );
  }

  const enJuego = datos?.repreciar.reduce((a, r) => a + Math.abs(r.diferencia), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Promociones al día</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Compara lo que hay publicado con las listas vigentes. Aquí{" "}
              <strong>solo se mira</strong>: cada cambio se aplica cuando tú lo apruebas.
            </p>
          </div>
          <button
            type="button" onClick={cargar} disabled={cargando}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} /> Volver a mirar
          </button>
        </div>

        {datos && (
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <Stat label="En promoción" value={datos.enPromocion} tono="normal" />
            <Stat label="Precio desactualizado" value={datos.repreciar.length} tono="aviso" />
            <Stat label="Ya no están en listas" value={datos.descatalogados.length} tono="malo" />
            <Stat label="Correctos" value={datos.alDia} tono="bien" />
          </div>
        )}

        {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        {hecho && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> {hecho}
          </p>
        )}
      </div>

      {/* ── Precios que ya no son los del mes ── */}
      {datos && datos.repreciar.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/50">
          <div className="flex flex-wrap items-center gap-3 border-b border-amber-200 px-5 py-4">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <div className="min-w-[220px] flex-1">
              <h3 className="font-bold text-amber-900">Precios desactualizados</h3>
              <p className="text-xs text-amber-800">
                {cop(enJuego)} de diferencia acumulada. Ordenados por lo que cuesta equivocarse.
              </p>
            </div>
            <button
              type="button" onClick={() => aplicar("actualizarPrecios")}
              disabled={aplicando !== null || precios.size === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {aplicando === "precios" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar {precios.size} precios
            </button>
          </div>
          <div className="max-h-96 divide-y divide-amber-200/70 overflow-y-auto">
            {datos.repreciar.map((r) => (
              <label key={r.referencia} className="flex cursor-pointer items-center gap-3 px-5 py-2.5 text-sm hover:bg-amber-100/40">
                <input
                  type="checkbox" checked={precios.has(r.referencia)}
                  onChange={() => alternar(precios, setPrecios, r.referencia)}
                  className="h-3.5 w-3.5 shrink-0 accent-amber-600"
                />
                <span className="min-w-[200px] flex-1 text-zinc-800">
                  {r.nombre}
                  <span className="ml-2 text-[11px] text-zinc-400">{r.proveedor}</span>
                </span>
                <span className="shrink-0 text-xs text-zinc-500">{cop(r.precioActual)}</span>
                <span className={`shrink-0 text-sm font-bold ${r.diferencia > 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {r.diferencia > 0 ? <TrendingUp className="mr-1 inline h-3.5 w-3.5" /> : <TrendingDown className="mr-1 inline h-3.5 w-3.5" />}
                  {cop(r.precioNuevo)}
                </span>
              </label>
            ))}
          </div>
          <p className="border-t border-amber-200 px-5 py-3 text-xs text-amber-800">
            En rojo lo que <strong>subió</strong>: se estaba vendiendo por debajo del costo del mes.
            En verde lo que <strong>bajó</strong>: se estaba ofreciendo más caro de lo necesario.
          </p>
        </div>
      )}

      {/* ── Los que el proveedor ya no trae ── */}
      {datos && datos.descatalogados.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-red-200 bg-red-50/40">
          <div className="flex flex-wrap items-center gap-3 border-b border-red-200 px-5 py-4">
            <PackageX className="h-4 w-4 shrink-0 text-red-500" />
            <div className="min-w-[220px] flex-1">
              <h3 className="font-bold text-red-900">Ya no están en ninguna lista</h3>
              <p className="text-xs text-red-800">
                Se siguen ofreciendo en la web y no hay de dónde traerlos.
              </p>
            </div>
            <button
              type="button" onClick={() => aplicar("quitarDePromocion")}
              disabled={aplicando !== null || retirar.size === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {aplicando === "retirar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageX className="h-4 w-4" />}
              Quitar {retirar.size} de promociones
            </button>
          </div>
          <div className="max-h-96 divide-y divide-red-200/70 overflow-y-auto">
            {datos.descatalogados.map((d) => (
              <label key={d.referencia} className="flex cursor-pointer items-center gap-3 px-5 py-2.5 text-sm hover:bg-red-100/40">
                <input
                  type="checkbox" checked={retirar.has(d.referencia)}
                  onChange={() => alternar(retirar, setRetirar, d.referencia)}
                  className="h-3.5 w-3.5 shrink-0 accent-red-600"
                />
                <span className="min-w-[200px] flex-1 text-zinc-800">{d.nombre}</span>
                <span className="shrink-0 font-mono text-[11px] text-zinc-400">{d.referencia}</span>
                <span className="shrink-0 text-sm font-semibold text-zinc-500">{cop(d.precioActual)}</span>
              </label>
            ))}
          </div>
          <p className="border-t border-red-200 px-5 py-3 text-xs text-red-800">
            Quitarlos los saca de la vitrina, <strong>no los borra</strong>: su ficha sigue viva con su
            enlace y su sitio en el buscador, porque un proveedor puede volver a traer el modelo el mes
            que viene. Despublicarlos del todo se hace en Gestionar productos.
          </p>
        </div>
      )}

      {/* ── Secciones a medio llenar ── */}
      {datos && datos.relleno.some((r) => r.candidatos.length > 0) && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 px-5 py-4">
            <h3 className="font-bold text-indigo-900">Secciones con huecos</h3>
            <p className="mt-0.5 text-xs text-indigo-800">
              Cada sección quiere {8} cards. Estas son las mejores candidatas de las listas
              vigentes, repartidas en <strong>escalera de precio</strong> —de entrada, de medio y
              de gama alta— para que el cliente compare en vez de ver ocho equipos casi iguales.
            </p>
          </div>

          {datos.relleno.filter((r) => r.candidatos.length > 0).map((sec) => (
            <div key={sec.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-5 py-4">
                <div className="min-w-[220px] flex-1">
                  <h4 className="font-bold text-zinc-900">{sec.nombre}</h4>
                  <p className="text-xs text-zinc-500">
                    {sec.publicados} de 8 publicadas · {sec.disponibles} candidatas en las listas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => publicarSeccion(sec.id)}
                  disabled={aplicando !== null || (aRellenar[sec.id]?.size ?? 0) === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {aplicando === sec.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Publicar {aRellenar[sec.id]?.size ?? 0}
                </button>
              </div>
              <div className="divide-y divide-zinc-100">
                {sec.candidatos.map((c) => (
                  <label key={c.referencia} className="flex cursor-pointer items-start gap-3 px-5 py-2.5 text-sm hover:bg-zinc-50/70">
                    <input
                      type="checkbox" checked={aRellenar[sec.id]?.has(c.referencia) ?? false}
                      onChange={() => alternarRelleno(sec.id, c.referencia)}
                      className="mt-1 h-3.5 w-3.5 shrink-0 accent-indigo-600"
                    />
                    <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      c.tramo === "entrada" ? "bg-emerald-100 text-emerald-700"
                      : c.tramo === "alto" ? "bg-violet-100 text-violet-700"
                      : "bg-zinc-100 text-zinc-600"}`}>
                      {c.tramo}
                    </span>
                    <span className="min-w-[200px] flex-1">
                      <span className="block text-zinc-900">{c.nombre}</span>
                      <span className="block text-[11px] text-zinc-400">{c.porque}</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-[#1e6cff]">{cop(c.precioVenta)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {datos && datos.repreciar.length === 0 && datos.descatalogados.length === 0 &&
       !datos.relleno.some((r) => r.candidatos.length > 0) && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-semibold text-emerald-900">
            La vitrina está al día con las listas vigentes.
          </p>
        </div>
      )}
    </div>
  );
}
