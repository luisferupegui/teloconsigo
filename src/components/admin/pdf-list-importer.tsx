"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface PreviewProduct {
  nombre: string;
  precio_costo: number;
  categoria: string;
}

interface ImportResult {
  ok?: boolean;
  listId?: string;
  count?: number;
  preview?: PreviewProduct[];
  error?: string;
}

const CAT_LABELS: Record<string, string> = {
  escritorio: "Escritorio",
  "escritorio-alto-rendimiento": "Alto rendimiento",
};

/** Proveedores ya conocidos, como atajo. El campo es libre: cualquier nombre nuevo vale,
 *  que es justo lo que permite ir sumando proveedores sin tocar código. */
const SUGERENCIAS = ["ledacom", "infoshopcorp", "janus"];

export function PdfListImporter() {
  const [proveedor, setProveedor] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [nombre, setNombre] = useState("");
  const [aplicarIva, setAplicarIva] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    if (f && !nombre) {
      setNombre(f.name.replace(/\.pdf$/i, "").slice(0, 60));
    }
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("nombre", nombre || file.name.replace(/\.pdf$/i, ""));
      form.append("proveedor", proveedor.trim());
      form.append("aplicarIva", String(aplicarIva));
      const res = await fetch("/api/admin/import-pdf-list", {
        method: "POST",
        body: form,
      });
      const data: ImportResult = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "Error de red. Intenta de nuevo." });
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setNombre("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-zinc-900">
          Importar lista de precios en PDF
        </h2>
        <p className="mb-5 text-sm text-zinc-500">
          Sube el PDF de cualquier proveedor. El lector prueba los dos formatos que
          conocemos y se queda con el que extraiga más productos. Activa el IVA si ese
          proveedor cotiza sin impuesto (ver opción abajo).
        </p>

        <div className="space-y-4">
          {/* File picker */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">
              Archivo PDF
            </span>
            <div
              className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-5 transition hover:border-indigo-400 hover:bg-indigo-50/30"
              onClick={() => fileRef.current?.click()}
            >
              <FileText className="h-6 w-6 shrink-0 text-zinc-400" />
              <div className="min-w-0">
                {file ? (
                  <>
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {file.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Haz clic para seleccionar el PDF
                  </p>
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          {/* List name */}
          {file && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Nombre de la lista
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Lista Ledacom Junio 2026"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Proveedor: libre, para poder sumar proveedores sin tocar código */}
          {file && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Proveedor
              </label>
              <input
                type="text"
                list="proveedores-pdf"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="Nombre del proveedor"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <datalist id="proveedores-pdf">
                {SUGERENCIAS.map((p) => <option key={p} value={p} />)}
              </datalist>
            </div>
          )}

          {/* IVA toggle */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={aplicarIva}
                onChange={(e) => setAplicarIva(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-zinc-300 transition peer-checked:bg-indigo-600" />
              <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-800">Aplicar IVA (19%)</p>
              <p className="text-xs text-zinc-500">
                Activa si los precios del PDF <strong>no incluyen IVA</strong>.
                Algunos proveedores cotizan sin IVA los equipos por encima de cierto valor.
              </p>
            </div>
          </label>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Procesando PDF…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar lista
                </>
              )}
            </button>
            {(file || result) && !loading && (
              <button
                onClick={reset}
                className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`rounded-2xl border p-5 shadow-sm ${
            result.ok
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.ok ? (
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            )}
            <div className="min-w-0 flex-1">
              {result.ok ? (
                <>
                  <p className="text-sm font-semibold text-emerald-800">
                    Se importaron {result.count} productos
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-700">
                    La lista está activa y disponible para el asesor.
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-red-800">
                  {result.error}
                </p>
              )}
            </div>
          </div>

          {result.ok && result.preview && result.preview.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-200">
                    <th className="pb-2 pr-4 text-left text-xs font-semibold text-emerald-700">
                      Producto
                    </th>
                    <th className="pb-2 pr-4 text-right text-xs font-semibold text-emerald-700">
                      Precio costo
                    </th>
                    <th className="pb-2 text-left text-xs font-semibold text-emerald-700">
                      Categoría
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.preview.map((p, i) => (
                    <tr
                      key={i}
                      className="border-b border-emerald-100 last:border-0"
                    >
                      <td className="max-w-xs truncate py-2 pr-4 text-zinc-800">
                        {p.nombre}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-zinc-700">
                        ${p.precio_costo.toLocaleString("es-CO")}
                      </td>
                      <td className="py-2 text-zinc-500">
                        {CAT_LABELS[p.categoria] ?? p.categoria}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(result.count ?? 0) > 8 && (
                <p className="mt-2 text-xs text-emerald-700">
                  …y {(result.count ?? 0) - 8} productos más.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
