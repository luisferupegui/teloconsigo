"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Save, Loader2, Eye, EyeOff, Star, Package, Tag, AlertCircle, ArrowLeft,
} from "lucide-react";
import type { Segmento } from "@/lib/products-types";
import { SEGMENTOS } from "@/lib/products-types";
import { ImageSlot } from "./image-slot";

// Mapa segmento → usoCaso legacy, para que el nuevo producto caiga en una
// sección sensata del storefront actual (que aún agrupa por usoCaso).
const SEG_TO_USO: Record<Segmento, string> = {
  "hogar-estudio":         "portatil-oficina",
  "gaming-streaming":      "portatil-gaming",
  "productividad-oficina": "pc-empresarial",
  "movilidad-premium":     "portatil-ejecutivo",
  "redes-servidores":      "pc-empresarial",
  "creadores-produccion":  "pc-empresarial",
  "smart-home":            "accesorio",
  "monitores":             "monitor",
  "accesorios":            "accesorio",
};
const SEG_TO_CAT: Record<Segmento, string> = {
  "hogar-estudio":         "portatil",
  "gaming-streaming":      "portatil",
  "productividad-oficina": "pc",
  "movilidad-premium":     "portatil",
  "redes-servidores":      "pc",
  "creadores-produccion":  "pc",
  "smart-home":            "accesorio",
  "monitores":             "monitor",
  "accesorios":            "accesorio",
};

export function NewProductForm() {
  const router = useRouter();

  // Referencia generada una sola vez → identifica la carpeta de imágenes y el
  // producto. Subir imágenes ANTES de crear funciona porque ambos usan esta ref.
  const [referencia] = useState(() => `manual-${Date.now()}`);

  const [nombre,      setNombre]      = useState("");
  const [marca,       setMarca]       = useState("");
  const [precio,      setPrecio]      = useState("");
  const [segmento,    setSegmento]    = useState<Segmento>("productividad-oficina");
  const [descripcion, setDescripcion] = useState("");
  const [publicado,   setPublicado]   = useState(false); // nuevos productos nacen ocultos (solo admin)
  const [destacado,   setDestacado]   = useState(false);
  const [enAccesorios,setEnAccesorios]= useState(false);
  const [enPromocion, setEnPromocion] = useState(false);

  const [cardUrl,    setCardUrl]    = useState<string | null>(null);
  const [detalleUrl, setDetalleUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleCreate() {
    if (!nombre.trim() || !marca.trim()) {
      setError("Nombre y marca son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/product", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          referencia,
          nombre:         nombre.trim(),
          marca:          marca.trim(),
          precioDesde:    precio !== "" ? Number(precio) : null,
          descripcionUso: descripcion,
          segmento,
          usoCaso:        SEG_TO_USO[segmento],
          categoria:      SEG_TO_CAT[segmento],
          publicado,
          destacado,
          enAccesorios,
          enPromocion,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear el producto.");
      // Producto creado con la misma ref que las imágenes → aparece en la lista.
      router.push("/admin/productos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-5 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-zinc-900">
            {nombre.trim() || "Nuevo producto"}
          </p>
          <p className="text-[11px] text-zinc-400">
            {marca.trim() || "Sin marca"} · <span className="font-mono">{referencia}</span>
          </p>
        </div>
        <Link
          href="/admin/productos"
          className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:border-indigo-400 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a la lista
        </Link>
      </div>

      {/* Cuerpo (mismo layout que el panel de edición) */}
      <div className="grid gap-6 p-5 sm:grid-cols-[1fr_280px]">
        {/* Izquierda: formulario */}
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Nombre *</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Lenovo ThinkPad E14 Gen 6"
                     className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Marca *</span>
              <input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ej: Lenovo"
                     className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Precio desde (COP)</span>
              <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Ej: 2500000"
                     className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Categoría</span>
              <select value={segmento} onChange={(e) => setSegmento(e.target.value as Segmento)}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                {SEGMENTOS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Descripción</span>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} placeholder="Descripción corta del producto…"
                      className="resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          </label>

          {/* Toggles de publicación */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Visibilidad y ubicación en el home</span>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setPublicado((v) => !v)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition
                  ${publicado ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-white text-zinc-500 hover:border-emerald-200"}`}>
                {publicado ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {publicado ? "Publicado en web ✓" : "Oculto (solo admin)"}
              </button>
              <button type="button" onClick={() => setDestacado((v) => !v)} disabled={!publicado}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40
                  ${destacado ? "border-amber-300 bg-amber-50 text-amber-700" : "border-zinc-200 bg-white text-zinc-500 hover:border-amber-200"}`}>
                <Star className={`h-4 w-4 ${destacado ? "fill-amber-400 text-amber-400" : ""}`} />
                {destacado ? "En Destacados (home) ✓" : "Agregar a Destacados"}
              </button>
              <button type="button" onClick={() => setEnAccesorios((v) => !v)} disabled={!publicado}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40
                  ${enAccesorios ? "border-orange-300 bg-orange-50 text-orange-700" : "border-zinc-200 bg-white text-zinc-500 hover:border-orange-200"}`}>
                <Package className="h-4 w-4" />
                {enAccesorios ? "En Accesorios & Esenciales ✓" : "Agregar a Accesorios & Esenciales"}
              </button>
              <button type="button" onClick={() => setEnPromocion((v) => !v)} disabled={!publicado}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40
                  ${enPromocion ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-zinc-200 bg-white text-zinc-500 hover:border-indigo-200"}`}>
                <Tag className={`h-4 w-4 ${enPromocion ? "fill-indigo-400 text-indigo-400" : ""}`} />
                {enPromocion ? "En Promociones ✓" : "Agregar a Promociones"}
              </button>
            </div>
            {!publicado && (
              <p className="text-[11px] text-zinc-400">
                Por defecto el producto nace <strong>oculto</strong> (visible solo en el panel). Actívalo en “Publicado en web” para poder ubicarlo en el home.
              </p>
            )}
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-red-600">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}

          {/* Crear */}
          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleCreate} disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Crear producto
            </button>
            <Link href="/admin/productos" className="text-sm font-semibold text-zinc-500 hover:text-zinc-800">
              Cancelar
            </Link>
          </div>
        </div>

        {/* Derecha: imágenes (se pueden subir antes de crear) */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Imágenes del producto</p>
          <ImageSlot identifier={referencia} tipo="card"    url={cardUrl}    onUrlChange={setCardUrl}    label="Card / Tarjeta" />
          <ImageSlot identifier={referencia} tipo="detalle" url={detalleUrl} onUrlChange={setDetalleUrl} label="Detalle / Catálogo" />
          <p className="text-[11px] leading-snug text-zinc-400">
            Puedes subir las imágenes ahora; se asocian al producto al crearlo.
          </p>
        </div>
      </div>
    </div>
  );
}
