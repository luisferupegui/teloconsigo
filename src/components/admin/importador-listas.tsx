"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Upload, Loader2, AlertTriangle, CheckCircle2, FileText, Cpu, EyeOff, X, Save, ArrowRight,
} from "lucide-react";
import type { CatimporterProduct } from "@/lib/catimporter/types/product";

// ─── Importador de listas ────────────────────────────────────────────────────
//
// Un solo sitio para las tres formas en que llega una lista de proveedor: PDF,
// Word y Excel. Antes eran tres pestañas distintas —"Listas Word/Excel",
// "Listas PDF" y "Catimporter"— y había que saber de antemano cuál usar según la
// extensión del archivo, aunque para quien importa es siempre la misma tarea.
//
// Se importa en DOS PASOS, y esa es la diferencia de fondo con los importadores
// anteriores:
//
//   1. ANALIZAR — se lee el archivo y se muestra qué entendió: con qué motor,
//      cuántos productos, cuáles necesitan revisión y qué bloques del documento
//      no llegaron a producto. No se guarda nada.
//   2. GUARDAR — solo si lo que se ve está bien.
//
// Los dos importadores viejos guardaban directamente. Cuando un lector se
// equivocaba, el error ya estaba dentro del catálogo y la única salida era
// borrar la lista entera y volver a subirla.

type Descartado = { referencia: string; motivo: string };

type Aviso = {
  tipo: "sin-precio" | "salto-de-precio";
  nombre: string;
  referencia: string;
  precio: number;
  precioAnterior?: number;
  diferencia?: number;
  porcentaje?: number;
  sospechoso?: boolean;
  listaAnterior?: string;
};

type Analisis = {
  motor: string;
  count: number;
  reviewCount: number;
  products: CatimporterProduct[];
  descartados: Descartado[];
  avisos: Aviso[];
};

/** Proveedores ya conocidos, como atajo. El campo es libre a propósito: sumar un
 *  proveedor nuevo no debería obligar a tocar código. */
const PROVEEDORES = ["ledacom", "infoshopcorp", "janus", "compumax", "compuoriente"];

const cop = (n: number) => (n > 0 ? "$" + n.toLocaleString("es-CO") : "—");

const formatoDe = (nombre: string) =>
  /\.pdf$/i.test(nombre) ? "PDF" : /\.docx$/i.test(nombre) ? "Word" : "Excel";

function Stat({ label, value, tono = "normal" }: {
  label: string; value: number; tono?: "normal" | "bien" | "aviso" | "apagado";
}) {
  const color =
    tono === "bien" ? "text-emerald-600"
    : tono === "aviso" ? "text-amber-600"
    : tono === "apagado" ? "text-zinc-400"
    : "text-zinc-900";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

export function ImportadorListas() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [nombre, setNombre] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [aplicarIva, setAplicarIva] = useState(false);

  const [analizando, setAnalizando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [datos, setDatos] = useState<Analisis | null>(null);
  const [guardado, setGuardado] = useState<{ count: number; omitidos: number } | null>(null);
  const [soloRevision, setSoloRevision] = useState(false);

  function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (inputRef.current) inputRef.current.value = "";
    if (!f) return;
    setArchivo(f);
    setNombre(f.name.replace(/\.(pdf|docx|xlsx)$/i, ""));
    setDatos(null); setGuardado(null); setError("");
  }

  function limpiar() {
    setArchivo(null); setNombre(""); setDatos(null); setGuardado(null); setError("");
  }

  async function analizar() {
    if (!archivo) return;
    setAnalizando(true); setError(""); setDatos(null); setGuardado(null);
    try {
      const fd = new FormData();
      fd.append("file", archivo);
      fd.append("proveedor", proveedor.trim());
      fd.append("aplicarIva", String(aplicarIva));
      const res = await fetch("/api/admin/importador/analizar", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "No se pudo leer la lista");
      setDatos(d as Analisis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al analizar");
    } finally {
      setAnalizando(false);
    }
  }

  async function guardar() {
    if (!datos) return;
    setGuardando(true); setError("");
    try {
      const res = await fetch("/api/admin/importador/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim() || archivo?.name || "Lista sin nombre",
          proveedor: proveedor.trim(),
          productos: datos.products,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "No se pudo guardar la lista");
      setGuardado({ count: d.count ?? 0, omitidos: d.omitidos ?? 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  const visibles = datos ? (soloRevision ? datos.products.filter((p) => p.requiresReview) : datos.products) : [];

  return (
    <div className="space-y-6">
      {/* ── Paso 1: el archivo ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900">Importar una lista de proveedor</h2>
        <p className="mt-1 text-sm text-zinc-500">
          PDF, Word o Excel — el mismo importador para los tres. Primero se lee y se muestra
          lo que entendió; <strong>no entra nada al catálogo hasta que lo apruebes</strong>.
        </p>

        {!archivo ? (
          <div
            onClick={() => inputRef.current?.click()}
            className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-14 transition hover:border-indigo-400 hover:bg-indigo-50/30"
          >
            <FileText className="h-12 w-12 text-zinc-300" />
            <div className="text-center">
              <p className="text-sm font-bold text-zinc-700">Subir lista de precios</p>
              <p className="mt-1 text-xs text-zinc-400">
                <strong>.pdf</strong> · <strong>.docx</strong> · <strong>.xlsx</strong> — lectura directa, sin IA · Máx. 50 MB
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">
              <Upload className="h-4 w-4" /> Seleccionar archivo
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-zinc-900">
                <FileText className="mr-1.5 inline h-4 w-4 text-indigo-500" />
                {archivo.name}
                <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
                  {formatoDe(archivo.name)}
                </span>
              </p>
              <button
                type="button" onClick={limpiar}
                className="flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-500 transition hover:border-red-300 hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" /> Cargar otro
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Nombre de la lista</span>
                <input
                  value={nombre} onChange={(e) => setNombre(e.target.value)}
                  placeholder="Lista Ledacom Agosto 2026"
                  className="w-64 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Proveedor</span>
                <input
                  list="proveedores-importador"
                  value={proveedor} onChange={(e) => setProveedor(e.target.value)}
                  placeholder="Nombre del proveedor"
                  className="w-52 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                />
                <datalist id="proveedores-importador">
                  {PROVEEDORES.map((p) => <option key={p} value={p} />)}
                </datalist>
              </label>

              <button
                type="button" disabled={analizando} onClick={analizar}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {analizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {analizando ? "Leyendo…" : "Analizar"}
              </button>
            </div>

            {/* Solo tiene sentido en PDF: es el formato en el que algunos proveedores
                cotizan sin impuesto por encima de cierto valor. */}
            {formatoDe(archivo.name) === "PDF" && (
              <label className="mt-3 flex items-start gap-2 text-xs text-zinc-500">
                <input
                  type="checkbox" checked={aplicarIva}
                  onChange={(e) => setAplicarIva(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <strong className="text-zinc-700">Sumar IVA a los precios sin impuesto.</strong>{" "}
                  Algunos proveedores cotizan sin IVA los equipos por encima de cierto valor.
                </span>
              </label>
            )}

            {analizando && (
              <p className="mt-3 text-xs text-zinc-400">
                Los PDF grandes tardan entre 10 y 40 segundos: se leen página por página.
              </p>
            )}
          </div>
        )}

        <input ref={inputRef} type="file" hidden accept=".pdf,.docx,.xlsx" onChange={elegir} />
        {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      </div>

      {datos && (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm">
            <Cpu className="h-4 w-4 shrink-0 text-indigo-600" />
            <span className="text-indigo-900">
              Leída con el motor <strong>{datos.motor}</strong>
              {datos.motor.startsWith("Genérico") && " — el catálogo no se reconoció y se usó el lector general"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Productos leídos" value={datos.count} />
            <Stat label="Listos" value={datos.count - datos.reviewCount} tono="bien" />
            <Stat label="Requieren revisión" value={datos.reviewCount} tono="aviso" />
            <Stat label="Bloques descartados" value={datos.descartados.length} tono="apagado" />
          </div>

          {/* ── Qué mirar antes de guardar ──
              Revisar 580 productos no se hace, y no hace falta: el riesgo no
              está repartido. En la lista de Ledacom, los diez productos que
              más subieron concentran el 72% de la diferencia total. Por eso
              esto va ordenado POR PESOS y no por porcentaje ni por cantidad. */}
          {datos.avisos?.length > 0 && !guardado && (
            <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60">
              <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 px-5 py-4">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <h3 className="font-bold text-amber-900">Revisa esto antes de guardar</h3>
                <span className="text-xs text-amber-700">
                  · {datos.avisos.length} de {datos.count}, ordenados por lo que cuesta equivocarse
                </span>
              </div>
              <div className="max-h-80 divide-y divide-amber-200/70 overflow-y-auto">
                {datos.avisos.map((a, i) => (
                  <div key={`${a.referencia}-${i}`} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm">
                    {a.tipo === "sin-precio" ? (
                      <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                        Sin precio
                      </span>
                    ) : (
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        a.sospechoso ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                        {a.sospechoso ? "Salto raro" : "Cambió"} {(a.porcentaje ?? 0) > 0 ? "+" : ""}
                        {Math.round((a.porcentaje ?? 0) * 100)}%
                      </span>
                    )}
                    <span className="min-w-[200px] flex-1 text-zinc-800">
                      {a.nombre}
                      {a.referencia && <span className="ml-2 font-mono text-[11px] text-zinc-400">{a.referencia}</span>}
                    </span>
                    {a.tipo === "salto-de-precio" && (
                      <span className="shrink-0 text-xs text-zinc-500">
                        {cop(a.precioAnterior ?? 0)} → <strong className="text-zinc-900">{cop(a.precio)}</strong>
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="border-t border-amber-200 px-5 py-3 text-xs text-amber-800">
                Los <strong>saltos raros</strong> suelen ser un error de lectura, no una subida: vale la pena
                mirarlos contra el PDF. Los <strong>sin precio</strong> vienen así porque el proveedor los
                imprime dentro de una imagen — pídeselos y complétalos a mano después de guardar.
              </p>
            </div>
          )}

          {/* ── Paso 2: guardar ── */}
          {guardado ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-900">
                Lista guardada: {guardado.count} productos en el catálogo.
                {guardado.omitidos > 0 && (
                  <span className="font-normal"> {guardado.omitidos} se omitieron por no tener nombre o precio.</span>
                )}
              </p>
              <Link
                href="/admin/marketing?tab=listas"
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Ver listas cargadas <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-zinc-600">
                Si lo de abajo se ve bien, guarda la lista en el catálogo como
                <strong className="text-zinc-900"> {nombre.trim() || archivo?.name}</strong>
                {proveedor.trim() && <> · proveedor <strong className="text-zinc-900">{proveedor.trim().toLowerCase()}</strong></>}
              </p>
              <button
                type="button" disabled={guardando} onClick={guardar}
                className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
              >
                {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {guardando ? "Guardando…" : `Guardar ${datos.count} productos`}
              </button>
            </div>
          )}

          {/* Productos */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
              <h3 className="font-bold text-zinc-900">Productos</h3>
              {datos.reviewCount > 0 && (
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-600">
                  <input type="checkbox" checked={soloRevision} onChange={(e) => setSoloRevision(e.target.checked)} />
                  Ver solo los que requieren revisión
                </label>
              )}
            </div>
            <div className="max-h-[520px] divide-y divide-zinc-100 overflow-y-auto">
              {visibles.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-zinc-50/70">
                  <span className="w-24 shrink-0 font-mono text-[11px] text-zinc-400">{p.internalCode}</span>
                  <div className="min-w-[240px] flex-1">
                    <p className="text-sm font-semibold text-zinc-900">{p.nombre}</p>
                    <p className="text-xs text-zinc-500">
                      {p.marca} · {p.categoria}
                      {p.supplierCode && <> · ref <span className="font-mono">{p.supplierCode}</span></>}
                    </p>
                    {p.warnings.length > 0 && (
                      <p className="mt-0.5 text-[11px] text-amber-700">{p.warnings.join(" · ")}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-sm font-bold ${p.precio_costo > 0 ? "text-zinc-900" : "text-amber-600"}`}>
                    {cop(p.precio_costo)}
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    p.requiresReview ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {p.requiresReview
                      ? <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                      : <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
                    {p.confidence}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Descartados: lo que el documento traía y no llegó a producto */}
          {datos.descartados.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-5 py-4">
                <EyeOff className="h-4 w-4 text-zinc-400" />
                <h3 className="font-bold text-zinc-900">Bloques descartados</h3>
                <span className="text-xs text-zinc-500">
                  · estaban en el documento y no llegaron a producto. Se listan para poder revisarlos contra el original.
                </span>
              </div>
              <div className="max-h-72 divide-y divide-zinc-100 overflow-y-auto">
                {datos.descartados.map((d, i) => (
                  <div key={`${d.referencia}-${i}`} className="flex items-center gap-4 px-5 py-2 text-sm">
                    <span className="w-40 shrink-0 font-mono text-xs text-zinc-500">{d.referencia}</span>
                    <span className="text-zinc-600">{d.motivo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
