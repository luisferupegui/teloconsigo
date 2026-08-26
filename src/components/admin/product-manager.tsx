"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Star, Tag, Package, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, ImageIcon, Save, Loader2,
  Eye, EyeOff, Globe, Trash2,
} from "lucide-react";
import type { BusinessProduct, Segmento } from "@/lib/products-types";
import { formatCOP, SEGMENTOS, SEGMENTO_LABEL, SEGMENTO_COLOR, HOME_MAX } from "@/lib/products-types";
import { ImageSlot } from "./image-slot";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ManagedBusinessProduct = BusinessProduct & {
  cardUrl:    string | null;
  detalleUrl: string | null;
};

type PlacementFlag = "destacado" | "enAccesorios";

// ─── Badges de estado de publicación ───────────────────────────────────────────

function StatusBadges({
  publicado, destacado, enAccesorios, enPromocion,
}: { publicado: boolean; destacado: boolean; enAccesorios: boolean; enPromocion: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {publicado ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          <Globe className="h-3 w-3" /> Publicado
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
          <EyeOff className="h-3 w-3" /> Oculto
        </span>
      )}
      {publicado && destacado && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700" title="En Productos Destacados (home)">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Destacados
        </span>
      )}
      {publicado && enAccesorios && (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700" title="En Accesorios & Esenciales (home)">
          <Package className="h-3 w-3" /> Accesorios
        </span>
      )}
      {publicado && enPromocion && (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700" title="En Promociones">
          <Tag className="h-3 w-3" /> Promo
        </span>
      )}
    </div>
  );
}

// ─── Fila de producto (con panel inline expandible) ────────────────────────────

function ProductRow({
  product, destCount, accCount, onPlacement,
}: {
  product: ManagedBusinessProduct;
  destCount: number;
  accCount: number;
  onPlacement: (flag: PlacementFlag, delta: number) => void;
}) {
  const identifier = product.referencia ?? product.slug ?? product.id;

  const [open,   setOpen]   = useState(false);
  const [saving, startSave] = useTransition();
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  // Estado editable
  const [nombre,      setNombre]      = useState(product.nombre);
  const [marca,       setMarca]       = useState(product.marca);
  const [precio,      setPrecio]      = useState<string>(
    product.precioDesde != null ? String(product.precioDesde)
    : product.precio    != null ? String(product.precio) : "");
  const [descripcion, setDescripcion] = useState(product.descripcionUso ?? "");
  const [segmento,    setSegmento]    = useState<Segmento>((product.segmento as Segmento) ?? "productividad-oficina");
  const [publicado,   setPublicado]   = useState(product.publicado !== false);
  const [destacado,   setDestacado]   = useState(Boolean(product.destacado));
  const [enAccesorios,setEnAccesorios]= useState(Boolean(product.enAccesorios));
  const [enPromocion, setEnPromocion] = useState(Boolean(product.enPromocion));
  // Estado de imágenes elevado a la fila → persiste al cerrar/reabrir el panel.
  const [cardUrl,     setCardUrl]     = useState(product.cardUrl);


  // Toggle de sección del home: mantiene el contador global sincronizado.
  function togglePlacement(flag: PlacementFlag, current: boolean, setter: (v: boolean) => void) {
    const next = !current;
    setter(next);
    onPlacement(flag, next ? 1 : -1);
  }

  const destacadoFull   = destCount >= HOME_MAX;
  const accesoriosFull  = accCount  >= HOME_MAX;

  const [borrando, startBorrar] = useTransition();
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  // Borrar pide confirmación en el mismo botón (dos clics) en vez de un diálogo del
  // navegador: es irreversible y conviene que se vea qué se va a borrar.
  function handleDelete() {
    setError(null);
    startBorrar(async () => {
      const res = await fetch("/api/admin/product", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referencia: identifier }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) window.location.reload();
      else setError((data as { error?: string }).error ?? "No se pudo borrar.");
    });
  }

  async function handleSave() {
    setError(null);
    startSave(async () => {
      const res = await fetch("/api/admin/product", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          referencia:     identifier,
          nombre,
          marca,
          precioDesde:    precio !== "" ? Number(precio) : null,
          descripcionUso: descripcion,
          segmento,
          publicado,
          destacado,
          enAccesorios,
          enPromocion,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError((data as { error?: string }).error ?? "No se pudo guardar.");
      }
    });
  }

  const precioMostrar =
    product.precioDesde != null ? formatCOP(product.precioDesde)
    : product.precio    != null ? formatCOP(product.precio) : "—";

  return (
    <div className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors
      ${open ? "border-indigo-300" : "border-zinc-200"} ${!publicado ? "opacity-90" : ""}`}>
      {/* ── Header / fila ── */}
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
        {/* Thumbnail */}
        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {cardUrl ? (
            <Image src={cardUrl} alt={product.nombre} fill sizes="64px" className="object-contain p-1" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center"><ImageIcon className="h-5 w-5 text-zinc-300" /></div>
          )}
        </div>

        {/* Producto */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-zinc-900">{product.nombre}</p>
          <p className="truncate text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-600">{product.marca}</span>
            {product.referencia && <> · <span className="font-mono">{product.referencia}</span></>}
          </p>
          {/* Estado en móvil */}
          <div className="mt-1 sm:hidden">
            <StatusBadges publicado={publicado} destacado={destacado} enAccesorios={enAccesorios} enPromocion={enPromocion} />
          </div>
        </div>

        {/* Categoría */}
        <div className="hidden w-44 shrink-0 md:block">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${SEGMENTO_COLOR[segmento] ?? "bg-zinc-100 text-zinc-600"}`}>
            {SEGMENTO_LABEL[segmento] ?? segmento}
          </span>
        </div>

        {/* Precio */}
        <div className="hidden w-28 shrink-0 text-right text-sm font-semibold text-zinc-900 sm:block">
          {precioMostrar}
        </div>

        {/* Estado (desktop) */}
        <div className="hidden w-44 shrink-0 sm:block">
          <StatusBadges publicado={publicado} destacado={destacado} enAccesorios={enAccesorios} enPromocion={enPromocion} />
        </div>

        {/* Acción */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5
            text-xs font-semibold text-zinc-600 hover:border-indigo-400 hover:text-indigo-600 transition"
        >
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Editar
        </button>
      </div>

      {/* ── Panel de edición ── */}
      {open && (
        <div className="grid gap-6 border-t border-zinc-100 bg-zinc-50/50 p-5 sm:grid-cols-[1fr_280px]">
          {/* Izquierda: formulario */}
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Nombre</span>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                       className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Marca</span>
                <input value={marca} onChange={(e) => setMarca(e.target.value)}
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
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3}
                        className="resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
            </label>

            {/* Visibilidad y ubicación en el home */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Visibilidad y ubicación en el home</span>
                <span className="text-[10px] font-semibold text-zinc-400">
                  Destacados {destCount}/{HOME_MAX} · Accesorios {accCount}/{HOME_MAX}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setPublicado((v) => !v)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition
                    ${publicado ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-white text-zinc-500 hover:border-emerald-200"}`}
                >
                  {publicado ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {publicado ? "Publicado en web ✓" : "Oculto (solo admin)"}
                </button>
                <button
                  onClick={() => togglePlacement("destacado", destacado, setDestacado)}
                  disabled={!destacado && destacadoFull}
                  title={!destacado && destacadoFull ? `Sección Destacados llena (${HOME_MAX}/${HOME_MAX})` : ""}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40
                    ${destacado ? "border-amber-300 bg-amber-50 text-amber-700" : "border-zinc-200 bg-white text-zinc-500 hover:border-amber-200"}`}
                >
                  <Star className={`h-4 w-4 ${destacado ? "fill-amber-400 text-amber-400" : ""}`} />
                  {destacado ? "En Destacados ✓" : (!destacado && destacadoFull ? `Destacados lleno (${HOME_MAX}/${HOME_MAX})` : "Agregar a Destacados")}
                </button>
                <button
                  onClick={() => togglePlacement("enAccesorios", enAccesorios, setEnAccesorios)}
                  disabled={!enAccesorios && accesoriosFull}
                  title={!enAccesorios && accesoriosFull ? `Sección Accesorios llena (${HOME_MAX}/${HOME_MAX})` : ""}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40
                    ${enAccesorios ? "border-orange-300 bg-orange-50 text-orange-700" : "border-zinc-200 bg-white text-zinc-500 hover:border-orange-200"}`}
                >
                  <Package className="h-4 w-4" />
                  {enAccesorios ? "En Accesorios & Esenciales ✓" : (!enAccesorios && accesoriosFull ? `Accesorios lleno (${HOME_MAX}/${HOME_MAX})` : "Agregar a Accesorios & Esenciales")}
                </button>
                <button
                  onClick={() => setEnPromocion((v) => !v)}
                                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40
                    ${enPromocion ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-zinc-200 bg-white text-zinc-500 hover:border-indigo-200"}`}
                >
                  <Tag className={`h-4 w-4 ${enPromocion ? "fill-indigo-400 text-indigo-400" : ""}`} />
                  {enPromocion ? "En Promociones ✓" : "Agregar a Promociones"}
                </button>
              </div>
              {!publicado && (
                <p className="text-[11px] text-zinc-400">
                  El producto está <strong>oculto en la web</strong> (visible solo aquí). Publícalo para poder ubicarlo en el home.
                </p>
              )}
            </div>

            {/* Guardar */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar cambios
              </button>

              <button
                onClick={() => (confirmarBorrado ? handleDelete() : setConfirmarBorrado(true))}
                onBlur={() => setConfirmarBorrado(false)}
                disabled={borrando}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-60 ${
                  confirmarBorrado
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "border border-red-200 text-red-600 hover:bg-red-50"
                }`}
              >
                {borrando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {confirmarBorrado ? "¿Seguro? Borrar" : "Borrar"}
              </button>
              {saved && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Guardado
                </span>
              )}
              {error && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-red-600">
                  <AlertCircle className="h-4 w-4" /> {error}
                </span>
              )}
            </div>
          </div>

          {/* Derecha: imágenes */}
          <div className="space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Imagen del producto</p>
            <ImageSlot identifier={identifier} tipo="card" url={cardUrl} onUrlChange={setCardUrl} label="Imagen del producto" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Manager principal ─────────────────────────────────────────────────────────

export function ProductManager({
  products,
  initialFilter = "all",
}: {
  products: ManagedBusinessProduct[];
  initialFilter?: string;
}) {
  const [filter, setFilter] = useState<string>(initialFilter);
  const [query,  setQuery]  = useState("");

  // Contadores vivos de las secciones del home (tope HOME_MAX por sección).
  const [destCount, setDestCount] = useState(() => products.filter((p) => p.destacado).length);
  const [accCount,  setAccCount]  = useState(() => products.filter((p) => p.enAccesorios).length);
  const onPlacement = useCallback((flag: PlacementFlag, delta: number) => {
    if (flag === "destacado") setDestCount((c) => c + delta);
    else setAccCount((c) => c + delta);
  }, []);

  const stats = useMemo(() => ({
    total:      products.length,
    publicados: products.filter((p) => p.publicado !== false).length,
    promos:     products.filter((p) => p.enPromocion).length,
    sinImg:     products.filter((p) => !p.cardUrl).length,
  }), [products]);

  const filtered = useMemo(() => products.filter((p) => {
    const matchFilter =
      filter === "all"          ? true
      : filter === "publicado"   ? p.publicado !== false
      : filter === "oculto"      ? p.publicado === false
      : filter === "destacado"   ? Boolean(p.destacado)
      : filter === "accesorios"  ? Boolean(p.enAccesorios)
      : filter === "promo"       ? Boolean(p.enPromocion)
      : filter === "sin-img"     ? !p.cardUrl
      : p.segmento === filter; // un segmento concreto
    const q = query.toLowerCase().trim();
    const matchQ = !q
      || p.nombre.toLowerCase().includes(q)
      || p.marca.toLowerCase().includes(q)
      || (p.referencia ?? "").toLowerCase().includes(q);
    return matchFilter && matchQ;
  }), [products, filter, query]);

  return (
    <div>
      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total",        value: stats.total,                  color: "text-zinc-900"   },
          { label: "Publicados",   value: stats.publicados,             color: "text-emerald-600" },
          { label: "Destacados",   value: `${destCount}/${HOME_MAX}`,   color: "text-amber-600"  },
          { label: "Accesorios",   value: `${accCount}/${HOME_MAX}`,    color: "text-orange-600" },
          { label: "Promociones",  value: stats.promos,                 color: "text-indigo-600" },
          { label: "Sin imagen",   value: stats.sinImg,                 color: "text-rose-500"   },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Buscar por nombre, marca, referencia…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[200px] flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="all">Todos los productos</option>
          <option value="publicado">🌐 Publicados</option>
          <option value="oculto">🚫 Ocultos</option>
          <option value="destacado">⭐ Destacados (home)</option>
          <option value="accesorios">🧰 Accesorios & Esenciales</option>
          <option value="promo">🏷️ En Promociones</option>
          <option value="sin-img">🖼️ Sin imagen</option>
          <option disabled>──── Categoría ────</option>
          {SEGMENTOS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Encabezado de columnas + contador integrado */}
      <div className="hidden rounded-t-xl border border-zinc-200 bg-zinc-50 sm:block">
        <div className="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          <span className="w-16 shrink-0" />
          <span className="flex-1">
            Producto
            <span className="ml-2 font-semibold normal-case tracking-normal text-zinc-400">
              ({filtered.length} {filtered.length !== 1 ? "resultados" : "resultado"}{query && ` · "${query}"`})
            </span>
          </span>
          <span className="hidden w-44 shrink-0 md:block">Categoría</span>
          <span className="w-28 shrink-0 text-center">Precio</span>
          <span className="w-44 shrink-0 text-center">Estado</span>
          <span className="w-[68px] shrink-0 text-center">Acción</span>
        </div>
      </div>

      {/* Contador para móvil */}
      <p className="mb-3 text-xs text-zinc-400 sm:hidden">
        {filtered.length} producto{filtered.length !== 1 ? "s" : ""}{query && ` para "${query}"`}
      </p>

      <div className="space-y-2 rounded-b-xl border-x border-b border-zinc-200 p-3 sm:mt-0">
        {filtered.map((p) => (
          <ProductRow
            key={p.referencia ?? p.id}
            product={p}
            destCount={destCount}
            accCount={accCount}
            onPlacement={onPlacement}
          />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-zinc-200 py-16 text-center">
            <p className="text-sm font-semibold text-zinc-500">Sin resultados</p>
          </div>
        )}
      </div>
    </div>
  );
}
