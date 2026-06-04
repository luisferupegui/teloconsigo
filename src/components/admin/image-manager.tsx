"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, Trash2, ImageIcon, Search, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ManagedProduct = {
  id: string;
  identifier: string;
  nombre: string;
  marca: string;
  categoria: string;
  tipo: "empresarial" | "general";
  cardUrl: string | null;
  detalleUrl: string | null;
};

// ─── Single image upload slot ─────────────────────────────────────────────────

function ImageSlot({
  identifier,
  tipo,
  label,
  hint,
  initialUrl,
}: {
  identifier: string;
  tipo: "card" | "detalle";
  label: string;
  hint: string;
  initialUrl: string | null;
}) {
  const [url, setUrl]         = useState<string | null>(initialUrl);
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState<{ ok: boolean; msg: string } | null>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("identifier", identifier);
    fd.append("tipo", tipo);
    try {
      const res  = await fetch("/api/admin/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir");
      setUrl(data.url);
      showToast(true, "Imagen subida correctamente");
    } catch (err: unknown) {
      showToast(false, err instanceof Error ? err.message : "Error al subir");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar imagen "${label}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/delete-image", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ identifier, tipo }),
      });
      if (!res.ok) throw new Error("Error al eliminar");
      setUrl(null);
      showToast(true, "Imagen eliminada");
    } catch (err: unknown) {
      showToast(false, err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Label + hint */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
        <span className="text-[10px] text-zinc-400">{hint}</span>
      </div>

      {/* Preview zone */}
      <div className={`relative flex min-h-[140px] items-center justify-center overflow-hidden
                       rounded-xl border-2 transition-colors
                       ${url
                         ? "border-zinc-200 bg-white"
                         : "border-dashed border-zinc-300 bg-zinc-50 hover:border-indigo-300 hover:bg-indigo-50/30"
                       }`}>
        {url ? (
          <div className="relative h-[136px] w-full">
            <Image
              src={url}
              alt={label}
              fill
              sizes="280px"
              className="object-contain p-3"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-zinc-300">
            <ImageIcon className="h-10 w-10" />
            <span className="text-xs text-zinc-400">Sin imagen</span>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-indigo-600 border-t-transparent" />
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`absolute bottom-2 left-2 right-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-lg
                           ${toast.ok ? "bg-emerald-500" : "bg-red-500"}`}>
            {toast.ok
              ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              : <AlertCircle  className="h-3.5 w-3.5 shrink-0" />}
            {toast.msg}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border
                     border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold
                     text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {url ? "Cambiar" : "Subir imagen"}
        </button>
        {url && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            title="Eliminar imagen"
            className="flex items-center justify-center gap-1 rounded-lg border border-red-200
                       bg-red-50 px-3 py-2 text-xs font-semibold text-red-600
                       transition hover:bg-red-100 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductImageCard({ product }: { product: ManagedProduct }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-bold text-zinc-900">{product.nombre}</p>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              <span className="font-semibold text-zinc-600">{product.marca}</span>
              {" · "}
              <span className="font-mono">{product.identifier}</span>
              {" · "}
              <span>{product.categoria}</span>
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase
            ${product.tipo === "empresarial"
              ? "bg-indigo-100 text-indigo-700"
              : "bg-emerald-100 text-emerald-700"
            }`}>
            {product.tipo}
          </span>
        </div>
      </div>

      {/* Image slots */}
      <div className="grid grid-cols-2 gap-4 p-4">
        <ImageSlot
          identifier={product.identifier}
          tipo="card"
          label="Tarjeta / Card"
          hint="800×800 · JPG/WebP"
          initialUrl={product.cardUrl}
        />
        <ImageSlot
          identifier={product.identifier}
          tipo="detalle"
          label="Detalle / Catálogo"
          hint="1200×1200 · JPG/WebP"
          initialUrl={product.detalleUrl}
        />
      </div>
    </div>
  );
}

// ─── Reprocess button ─────────────────────────────────────────────────────────

type ReprocessResult = { ok: number; failed: number; total: number; errors: string[] };

function ReprocessButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<ReprocessResult | null>(null);

  async function run() {
    if (!confirm("¿Reprocesar todas las imágenes de productos y líneas? Esto puede tardar unos segundos.")) return;
    setStatus("running");
    setResult(null);
    try {
      const res  = await fetch("/api/admin/reprocess-images", { method: "POST" });
      const data = await res.json() as ReprocessResult;
      setResult(data);
      setStatus(data.failed > 0 ? "error" : "done");
    } catch {
      setStatus("error");
      setResult({ ok: 0, failed: 1, total: 0, errors: ["Error de red al llamar al servidor."] });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={run}
        disabled={status === "running"}
        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition
          ${status === "running"
            ? "border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed"
            : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
          }`}
      >
        <RefreshCw className={`h-4 w-4 ${status === "running" ? "animate-spin" : ""}`} />
        {status === "running" ? "Reprocesando…" : "Reprocesar imágenes con fondo"}
      </button>

      {result && (
        <div className={`rounded-xl border px-4 py-3 text-xs leading-relaxed
          ${result.failed > 0 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          <p className="font-bold">
            {result.failed > 0 ? "⚠️ " : "✅ "}
            {result.ok} imágenes procesadas · {result.failed} errores · {result.total} total
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-amber-700">
              {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main manager ─────────────────────────────────────────────────────────────

export function ImageManager({ products }: { products: ManagedProduct[] }) {
  const [tab, setTab]       = useState<"all" | "empresarial" | "general">("all");
  const [query, setQuery]   = useState("");

  const filtered = products.filter((p) => {
    const matchTab = tab === "all" || p.tipo === tab;
    const q = query.toLowerCase();
    const matchQ = !q
      || p.nombre.toLowerCase().includes(q)
      || p.marca.toLowerCase().includes(q)
      || p.identifier.toLowerCase().includes(q)
      || p.categoria.toLowerCase().includes(q);
    return matchTab && matchQ;
  });

  const counts = {
    all:         products.length,
    empresarial: products.filter((p) => p.tipo === "empresarial").length,
    general:     products.filter((p) => p.tipo === "general").length,
  };

  const withImages    = products.filter((p) => p.cardUrl || p.detalleUrl).length;
  const withoutImages = products.length - withImages;

  return (
    <div>
      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total productos",   value: products.length,   color: "text-zinc-900"   },
          { label: "Con imágenes",      value: withImages,         color: "text-emerald-600" },
          { label: "Sin imágenes",      value: withoutImages,      color: "text-amber-600"   },
          { label: "Catálogo empresarial", value: counts.empresarial, color: "text-indigo-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="mb-5 flex flex-wrap items-start gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Buscar por nombre, marca, referencia…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-4
                       text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <ReprocessButton />

        {/* Tabs */}
        <div className="flex rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
          {(["all", "empresarial", "general"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition
                ${tab === t
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
                }`}
            >
              {t === "all" ? "Todos" : t === "empresarial" ? "Empresarial" : "General"}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]
                ${tab === t ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"}`}>
                {counts[t]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="mb-4 text-xs text-zinc-400">
        {filtered.length} producto{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
        {query && ` para "${query}"`}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-zinc-200 py-16 text-center">
          <ImageIcon className="mx-auto h-10 w-10 text-zinc-300" />
          <p className="mt-3 text-sm font-semibold text-zinc-500">Sin resultados</p>
          <p className="text-xs text-zinc-400">Intenta con otro término de búsqueda</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProductImageCard key={`${p.tipo}-${p.id}`} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
