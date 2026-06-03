"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Upload, Trash2, ImageIcon, Loader2, CheckCircle2, AlertCircle,
  RotateCcw, RotateCw, FlipHorizontal2, FlipVertical2,
} from "lucide-react";

type TransformOp = "rotate-ccw" | "rotate-cw" | "flip-h" | "flip-v";

/**
 * Slot de imagen de producto: subir / cambiar / borrar + girar 90° (cw/ccw) y
 * voltear horizontal/vertical. Es CONTROLADO — el padre posee la url
 * (`url` + `onUrlChange`) para que la imagen persista aunque el panel que lo
 * contiene se monte/desmonte (p. ej. al cerrar/reabrir "Editar").
 */
export function ImageSlot({
  identifier,
  tipo,
  url,
  onUrlChange,
  label,
}: {
  identifier: string;
  tipo: "card" | "detalle";
  url: string | null;
  onUrlChange: (u: string | null) => void;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg,  setMsg]  = useState<{ ok: boolean; text: string } | null>(null);
  const inputRef        = useRef<HTMLInputElement>(null);

  function flash(ok: boolean, text: string) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 2500);
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("identifier", identifier);
    fd.append("tipo", tipo);
    try {
      const res  = await fetch("/api/admin/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUrlChange(data.url);
      flash(true, "Subida correctamente");
    } catch (err) {
      flash(false, err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function transform(op: TransformOp) {
    if (!url) return;
    setBusy(true);
    try {
      const res  = await fetch("/api/admin/transform-image", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ identifier, tipo, op }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUrlChange(data.url); // url con cache-bust → refresca la vista
    } catch (err) {
      flash(false, err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteImg() {
    if (!confirm(`¿Eliminar imagen ${label}?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/delete-image", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ identifier, tipo }),
      });
      if (!res.ok) throw new Error("Error al eliminar");
      onUrlChange(null);
      flash(true, "Eliminada");
    } catch (err) {
      flash(false, err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const TX_BTN = "flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 transition";

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
      <div className={`relative flex h-32 items-center justify-center overflow-hidden rounded-xl border-2
        ${url ? "border-zinc-200 bg-white" : "border-dashed border-zinc-300 bg-zinc-50"}`}>
        {url ? (
          <Image src={url} alt={label} fill sizes="200px" className="object-contain p-2" unoptimized />
        ) : (
          <div className="flex flex-col items-center gap-1 text-zinc-300">
            <ImageIcon className="h-7 w-7" />
            <span className="text-[11px] text-zinc-400">Sin imagen</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          </div>
        )}
        {msg && (
          <div className={`absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1.5 rounded-lg
            px-2 py-1.5 text-[11px] font-semibold text-white
            ${msg.ok ? "bg-emerald-500" : "bg-red-500"}`}>
            {msg.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {msg.text}
          </div>
        )}
      </div>

      {/* Herramientas de imagen: girar / voltear (solo si hay imagen) */}
      {url && (
        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-50 py-1.5">
          <button onClick={() => transform("rotate-ccw")} disabled={busy} className={TX_BTN} title="Girar 90° izquierda">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => transform("rotate-cw")} disabled={busy} className={TX_BTN} title="Girar 90° derecha">
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <span className="mx-0.5 h-4 w-px bg-zinc-200" />
          <button onClick={() => transform("flip-h")} disabled={busy} className={TX_BTN} title="Voltear horizontal">
            <FlipHorizontal2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => transform("flip-v")} disabled={busy} className={TX_BTN} title="Voltear vertical">
            <FlipVertical2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex gap-1.5">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-indigo-200
            bg-indigo-50 px-2 py-1.5 text-[11px] font-semibold text-indigo-700
            hover:bg-indigo-100 disabled:opacity-50 transition"
        >
          <Upload className="h-3 w-3" />
          {url ? "Cambiar" : "Subir"}
        </button>
        {url && (
          <button
            onClick={deleteImg}
            disabled={busy}
            className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50
              px-2 py-1.5 text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
             className="hidden" onChange={upload} />
    </div>
  );
}
