"use client";

import { createElement, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, X, Check, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { NOMBRES_ICONO, iconoDe } from "@/lib/categories-icons";

/** Pinta el icono de una categoría a partir de su NOMBRE. Se usa `createElement` en vez
 *  de asignar el componente a una variable dentro del render: React no distingue entre
 *  "componente nuevo cada render" (que rompe la reconciliación) y "componente sacado de
 *  un registro estable", y esto último es lo que hacemos. */
function IconoCategoria({ nombre, className }: { nombre: string; className?: string }) {
  return createElement(iconoDe(nombre), { className });
}

// Gestión de la taxonomía desde Admin → Productos: crear, editar y borrar categorías,
// y lo mismo con los productos (líneas) que hay dentro de cada una.

type Estado = { cargando: boolean; error: string | null };
const INICIAL: Estado = { cargando: false, error: null };

async function llamar(metodo: "POST" | "PATCH" | "DELETE", cuerpo: Record<string, unknown>) {
  const res = await fetch("/api/admin/categorias", {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; slug?: string };
  if (!res.ok) throw new Error(data.error ?? "No se pudo completar la operación.");
  return data;
}

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";

/* ─── Crear categoría ─────────────────────────────────────────────────────── */

export function NuevaCategoria() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [icon, setIcon] = useState("Package");
  const [{ cargando, error }, setEstado] = useState(INICIAL);

  async function guardar() {
    setEstado({ cargando: true, error: null });
    try {
      const { slug } = await llamar("POST", { tipo: "categoria", nombre, descripcion, icon });
      setAbierto(false);
      setNombre(""); setDescripcion(""); setIcon("Package");
      setEstado(INICIAL);
      router.push(`/admin?categoria=${slug}`);
      router.refresh();
    } catch (e) {
      setEstado({ cargando: false, error: e instanceof Error ? e.message : "Error" });
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4" />
        Nueva categoría
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-zinc-900">Nueva categoría</p>
        <button onClick={() => { setAbierto(false); setEstado(INICIAL); }} className="text-zinc-400 hover:text-zinc-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-500">NOMBRE</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tarjetas de sonido" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-500">DESCRIPCIÓN</label>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Audio profesional para estudio" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-500">ICONO</label>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-white">
              <IconoCategoria nombre={icon} className="h-4 w-4 text-indigo-600" />
            </div>
            <select value={icon} onChange={(e) => setIcon(e.target.value)} className={inputCls}>
              {NOMBRES_ICONO.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={guardar}
          disabled={cargando || !nombre.trim()}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Crear categoría
        </button>
        <p className="text-xs text-zinc-500">
          La dirección web se genera del nombre y no cambia después, para no romper enlaces.
        </p>
      </div>
    </div>
  );
}

/* ─── Editar / borrar la categoría abierta ────────────────────────────────── */

export function AccionesCategoria({
  slug, nombre: nombreIni, descripcion: descIni, icon: iconIni, lineas,
}: { slug: string; nombre: string; descripcion: string; icon: string; lineas: number }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(nombreIni);
  const [descripcion, setDescripcion] = useState(descIni);
  const [icon, setIcon] = useState(iconIni);
  const [{ cargando, error }, setEstado] = useState(INICIAL);

  async function accion(fn: () => Promise<unknown>) {
    setEstado({ cargando: true, error: null });
    try {
      await fn();
      setEstado(INICIAL);
      setEditando(false);
      router.refresh();
    } catch (e) {
      setEstado({ cargando: false, error: e instanceof Error ? e.message : "Error" });
    }
  }

  if (editando) {
    return (
      <div className="w-full rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} placeholder="Nombre" />
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={inputCls} placeholder="Descripción" />
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-white">
              <IconoCategoria nombre={icon} className="h-4 w-4 text-indigo-600" />
            </div>
            <select value={icon} onChange={(e) => setIcon(e.target.value)} className={inputCls}>
              {NOMBRES_ICONO.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => accion(() => llamar("PATCH", { tipo: "categoria", slug, nombre, descripcion, icon }))}
            disabled={cargando}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar
          </button>
          <button onClick={() => { setEditando(false); setEstado(INICIAL); }} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-600">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // Solo EDITAR: las categorías no se crean desde el panel, así que borrar una sería una
  // puerta de un solo sentido — se llevaría sus productos y no habría forma de rehacerla.
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setEditando(true)} className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50">
        <Pencil className="h-3.5 w-3.5" /> Editar categoría
      </button>
      <span className="text-xs text-zinc-400">{lineas} producto(s)</span>
      {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
    </div>
  );
}

/* ─── Añadir producto (línea) a la categoría abierta ──────────────────────── */

/** Slug web del producto: "Logitech" + "MX Keys" → "logitech-mx-keys". Es la clave con
 *  la que se guarda su imagen, así que se muestra en vivo mientras se escribe. */
function slugDe(marca: string, nombre: string): string {
  return `${marca} ${nombre}`
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function NuevaLinea({ categoria }: { categoria: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [marca, setMarca] = useState("");
  const [nombre, setNombre] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [{ cargando, error }, setEstado] = useState(INICIAL);

  const slug = slugDe(marca, nombre);
  const listo = marca.trim() !== "" && nombre.trim() !== "";

  function elegirArchivo(f: File | null) {
    setArchivo(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function limpiar() {
    setMarca(""); setNombre(""); elegirArchivo(null); setEstado(INICIAL);
  }

  async function guardar() {
    setEstado({ cargando: true, error: null });
    try {
      await llamar("POST", { tipo: "linea", categoria, marca, nombre });
      // La imagen se sube DESPUÉS de crear el producto: se guarda bajo su slug, que solo
      // existe una vez creado. Si la subida falla, el producto ya quedó creado y la
      // imagen se puede añadir luego desde su fila.
      if (archivo) {
        const fd = new FormData();
        fd.append("file", archivo);
        fd.append("categoria", categoria);
        fd.append("slug", slug);
        const res = await fetch("/api/admin/upload-line-image", { method: "POST", body: fd });
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as { error?: string };
          setEstado({ cargando: false, error: "Producto creado, pero la imagen falló: " + (d.error ?? "error al subir") });
          router.refresh();
          return;
        }
      }
      limpiar();
      setAbierto(false);
      router.refresh();
    } catch (e) {
      setEstado({ cargando: false, error: e instanceof Error ? e.message : "Error" });
    }
  }

  if (!abierto) {
    return (
      <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
        <button
          onClick={() => setAbierto(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Agregar producto
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-indigo-100 bg-indigo-50/40 px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-zinc-900">Nuevo producto en esta categoría</p>
        <button onClick={() => { setAbierto(false); limpiar(); }} className="text-zinc-400 hover:text-zinc-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-500">IMAGEN</label>
          <label className="flex h-[76px] w-[104px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-zinc-300 bg-white transition hover:border-indigo-400">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Vista previa" className="h-full w-full object-contain p-1" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-[11px] font-semibold text-zinc-400">
                <Upload className="h-4 w-4" />
                Subir
              </span>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-zinc-500">MARCA</label>
          <input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Logitech" className={inputCls} />
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-zinc-500">LÍNEA</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="MX Keys" className={inputCls} />
        </div>
        <div className="min-w-[170px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-zinc-500">SLUG (automático)</label>
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-500">
            {slug || "—"}
          </p>
        </div>
      </div>

      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={guardar}
          disabled={cargando || !listo}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Crear producto
        </button>
        <button onClick={() => { setAbierto(false); limpiar(); }} className="text-sm font-semibold text-zinc-500 hover:text-zinc-800">
          Cancelar
        </button>
        <p className="text-xs text-zinc-500">Recomendado: 600×600 px, fondo blanco.</p>
      </div>
    </div>
  );
}

/* ─── Editar / borrar una línea ───────────────────────────────────────────── */

export function AccionesLinea({
  categoria, slug, marca: marcaIni, nombre: nombreIni,
}: { categoria: string; slug: string; marca: string; nombre: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [marca, setMarca] = useState(marcaIni);
  const [nombre, setNombre] = useState(nombreIni);
  const [{ cargando, error }, setEstado] = useState(INICIAL);

  async function accion(fn: () => Promise<unknown>) {
    setEstado({ cargando: true, error: null });
    try {
      await fn();
      setEstado(INICIAL);
      setAbierto(false);
      router.refresh();
    } catch (e) {
      setEstado({ cargando: false, error: e instanceof Error ? e.message : "Error" });
    }
  }

  // Mismo botón que en Marketing: pastilla con borde y chevron que despliega el panel
  // de edición debajo, en vez de iconos sueltos que no dicen qué hacen.
  return (
    <>
      <button
        onClick={() => setAbierto((o) => !o)}
        className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5
          text-xs font-semibold text-zinc-600 transition hover:border-indigo-400 hover:text-indigo-600"
      >
        {abierto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Editar
      </button>

      {abierto && (
        <div className="mt-2 w-full rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 text-left">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[140px] flex-1">
              <label className="mb-1 block text-[11px] font-semibold text-zinc-500">MARCA</label>
              <input value={marca} onChange={(e) => setMarca(e.target.value)} className={inputCls} />
            </div>
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-[11px] font-semibold text-zinc-500">LÍNEA</label>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
            </div>
            <div className="min-w-[150px] flex-1">
              <label className="mb-1 block text-[11px] font-semibold text-zinc-500">SLUG</label>
              <p className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-[11px] text-zinc-400">
                {slug}
              </p>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-zinc-400">
            El slug no cambia: es la clave con la que se guarda la imagen de este producto.
          </p>

          {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => accion(() => llamar("PATCH", { tipo: "linea", categoria, slug, marca, nombre }))}
              disabled={cargando || !marca.trim() || !nombre.trim()}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {cargando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Guardar
            </button>

            <button
              onClick={() => { setAbierto(false); setMarca(marcaIni); setNombre(nombreIni); setEstado(INICIAL); }}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-white"
            >
              Cancelar
            </button>

            <button
              onClick={() => (confirmar ? accion(() => llamar("DELETE", { tipo: "linea", categoria, slug })) : setConfirmar(true))}
              onBlur={() => setConfirmar(false)}
              disabled={cargando}
              className={"ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-60 " + (
                confirmar ? "bg-red-600 text-white hover:bg-red-700" : "border border-red-200 text-red-600 hover:bg-red-50"
              )}
            >
              {cargando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {confirmar ? "¿Seguro? Borrar" : "Borrar producto"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
