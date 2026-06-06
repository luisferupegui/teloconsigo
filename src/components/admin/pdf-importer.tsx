"use client";

import { useState, useRef, useTransition } from "react";
import {
  Upload, FileText, Loader2, CheckCircle2, AlertCircle,
  Star, Tag, Plus, X, Sparkles, Package,
} from "lucide-react";
import type { BusinessProduct } from "@/lib/products-types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExtractedProduct = {
  id: string;
  nombre: string;
  marca: string;
  categoria: string;
  precio_costo: number;
  referencia?: string;
  specs?: Record<string, string>;
  proveedor: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVEEDORES = ["ledacom", "infoshopcorp", "otro"];

const USO_OPTIONS: { value: BusinessProduct["usoCaso"]; label: string }[] = [
  { value: "portatil-ejecutivo", label: "Portátil Ejecutivo" },
  { value: "portatil-oficina",   label: "Portátil Oficina"   },
  { value: "portatil-gaming",    label: "Portátil Gaming"    },
  { value: "pc-empresarial",     label: "PC Empresarial"     },
  { value: "monitor",            label: "Monitor"            },
  { value: "tablet-empresarial", label: "Tablet"             },
  { value: "licencia",           label: "Licencia"           },
  { value: "accesorio",          label: "Accesorio"          },
];

const CAT_OPTIONS: { value: BusinessProduct["categoria"]; label: string }[] = [
  { value: "portatil",  label: "Portátil"  },
  { value: "pc",        label: "PC"        },
  { value: "monitor",   label: "Monitor"   },
  { value: "tablet",    label: "Tablet"    },
  { value: "licencia",  label: "Licencia"  },
  { value: "accesorio", label: "Accesorio" },
];

const EMPTY_FORM = {
  nombre:      "",
  marca:       "",
  precio:      "",
  descripcion: "",
  usoCaso:     "accesorio" as BusinessProduct["usoCaso"],
  categoria:   "accesorio" as BusinessProduct["categoria"],
  destacado:   false,
  enPromocion: false,
};

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PdfImporter() {
  // PDF
  const [pdfText, setPdfText]   = useState<string | null>(null);
  const [pdfName, setPdfName]   = useState("");
  const [pdfPages, setPdfPages] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Proveedor
  const [proveedor, setProveedor] = useState("ledacom");

  // AI extraction
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedProduct[] | null>(null);
  const [importDone, setImportDone] = useState(false);

  // Manual form
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, startSave] = useTransition();
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  function flash(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Upload PDF ──
  async function handlePdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPdfError(null);
    setExtracted(null);
    setImportDone(false);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/api/admin/pdf-extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al procesar");
      setPdfText(data.text);
      setPdfName(data.name);
      setPdfPages(data.pages);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // ── AI extraction ──
  async function handleExtract() {
    if (!pdfText) return;
    setExtracting(true);
    setExtractError(null);
    setExtracted(null);
    setImportDone(false);
    try {
      const res = await fetch("/api/admin/extract-text-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pdfText, proveedor, mode: "replace" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setExtracted(data.products);
      setImportDone(true);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Error con la IA");
    } finally {
      setExtracting(false);
    }
  }

  // ── Copy selected text to field (manual) ──
  function copySelection(field: keyof typeof EMPTY_FORM) {
    const sel = window.getSelection()?.toString().trim();
    if (sel) setForm((f) => ({ ...f, [field]: sel }));
  }

  // ── Create single product (manual) ──
  function handleCreate(target: "destacado" | "enPromocion" | "both") {
    startSave(async () => {
      if (!form.nombre || !form.marca) {
        flash(false, "Nombre y marca son obligatorios");
        return;
      }
      const body = {
        nombre: form.nombre, marca: form.marca,
        precioDesde: form.precio !== "" ? Number(form.precio) : null,
        descripcionUso: form.descripcion,
        usoCaso: form.usoCaso, categoria: form.categoria,
        destacado:   target === "destacado"  || target === "both",
        enPromocion: target === "enPromocion" || target === "both",
      };
      const res  = await fetch("/api/admin/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { flash(false, data.error ?? "Error al guardar"); return; }
      flash(true, `Producto creado (ref: ${data.referencia})`);
      setForm(EMPTY_FORM);
    });
  }

  // ── Reset ──
  function resetPdf() {
    setPdfText(null); setPdfName(""); setPdfPages(0);
    setExtracted(null); setExtractError(null); setImportDone(false);
  }

  // ── Margin preview ──
  const MARGINS_DEFAULT: Record<string, number> = {
    portatil: 0.28, procesador: 0.22, monitor: 0.25, "memoria-ram": 0.35,
    almacenamiento: 0.35, "tarjeta-grafica": 0.20, default: 0.35,
  };
  function finalPrice(p: ExtractedProduct) {
    const m = MARGINS_DEFAULT[p.categoria] ?? MARGINS_DEFAULT.default;
    return Math.ceil((p.precio_costo * (1 + m)) / 1000) * 1000;
  }

  return (
    <div className="space-y-6">

      {/* ── Upload zone ── */}
      {!pdfText ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-4
            rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-16
            transition hover:border-indigo-400 hover:bg-indigo-50/30"
        >
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
              <p className="text-sm font-semibold text-zinc-500">Procesando PDF…</p>
            </>
          ) : (
            <>
              <FileText className="h-12 w-12 text-zinc-300" />
              <div className="text-center">
                <p className="text-sm font-bold text-zinc-700">Subir lista de precios PDF</p>
                <p className="mt-1 text-xs text-zinc-400">Haz clic o arrastra el archivo · Máx. 20 MB</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">
                <Upload className="h-4 w-4" /> Seleccionar PDF
              </div>
            </>
          )}
          {pdfError && (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-red-500">
              <AlertCircle className="h-4 w-4" /> {pdfError}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── PDF header + proveedor + AI button ── */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-zinc-900">📄 {pdfName}</p>
                <p className="text-xs text-zinc-400">
                  {pdfPages} página{pdfPages !== 1 ? "s" : ""} · {pdfText.length.toLocaleString()} caracteres extraídos
                </p>
              </div>
              <button
                onClick={resetPdf}
                className="flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5
                  text-xs font-semibold text-zinc-500 hover:border-red-300 hover:text-red-500 transition"
              >
                <X className="h-3.5 w-3.5" /> Cargar otro
              </button>
            </div>

            {/* Proveedor + AI button */}
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Proveedor</span>
                <select
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                >
                  {PROVEEDORES.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </label>

              <button
                onClick={handleExtract}
                disabled={extracting}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600
                  px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200
                  hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 transition"
              >
                {extracting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Extrayendo con IA…</>
                  : <><Sparkles className="h-4 w-4" /> Extraer TODO con IA</>
                }
              </button>

              {importDone && (
                <span className="flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> {extracted?.length} productos importados
                </span>
              )}
            </div>

            {extracting && (
              <div className="mt-2 rounded-lg bg-violet-50 border border-violet-200 px-4 py-3">
                <p className="text-xs font-semibold text-violet-800">
                  Claude está procesando el PDF en fragmentos…
                </p>
                <p className="text-xs text-violet-600 mt-1">
                  Para un documento de {Math.ceil(pdfText!.length / 35000)} fragmentos esto puede tomar{" "}
                  <strong>{Math.ceil(pdfText!.length / 35000) * 20}–{Math.ceil(pdfText!.length / 35000) * 35} segundos</strong>.
                  No cierres esta ventana.
                </p>
              </div>
            )}
            {extractError && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-red-500">
                <AlertCircle className="h-4 w-4" /> {extractError}
              </p>
            )}
          </div>

          {/* ── AI Results preview ── */}
          {extracted && extracted.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 bg-emerald-50 px-5 py-3 border-b border-emerald-100">
                <Package className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-bold text-emerald-900">
                    {extracted.length} productos extraídos de {proveedor}
                  </p>
                  <p className="text-xs text-emerald-700">
                    Precios mostrados ya incluyen margen de ganancia · Ya guardados en catálogo de proveedores
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-zinc-50 text-zinc-500 uppercase tracking-wider border-b border-zinc-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold">Producto</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Categoría</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Costo</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-[#1e6cff]">Precio cliente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {extracted.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-zinc-900 truncate max-w-[220px]">{p.nombre}</p>
                          <p className="text-zinc-400">{p.marca}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">{p.categoria}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-zinc-400">{formatCOP(p.precio_costo)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#1e6cff]">{formatCOP(finalPrice(p))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Manual split view ── */}
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

            {/* Left: raw text */}
            <div className="flex flex-col gap-2">
              <p className="text-xs text-zinc-500">Texto crudo — selecciona y usa los botones del formulario para copiarlo manualmente</p>
              <div className="h-[400px] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4">
                <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-700 font-mono select-text">
                  {pdfText}
                </pre>
              </div>
            </div>

            {/* Right: manual product form */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="mb-4 text-sm font-bold text-zinc-900">➕ Crear producto manual desde PDF</p>

              <div className="space-y-3">
                {[
                  { field: "nombre" as const, label: "Nombre", placeholder: "Nombre del producto", type: "text" },
                  { field: "marca"  as const, label: "Marca",  placeholder: "Ej: Lenovo, Dell…",   type: "text" },
                  { field: "precio" as const, label: "Precio desde (COP)", placeholder: "Ej: 2500000", type: "number" },
                ].map(({ field, label, placeholder, type }) => (
                  <label key={field} className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {label}
                      <button
                        onClick={() => copySelection(field)}
                        className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 hover:bg-indigo-200 transition"
                      >
                        ← Pegar selección
                      </button>
                    </span>
                    <input
                      type={type}
                      value={form[field] as string}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      placeholder={placeholder}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                ))}

                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Descripción
                    <button onClick={() => copySelection("descripcion")}
                      className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 hover:bg-indigo-200 transition">
                      ← Pegar selección
                    </button>
                  </span>
                  <textarea value={form.descripcion}
                    onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                    rows={3} placeholder="Descripción breve"
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none" />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Uso</span>
                    <select value={form.usoCaso}
                      onChange={(e) => setForm((f) => ({ ...f, usoCaso: e.target.value as BusinessProduct["usoCaso"] }))}
                      className="rounded-lg border border-zinc-300 px-2 py-2 text-sm focus:border-indigo-400 focus:outline-none">
                      {USO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Categoría</span>
                    <select value={form.categoria}
                      onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value as BusinessProduct["categoria"] }))}
                      className="rounded-lg border border-zinc-300 px-2 py-2 text-sm focus:border-indigo-400 focus:outline-none">
                      {CAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                </div>

                <div className="mt-2 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Agregar a:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleCreate("destacado")} disabled={saving}
                      className="flex items-center justify-center gap-2 rounded-xl border border-amber-200
                        bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700
                        hover:bg-amber-100 disabled:opacity-60 transition">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
                      Destacados
                    </button>
                    <button onClick={() => handleCreate("enPromocion")} disabled={saving}
                      className="flex items-center justify-center gap-2 rounded-xl border border-indigo-200
                        bg-indigo-50 px-3 py-2.5 text-xs font-bold text-indigo-700
                        hover:bg-indigo-100 disabled:opacity-60 transition">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}
                      Promociones
                    </button>
                  </div>
                  <button onClick={() => handleCreate("both")} disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-xl
                      bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white
                      hover:bg-indigo-700 disabled:opacity-60 transition">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Agregar a ambos
                  </button>
                </div>

                {toast && (
                  <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white
                    ${toast.ok ? "bg-emerald-500" : "bg-red-500"}`}>
                    {toast.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    {toast.msg}
                  </div>
                )}

                <button onClick={() => setForm(EMPTY_FORM)}
                  className="w-full rounded-xl border border-zinc-200 py-2 text-xs font-semibold
                    text-zinc-400 hover:border-zinc-300 hover:text-zinc-600 transition">
                  Limpiar formulario
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdf} />
    </div>
  );
}
