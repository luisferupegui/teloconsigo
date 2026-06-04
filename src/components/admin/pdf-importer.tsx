"use client";

import { useState, useRef, useTransition } from "react";
import {
  Upload, FileText, Loader2, CheckCircle2, AlertCircle,
  Star, Tag, Plus, X,
} from "lucide-react";
import type { BusinessProduct } from "@/lib/products-types";

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

// ─── Initial form state ───────────────────────────────────────────────────────

const EMPTY_FORM = {
  nombre:       "",
  marca:        "",
  precio:       "",
  descripcion:  "",
  usoCaso:      "accesorio" as BusinessProduct["usoCaso"],
  categoria:    "accesorio" as BusinessProduct["categoria"],
  destacado:    false,
  enPromocion:  false,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PdfImporter() {
  // PDF state
  const [pdfText, setPdfText]   = useState<string | null>(null);
  const [pdfName, setPdfName]   = useState<string>("");
  const [pdfPages,setPdfPages]  = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Product form state
  const [form,  setForm]  = useState(EMPTY_FORM);
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

  // ── Copy selected text to field ──
  function copySelection(field: keyof typeof EMPTY_FORM) {
    const sel = window.getSelection()?.toString().trim();
    if (sel) setForm((f) => ({ ...f, [field]: sel }));
  }

  // ── Create product ──
  function handleCreate(target: "destacado" | "enPromocion" | "both") {
    startSave(async () => {
      if (!form.nombre || !form.marca) {
        flash(false, "Nombre y marca son obligatorios");
        return;
      }
      const body = {
        nombre:        form.nombre,
        marca:         form.marca,
        precioDesde:   form.precio !== "" ? Number(form.precio) : null,
        descripcionUso: form.descripcion,
        usoCaso:       form.usoCaso,
        categoria:     form.categoria,
        destacado:     target === "destacado" || target === "both",
        enPromocion:   target === "enPromocion" || target === "both",
      };
      const res  = await fetch("/api/admin/product", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        flash(false, data.error ?? "Error al guardar");
        return;
      }
      flash(true, `Producto creado (ref: ${data.referencia})`);
      setForm(EMPTY_FORM);
    });
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
        /* ── PDF loaded: split view ── */
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

          {/* Left: extracted text */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-zinc-900">📄 {pdfName}</p>
                <p className="text-xs text-zinc-400">{pdfPages} página{pdfPages !== 1 ? "s" : ""} · Selecciona texto y usa los botones del formulario para copiarlo</p>
              </div>
              <button
                onClick={() => { setPdfText(null); setPdfName(""); setPdfPages(0); }}
                className="flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5
                  text-xs font-semibold text-zinc-500 hover:border-red-300 hover:text-red-500 transition"
              >
                <X className="h-3.5 w-3.5" /> Cargar otro
              </button>
            </div>
            <div className="h-[520px] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-700 font-mono select-text">
                {pdfText}
              </pre>
            </div>
          </div>

          {/* Right: product form */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-bold text-zinc-900">➕ Crear producto desde PDF</p>

            <div className="space-y-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Nombre
                  <button onClick={() => copySelection("nombre")}
                    className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 hover:bg-indigo-200 transition">
                    ← Pegar selección
                  </button>
                </span>
                <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                       placeholder="Nombre del producto"
                       className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Marca
                  <button onClick={() => copySelection("marca")}
                    className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 hover:bg-indigo-200 transition">
                    ← Pegar selección
                  </button>
                </span>
                <input value={form.marca} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
                       placeholder="Ej: Lenovo, Dell, HP…"
                       className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Precio desde (COP)
                  <button onClick={() => copySelection("precio")}
                    className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 hover:bg-indigo-200 transition">
                    ← Pegar selección
                  </button>
                </span>
                <input type="number" value={form.precio}
                       onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
                       placeholder="Ej: 2500000"
                       className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </label>

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
                          rows={3} placeholder="Descripción breve del producto"
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

              {/* Destination buttons */}
              <div className="mt-2 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Agregar a:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCreate("destacado")}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 rounded-xl border border-amber-200
                      bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700
                      hover:bg-amber-100 disabled:opacity-60 transition"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
                    Destacados
                  </button>
                  <button
                    onClick={() => handleCreate("enPromocion")}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 rounded-xl border border-indigo-200
                      bg-indigo-50 px-3 py-2.5 text-xs font-bold text-indigo-700
                      hover:bg-indigo-100 disabled:opacity-60 transition"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}
                    Promociones
                  </button>
                </div>
                <button
                  onClick={() => handleCreate("both")}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl
                    bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white
                    hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Agregar a ambos
                </button>
              </div>

              {/* Toast */}
              {toast && (
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white
                  ${toast.ok ? "bg-emerald-500" : "bg-red-500"}`}>
                  {toast.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {toast.msg}
                </div>
              )}

              {/* Reset form */}
              <button
                onClick={() => setForm(EMPTY_FORM)}
                className="w-full rounded-xl border border-zinc-200 py-2 text-xs font-semibold
                  text-zinc-400 hover:border-zinc-300 hover:text-zinc-600 transition"
              >
                Limpiar formulario
              </button>
            </div>
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdf} />
    </div>
  );
}
