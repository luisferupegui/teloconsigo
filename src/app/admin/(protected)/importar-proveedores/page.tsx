"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2, Trash2, Save, Package, PercentSquare } from "lucide-react";

const PROVEEDORES = ["ledacom", "infoshopcorp", "otro"];

const CATEGORY_LABELS: Record<string, string> = {
  portatil: "Portátiles",
  procesador: "Procesadores",
  monitor: "Monitores",
  "memoria-ram": "Memoria RAM",
  almacenamiento: "Almacenamiento",
  "tarjeta-grafica": "Tarjetas Gráficas",
  "fuente-poder": "Fuentes de Poder",
  refrigeracion: "Refrigeración",
  escritorio: "Equipos de Escritorio",
  redes: "Redes",
  mouse: "Mouse",
  auriculares: "Auriculares",
  streaming: "Streaming",
  impresora: "Impresoras",
  accesorios: "Accesorios",
  teclado: "Teclados",
  motherboard: "Motherboards",
  default: "Por defecto",
};

type ImportedProduct = {
  id: string;
  nombre: string;
  marca: string;
  categoria: string;
  precio_costo: number;
  referencia?: string;
  specs?: Record<string, string>;
  proveedor: string;
};

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

export default function ImportarProveedoresPage() {
  const [tab, setTab] = useState<"import" | "margins">("import");

  // ── Import state ──
  const [file, setFile] = useState<File | null>(null);
  const [proveedor, setProveedor] = useState("ledacom");
  const [mode, setMode] = useState<"append" | "replace">("replace");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ count: number; products: ImportedProduct[] } | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Margins state ──
  const [margins, setMargins] = useState<Record<string, number>>({});
  const [savingMargins, setSavingMargins] = useState(false);
  const [marginsSaved, setMarginsSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/margins")
      .then((r) => r.json())
      .then(setMargins)
      .catch(() => {});
  }, []);

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("proveedor", proveedor);
    fd.append("mode", mode);

    try {
      const res = await fetch("/api/admin/import-pdf-catalog", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setLoading(false);
    }
  }

  async function saveMargins() {
    setSavingMargins(true);
    try {
      await fetch("/api/admin/margins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(margins),
      });
      setMarginsSaved(true);
      setTimeout(() => setMarginsSaved(false), 2500);
    } finally {
      setSavingMargins(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Importar proveedores</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Importa listas de precios PDF y configura los márgenes por categoría.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 mb-6 w-fit">
        {([["import", Package, "Importar PDF"], ["margins", PercentSquare, "Márgenes"]] as const).map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === id ? "bg-white shadow text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── IMPORT TAB ── */}
      {tab === "import" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-zinc-900 mb-4">Configuración de importación</h2>

            <div className="grid gap-4 sm:grid-cols-2 mb-4">
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">Proveedor</span>
                <select
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#1e6cff] focus:outline-none"
                >
                  {PROVEEDORES.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-700">Modo de importación</span>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "append" | "replace")}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#1e6cff] focus:outline-none"
                >
                  <option value="replace">Reemplazar lista de este proveedor</option>
                  <option value="append">Agregar a la lista existente</option>
                </select>
              </label>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition ${
                file ? "border-[#1e6cff] bg-blue-50" : "border-zinc-300 hover:border-[#1e6cff] hover:bg-blue-50/50"
              }`}
            >
              <Upload className={`h-8 w-8 mb-2 ${file ? "text-[#1e6cff]" : "text-zinc-400"}`} />
              {file ? (
                <>
                  <p className="font-semibold text-zinc-900 text-sm">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                    className="mt-2 flex items-center gap-1 text-xs text-rose-500 hover:underline"
                  >
                    <Trash2 className="h-3 w-3" /> Eliminar
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-zinc-600">Arrastra el PDF o haz clic para seleccionar</p>
                  <p className="text-xs text-zinc-400 mt-1">Solo PDF · Máx. 20 MB</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }}
              />
            </div>

            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1e6cff] px-6 py-3 text-sm font-bold text-white hover:bg-[#1858d6] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {loading ? "Procesando con IA…" : "Importar lista de precios"}
            </button>

            {loading && (
              <p className="mt-3 text-xs text-zinc-500">
                Claude está analizando el PDF. Esto puede tomar 20–60 segundos según el tamaño…
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-800">{error}</p>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <p className="font-semibold text-emerald-900">
                  ¡Importados {result.count} productos de {proveedor}!
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold">Producto</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Marca</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Categoría</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Costo</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Con margen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {result.products.map((p) => {
                      const margin = margins[p.categoria] ?? margins.default ?? 0.35;
                      const final = Math.ceil((p.precio_costo * (1 + margin)) / 1000) * 1000;
                      return (
                        <tr key={p.id} className="hover:bg-zinc-50">
                          <td className="px-4 py-2.5 font-medium text-zinc-800 max-w-[200px] truncate">{p.nombre}</td>
                          <td className="px-4 py-2.5 text-zinc-600">{p.marca}</td>
                          <td className="px-4 py-2.5">
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">{CATEGORY_LABELS[p.categoria] ?? p.categoria}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-zinc-500">{formatCOP(p.precio_costo)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-[#1e6cff]">{formatCOP(final)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MARGINS TAB ── */}
      {tab === "margins" && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-zinc-900">Márgenes por categoría</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Define el % de utilidad que se suma al precio de costo para calcular el precio al cliente.
              </p>
            </div>
            <button
              onClick={saveMargins}
              disabled={savingMargins}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1e6cff] px-4 py-2 text-sm font-bold text-white hover:bg-[#1858d6] disabled:opacity-50 transition"
            >
              {savingMargins ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {marginsSaved ? "¡Guardado!" : "Guardar"}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
              <label key={cat} className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:border-zinc-300">
                <span className="text-sm font-medium text-zinc-700">{label}</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={200}
                    step={1}
                    value={Math.round((margins[cat] ?? 0.35) * 100)}
                    onChange={(e) =>
                      setMargins((prev) => ({ ...prev, [cat]: Number(e.target.value) / 100 }))
                    }
                    className="w-16 rounded-lg border border-zinc-300 px-2 py-1 text-center text-sm font-semibold focus:border-[#1e6cff] focus:outline-none"
                  />
                  <span className="text-sm text-zinc-400">%</span>
                </div>
              </label>
            ))}
          </div>

          <p className="mt-4 text-xs text-zinc-400">
            Ejemplo: costo $90.000 · margen 40% → precio al cliente <strong>$126.000</strong> (redondeado a $1.000)
          </p>
        </div>
      )}
    </div>
  );
}
