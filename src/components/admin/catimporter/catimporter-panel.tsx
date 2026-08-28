"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, AlertTriangle, CheckCircle2, FileText, Cpu, EyeOff } from "lucide-react";
import type { CatimporterProduct } from "@/lib/catimporter/types/product";

// ─── Catimporter: leer una lista de proveedor y VERLA antes de guardar nada ──
//
// Esta pantalla es deliberadamente de solo lectura. Sirve para responder una
// pregunta antes de tocar el catálogo: ¿el importador entendió bien esta lista?
//
// Por eso muestra tres cosas que un contador de productos no dice:
//   • qué MOTOR se usó (si el PDF se reconoció o cayó en el lector genérico),
//   • qué productos necesitan REVISIÓN y por qué,
//   • qué bloques del PDF NO llegaron a producto y por qué.
// Un importador que dice "240 productos" sin explicar qué hizo con los otros 51
// bloques obliga a confiar a ciegas.

type Descartado = { referencia: string; motivo: string };
type Respuesta = {
  motor: string;
  count: number;
  reviewCount: number;
  products: CatimporterProduct[];
  descartados: Descartado[];
};

const cop = (n: number) => (n > 0 ? "$" + n.toLocaleString("es-CO") : "—");

function Stat({ label, value, tono = "normal" }: { label: string; value: number; tono?: "normal" | "bien" | "aviso" | "apagado" }) {
  const color = tono === "bien" ? "text-emerald-600" : tono === "aviso" ? "text-amber-600" : tono === "apagado" ? "text-zinc-400" : "text-zinc-900";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

export function CatimporterPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [proveedor, setProveedor] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [soloRevision, setSoloRevision] = useState(false);

  async function analizar() {
    if (!archivo) return;
    setCargando(true); setError(""); setDatos(null);
    const fd = new FormData();
    fd.append("file", archivo);
    fd.append("proveedor", proveedor.trim() || archivo.name.replace(/\.[^.]+$/, "").slice(0, 20));
    try {
      const res = await fetch("/api/admin/catimporter/import", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "No se pudo leer la lista");
      setDatos(d as Respuesta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al analizar");
    } finally {
      setCargando(false);
    }
  }

  const visibles = datos ? (soloRevision ? datos.products.filter((p) => p.requiresReview) : datos.products) : [];

  return (
    <div className="space-y-6">
      {/* Carga */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900">Leer una lista de proveedor</h2>
        <p className="mt-1 text-sm text-zinc-500">
          PDF, Word o Excel. Aquí <strong>solo se lee y se muestra</strong>: nada entra al catálogo todavía.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_200px_auto]">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 p-4 text-left transition hover:border-indigo-400"
          >
            <FileText className="h-6 w-6 shrink-0 text-indigo-500" />
            <span className="truncate text-sm text-zinc-700">
              {archivo ? archivo.name : "Seleccionar PDF, DOCX o XLSX"}
            </span>
          </button>
          <input
            ref={inputRef} type="file" hidden accept=".pdf,.docx,.xlsx"
            onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setDatos(null); setError(""); }}
          />
          <input
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
            placeholder="Proveedor (opcional)"
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
          <button
            type="button" disabled={!archivo || cargando} onClick={analizar}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {cargando ? "Leyendo…" : "Analizar"}
          </button>
        </div>

        {cargando && (
          <p className="mt-3 text-xs text-zinc-400">
            Los PDF grandes tardan entre 10 y 40 segundos: se leen página por página.
          </p>
        )}
        {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      </div>

      {datos && (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm">
            <Cpu className="h-4 w-4 text-indigo-600" />
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

          {/* Descartados: lo que el PDF traía y no llegó a producto */}
          {datos.descartados.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-4">
                <EyeOff className="h-4 w-4 text-zinc-400" />
                <h3 className="font-bold text-zinc-900">Bloques descartados</h3>
                <span className="text-xs text-zinc-500">
                  · estaban en el PDF y no son un producto. Se listan para poder revisarlos contra el original.
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
