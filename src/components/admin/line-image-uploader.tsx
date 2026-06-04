"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, Trash2, ImageIcon, CheckCircle2, AlertCircle } from "lucide-react";

export function LineImageUploader({
  categoria,
  slug,
  initialUrl,
}: {
  categoria: string;
  slug: string;
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
    fd.append("categoria", categoria);
    fd.append("slug", slug);
    try {
      const res  = await fetch("/api/admin/upload-line-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir");
      setUrl(data.url);
      showToast(true, "Imagen actualizada");
    } catch (err: unknown) {
      showToast(false, err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta imagen?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/upload-line-image", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ categoria, slug }),
      });
      if (!res.ok) throw new Error("Error al eliminar");
      setUrl(null);
      showToast(true, "Imagen eliminada");
    } catch (err: unknown) {
      showToast(false, err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Preview */}
      <div className={`relative flex h-14 w-20 shrink-0 items-center justify-center
                       overflow-hidden rounded-lg border transition-colors
                       ${url ? "border-zinc-200 bg-white" : "border-dashed border-zinc-300 bg-zinc-50"}`}>
        {url ? (
          <Image src={url} alt={slug} fill sizes="80px"
                 className="object-contain p-1" unoptimized />
        ) : (
          <ImageIcon className="h-5 w-5 text-zinc-300" />
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        )}
        {toast && (
          <div className={`absolute inset-0 flex items-center justify-center rounded-lg text-white text-[9px] font-bold
                           ${toast.ok ? "bg-emerald-500" : "bg-red-500"}`}>
            {toast.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50
                     px-2.5 py-1.5 text-xs font-semibold text-indigo-700
                     hover:bg-indigo-100 disabled:opacity-50 transition"
        >
          <Upload className="h-3 w-3" />
          {url ? "Cambiar" : "Subir"}
        </button>
        {url && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50
                       px-2 py-1.5 text-xs text-red-600 hover:bg-red-100
                       disabled:opacity-50 transition"
          >
            <Trash2 className="h-3 w-3" />
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
