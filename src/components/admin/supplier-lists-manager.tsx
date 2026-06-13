"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import {
  Upload, FileText, Loader2, CheckCircle2, AlertCircle, X, Sparkles,
  Package, Search, Trash2, KeyRound, Eye, EyeOff, Power, Store, ListChecks, ChevronDown,
  Star, Tag, Pencil,
} from "lucide-react";
import { ImageSlot } from "@/components/admin/image-slot";

// ─── Tipos ──────────────────────────────────────────────────────────────────

type KeyStatus = { hasKey: boolean; masked: string | null; source: "panel" | "env" | null };

type ListMeta = {
  id: string; nombre: string; proveedor: string; fecha: string;
  paginas: number; caracteres: number; activa: boolean; productos: number;
};
type Totals = { listas: number; listasActivas: number; productosActivos: number };

type ListProduct = {
  id: string; nombre: string; marca: string; categoria: string;
  referencia: string; precio_costo: number; precio_final: number;
};

type SearchMatch = {
  id: string; nombre: string; marca: string; categoria: string; referencia: string;
  specs: Record<string, string>; precio_costo: number; precio_final: number; margen: number;
  proveedor: string; listaId: string; listaNombre: string; esMasBarato: boolean;
};

// ─── Constantes ──────────────────────────────────────────────────────────────

const PROVEEDORES = ["ledacom", "infoshopcorp", "otro"];

// Mapea la categoría del proveedor a los campos del catálogo público.
const CAT_MAP: Record<string, { categoria: string; usoCaso: string; segmento: string }> = {
  portatil:          { categoria: "portatil", usoCaso: "portatil-oficina", segmento: "productividad-oficina" },
  monitor:           { categoria: "monitor",  usoCaso: "monitor",          segmento: "monitores" },
  escritorio:        { categoria: "pc",        usoCaso: "pc-empresarial",  segmento: "productividad-oficina" },
  procesador:        { categoria: "accesorio", usoCaso: "accesorio",       segmento: "creadores-produccion" },
  motherboard:       { categoria: "accesorio", usoCaso: "accesorio",       segmento: "creadores-produccion" },
  "memoria-ram":     { categoria: "accesorio", usoCaso: "accesorio",       segmento: "creadores-produccion" },
  almacenamiento:    { categoria: "accesorio", usoCaso: "accesorio",       segmento: "creadores-produccion" },
  "tarjeta-grafica": { categoria: "accesorio", usoCaso: "accesorio",       segmento: "gaming-streaming" },
  "fuente-poder":    { categoria: "accesorio", usoCaso: "accesorio",       segmento: "creadores-produccion" },
  refrigeracion:     { categoria: "accesorio", usoCaso: "accesorio",       segmento: "gaming-streaming" },
  redes:             { categoria: "accesorio", usoCaso: "accesorio",       segmento: "redes-servidores" },
  mouse:             { categoria: "accesorio", usoCaso: "accesorio",       segmento: "accesorios" },
  teclado:           { categoria: "accesorio", usoCaso: "accesorio",       segmento: "accesorios" },
  auriculares:       { categoria: "accesorio", usoCaso: "accesorio",       segmento: "accesorios" },
  impresora:         { categoria: "accesorio", usoCaso: "accesorio",       segmento: "productividad-oficina" },
  accesorios:        { categoria: "accesorio", usoCaso: "accesorio",       segmento: "accesorios" },
};
const mapCat = (c: string) => CAT_MAP[c] ?? { categoria: "accesorio", usoCaso: "accesorio", segmento: "accesorios" };

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}
function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

type Toast = { ok: boolean; msg: string };

type PublishTarget = "catalogo" | "destacado" | "promocion";

type PublishableProduct = {
  nombre: string; marca: string; categoria: string;
  referencia?: string; precio_final: number; specs?: Record<string, string>;
};

type EditorState = {
  referencia: string;
  nombre: string;
  marca: string;
  precio: number;
  segmento: string;
  descripcionUso: string;
  destacado: boolean;
  enPromocion: boolean;
  imageUrl: string | null;
};

const SEGMENTOS: [string, string][] = [
  ["productividad-oficina", "Productividad / Oficina"],
  ["gaming-streaming",      "Gaming / Streaming"],
  ["hogar-estudio",         "Hogar / Estudio"],
  ["movilidad-premium",     "Movilidad Premium"],
  ["redes-servidores",      "Redes / Servidores"],
  ["creadores-produccion",  "Creadores / Producción"],
  ["smart-home",            "Smart Home"],
  ["monitores",             "Monitores"],
  ["accesorios",            "Accesorios"],
];

// Publica un producto del proveedor al catálogo público (con margen ya aplicado).
async function publishToStore(p: PublishableProduct, target: PublishTarget): Promise<{ ok: boolean; error?: string; referencia?: string }> {
  const map = mapCat(p.categoria);
  const res = await fetch("/api/admin/product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: p.nombre,
      marca: p.marca,
      precio: p.precio_final,
      precioDesde: p.precio_final,
      referencia: p.referencia || undefined,
      categoria: map.categoria,
      usoCaso: map.usoCaso,
      segmento: map.segmento,
      publicado: true,
      destacado: target === "destacado",
      enPromocion: target === "promocion",
      descripcionUso: Object.values(p.specs ?? {}).slice(0, 3).join(" · "),
    }),
  });
  const data = await res.json();
  return res.ok ? { ok: true, referencia: data.referencia } : { ok: false, error: data.error };
}

const TARGET_LABEL: Record<PublishTarget, string> = {
  catalogo: "el catálogo",
  destacado: "Destacados",
  promocion: "Promociones",
};

// ─── Componente principal ─────────────────────────────────────────────────────

export function SupplierListsManager() {
  const [tab, setTab] = useState<"cargar" | "listas" | "buscar">("cargar");
  const [toast, setToast] = useState<Toast | null>(null);
  const flash = useCallback((ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // ── Clave API ──
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const refreshKey = useCallback(async () => {
    try { setKeyStatus(await (await fetch("/api/admin/settings")).json()); } catch { /* ignore */ }
  }, []);
  useEffect(() => { refreshKey(); }, [refreshKey]);

  // ── Listas ──
  const [lists, setLists] = useState<ListMeta[]>([]);
  const [totals, setTotals] = useState<Totals>({ listas: 0, listasActivas: 0, productosActivos: 0 });
  const refreshLists = useCallback(async () => {
    try {
      const d = await (await fetch("/api/admin/supplier-lists")).json();
      setLists(d.lists ?? []);
      setTotals(d.totals ?? { listas: 0, listasActivas: 0, productosActivos: 0 });
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { refreshLists(); }, [refreshLists]);

  return (
    <div className="space-y-5">
      <ApiKeyPanel status={keyStatus} onChange={refreshKey} flash={flash} />

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-white p-1 w-fit shadow-sm">
        {([
          ["cargar", Upload,     "Cargar lista"],
          ["listas", ListChecks, `Listas cargadas${totals.listas ? ` (${totals.listas})` : ""}`],
          ["buscar", Search,     "Buscar productos"],
        ] as const).map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === id ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "cargar" && (
        <CargarTab
          onImported={(n) => { flash(true, `${n} productos importados como nueva lista`); refreshLists(); setTab("listas"); }}
          flash={flash}
        />
      )}
      {tab === "listas" && (
        <ListasTab lists={lists} totals={totals} onRefresh={refreshLists} flash={flash} />
      )}
      {tab === "buscar" && (
        <BuscarTab totals={totals} flash={flash} />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${toast.ok ? "bg-emerald-500" : "bg-red-500"}`}>
            {toast.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel de la clave API ─────────────────────────────────────────────────────

function ApiKeyPanel({ status, onChange, flash }: {
  status: KeyStatus | null; onChange: () => void; flash: (ok: boolean, msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { flash(false, data.error ?? "Error al guardar la clave"); return; }
      if (data.valid) {
        flash(true, "Clave válida y guardada ✓");
        setEditing(false); setValue("");
      } else {
        flash(false, data.error ?? "La clave no es válida");
      }
      onChange();
    } catch {
      flash(false, "Error de red al guardar la clave");
    } finally {
      setSaving(false);
    }
  }

  const configured = status?.hasKey ?? false;

  // Banner cuando NO hay clave o cuando el usuario decide cambiarla
  if (!configured || editing) {
    return (
      <div className={`rounded-2xl border p-5 ${configured ? "border-zinc-200 bg-white" : "border-amber-300 bg-amber-50"}`}>
        <div className="flex items-start gap-3">
          <KeyRound className={`h-5 w-5 shrink-0 mt-0.5 ${configured ? "text-zinc-500" : "text-amber-600"}`} />
          <div className="flex-1">
            <p className={`text-sm font-bold ${configured ? "text-zinc-900" : "text-amber-900"}`}>
              {configured ? "Cambiar clave API de Anthropic" : "Falta configurar la clave API de Anthropic"}
            </p>
            <p className={`mt-0.5 text-xs ${configured ? "text-zinc-500" : "text-amber-700"}`}>
              Sin una clave válida la extracción con IA falla con error 401. Consíguela en{" "}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="font-semibold underline">
                console.anthropic.com
              </a>{" "}(empieza por <code className="rounded bg-black/5 px-1">sk-ant-</code>).
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[260px]">
                <input
                  type={show ? "text" : "password"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="sk-ant-api03-…"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-9 text-sm font-mono focus:border-indigo-400 focus:outline-none"
                />
                <button type="button" onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button onClick={save} disabled={saving || value.trim() === ""}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Guardar y probar
              </button>
              {configured && (
                <button onClick={() => { setEditing(false); setValue(""); }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-700">
                  Cancelar
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-zinc-400">
              Se guarda en el servidor (archivo ignorado por git). No necesitas reiniciar nada.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Estado compacto cuando SÍ hay clave
  return (
    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <span className="font-semibold text-emerald-900">Clave API configurada</span>
        <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs text-emerald-800">{status?.masked}</code>
        <span className="text-xs text-emerald-700">· fuente: {status?.source === "panel" ? "panel" : ".env.local"}</span>
      </div>
      <button onClick={() => setEditing(true)}
        className="text-xs font-semibold text-emerald-700 underline hover:text-emerald-900">
        Cambiar
      </button>
    </div>
  );
}

// ─── Tab: Cargar lista (Word / Excel) ──────────────────────────────────────────

function CargarTab({ onImported, flash }: {
  onImported: (n: number) => void; flash: (ok: boolean, msg: string) => void;
}) {
  const [fileName, setFileName] = useState("");
  const [proveedor, setProveedor] = useState("ledacom");
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".docx") && !lower.endsWith(".xlsx")) {
      flash(false, "Solo se aceptan Word (.docx) o Excel (.xlsx)");
      return;
    }
    fileRef.current = file;
    setFileName(file.name);
  }

  function reset() {
    fileRef.current = null;
    setFileName("");
  }

  async function handleImport() {
    if (!fileRef.current) return;
    setImporting(true);
    try {
      // Extracción determinista en el servidor: lee las celdas de la tabla.
      // No usa IA ni clave API — es gratis e instantáneo.
      const fd = new FormData();
      fd.append("file", fileRef.current);
      fd.append("proveedor", proveedor);
      fd.append("nombre", fileName);
      const res = await fetch("/api/admin/import-doc-catalog", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al importar");
      onImported(data.count ?? 0);
      reset();
    } catch (err) {
      flash(false, err instanceof Error ? err.message : "Error al importar");
    } finally {
      setImporting(false);
    }
  }

  const isExcel = fileName.toLowerCase().endsWith(".xlsx");

  if (!fileName) {
    return (
      <div
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-16 transition hover:border-indigo-400 hover:bg-indigo-50/30"
      >
        <FileText className="h-12 w-12 text-zinc-300" />
        <div className="text-center">
          <p className="text-sm font-bold text-zinc-700">Subir lista de precios — Word o Excel</p>
          <p className="mt-1 text-xs text-zinc-400">
            Se lee la tabla directamente (gratis, sin IA) · archivos <strong>.docx</strong> o <strong>.xlsx</strong> · Máx. 20 MB
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">
          <Upload className="h-4 w-4" /> Seleccionar archivo
        </div>
        <input ref={inputRef} type="file" accept=".docx,.xlsx" className="hidden" onChange={handleFile} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-zinc-900">{isExcel ? "📊" : "📄"} {fileName}</p>
          <p className="text-xs text-zinc-400">
            {isExcel ? "Excel" : "Word"} · se extraerán los productos de la tabla (gratis, sin IA)
          </p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-500 hover:border-red-300 hover:text-red-500 transition"
        >
          <X className="h-3.5 w-3.5" /> Cargar otro
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Proveedor</span>
          <select
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          >
            {PROVEEDORES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </label>

        <button
          onClick={handleImport}
          disabled={importing}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 transition"
        >
          {importing
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Importando…</>
            : <><Sparkles className="h-4 w-4" /> Importar lista</>}
        </button>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        Consejo: si un producto queda con la categoría equivocada, puedes ajustarla al publicarlo.
        La lista más confiable es un Excel/Word con columnas <strong>Producto · Precio · Código</strong>.
      </p>
    </div>
  );
}

// ─── Tab: Listas cargadas ──────────────────────────────────────────────────────

function ListasTab({ lists, totals, onRefresh, flash }: {
  lists: ListMeta[]; totals: Totals; onRefresh: () => void; flash: (ok: boolean, msg: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [prodCache, setProdCache] = useState<Record<string, ListProduct[]>>({});
  const [loadingProds, setLoadingProds] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [published, setPublished] = useState<Record<string, PublishTarget>>({});
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editors, setEditors] = useState<Record<string, EditorState>>({});
  // selectedProducts[listId] = Set de product.id seleccionados para descartar
  const [selectedProducts, setSelectedProducts] = useState<Record<string, Set<string>>>({});
  const [discarding, setDiscarding] = useState<string | null>(null); // listId en proceso

  function toggleSelect(listId: string, productId: string) {
    setSelectedProducts((prev) => {
      const set = new Set(prev[listId] ?? []);
      if (set.has(productId)) set.delete(productId); else set.add(productId);
      return { ...prev, [listId]: set };
    });
  }

  function toggleSelectAll(listId: string) {
    const prods = prodCache[listId] ?? [];
    const sel = selectedProducts[listId];
    const allSel = prods.length > 0 && prods.every((p) => sel?.has(p.id));
    setSelectedProducts((prev) => ({
      ...prev,
      [listId]: allSel ? new Set() : new Set(prods.map((p) => p.id)),
    }));
  }

  async function discardSelected(listId: string) {
    const ids = Array.from(selectedProducts[listId] ?? []);
    if (ids.length === 0) return;
    setDiscarding(listId);
    try {
      const res = await fetch("/api/admin/supplier-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteProducts", listId, productIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) { flash(false, data.error ?? "No se pudo descartar"); return; }
      setProdCache((prev) => ({
        ...prev,
        [listId]: (prev[listId] ?? []).filter((p) => !ids.includes(p.id)),
      }));
      setSelectedProducts((prev) => ({ ...prev, [listId]: new Set() }));
      flash(true, `${data.deleted} producto${data.deleted !== 1 ? "s" : ""} descartado${data.deleted !== 1 ? "s" : ""}`);
      onRefresh();
    } catch {
      flash(false, "Error de red al descartar");
    } finally {
      setDiscarding(null);
    }
  }

  function updateEditor(rowKey: string, updates: Partial<EditorState>) {
    setEditors(prev => ({ ...prev, [rowKey]: { ...prev[rowKey], ...updates } }));
  }

  function openEditor(rowKey: string, p: ListProduct) {
    if (!editors[rowKey]) {
      // Reusar la referencia original del proveedor para que:
      // 1. La imagen se guarde en /productos/{referencia}/card.png (ruta correcta)
      // 2. "Publicar" actualice el producto si ya fue publicado antes (evita duplicados)
      const ref = p.referencia.trim() || `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setEditors(prev => ({
        ...prev,
        [rowKey]: {
          referencia: ref,
          nombre:      p.nombre,
          marca:       p.marca,
          precio:      p.precio_final,
          segmento:    mapCat(p.categoria).segmento,
          descripcionUso: "",
          destacado:   false,
          enPromocion: false,
          imageUrl:    null,
        },
      }));
    }
    setEditingRow(prev => (prev === rowKey ? null : rowKey));
  }

  async function doPublishEditor(rowKey: string, data: EditorState, p: ListProduct) {
    const map = mapCat(p.categoria);
    // Siempre usar la referencia original del proveedor como clave canónica.
    // Esto garantiza que el producto publicado se encuentre por su referencia real,
    // independientemente de si el editor abrió con una referencia pdf-xxx vieja.
    const effectiveRef = p.referencia.trim() || data.referencia;
    const payload = {
      nombre:         data.nombre,
      marca:          data.marca,
      precio:         data.precio,
      precioDesde:    data.precio,
      referencia:     effectiveRef,
      categoria:      map.categoria,
      usoCaso:        map.usoCaso,
      segmento:       data.segmento,
      publicado:      true,
      destacado:      data.destacado,
      enPromocion:    data.enPromocion,
      descripcionUso: data.descripcionUso || "",
    };

    // POST crea el producto; si ya existe (409 conflicto), PATCH lo actualiza
    let res = await fetch("/api/admin/product", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    if (res.status === 409) {
      res = await fetch("/api/admin/product", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
    }

    const result = await res.json();
    if (!res.ok) { flash(false, result.error ?? "No se pudo guardar"); return; }
    // Sincronizar referencia en el editor (por si era un pdf-xxx viejo)
    if (data.referencia !== effectiveRef) {
      updateEditor(rowKey, { referencia: effectiveRef });
    }
    setPublished(m => ({ ...m, [rowKey]: "catalogo" }));
    setEditingRow(null);
    flash(true, `"${data.nombre.slice(0, 40)}" guardado en el catálogo`);
  }

  async function doPublish(p: ListProduct, target: PublishTarget, rowKey: string) {
    setPublishingId(rowKey);
    try {
      const r = await publishToStore(p, target);
      if (!r.ok) { flash(false, r.error ?? "No se pudo publicar"); return; }
      setPublished((m) => ({ ...m, [rowKey]: target }));
      flash(true, `“${p.nombre.slice(0, 40)}” publicado a ${TARGET_LABEL[target]}`);
    } catch {
      flash(false, "Error de red al publicar");
    } finally {
      setPublishingId(null);
    }
  }

  async function restore() {
    setRestoring(true);
    try {
      const res = await fetch("/api/admin/supplier-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data = await res.json();
      if (!res.ok) { flash(false, data.error ?? "No hay backup para restaurar"); return; }
      flash(true, `Restauradas ${data.restored} lista(s) desde el backup`);
      onRefresh();
    } catch {
      flash(false, "Error al restaurar");
    } finally {
      setRestoring(false);
    }
  }

  async function toggleExpand(l: ListMeta) {
    if (expanded === l.id) { setExpanded(null); return; }
    setExpanded(l.id);
    if (!prodCache[l.id]) {
      setLoadingProds(l.id);
      try {
        const d = await (await fetch(`/api/admin/supplier-lists?id=${encodeURIComponent(l.id)}`)).json();
        setProdCache((c) => ({ ...c, [l.id]: d.productos ?? [] }));
      } catch {
        flash(false, "No se pudieron cargar los productos");
      } finally {
        setLoadingProds(null);
      }
    }
  }

  async function toggle(l: ListMeta) {
    setBusy(l.id);
    try {
      const res = await fetch("/api/admin/supplier-lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: l.id, activa: !l.activa }),
      });
      if (!res.ok) { flash(false, "No se pudo actualizar la lista"); return; }
      onRefresh();
    } finally { setBusy(null); }
  }

  async function remove(l: ListMeta) {
    if (!confirm(`¿Eliminar la lista "${l.nombre}" y sus ${l.productos} productos?`)) return;
    setBusy(l.id);
    try {
      const res = await fetch("/api/admin/supplier-lists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: l.id }),
      });
      if (!res.ok) { flash(false, "No se pudo eliminar la lista"); return; }
      flash(true, "Lista eliminada");
      onRefresh();
    } finally { setBusy(null); }
  }

  if (lists.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-16 text-center">
        <Package className="mx-auto h-10 w-10 text-zinc-300" />
        <p className="mt-3 text-sm font-semibold text-zinc-600">Aún no has cargado ninguna lista</p>
        <p className="text-xs text-zinc-400">Sube un Word (.docx) o Excel (.xlsx) en la pestaña “Cargar lista” para empezar.</p>
        <button
          onClick={restore}
          disabled={restoring}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 transition"
        >
          {restoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
          ¿Borraste una lista por error? Restaurar último backup
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Stat label="Listas" value={totals.listas} />
        <Stat label="Listas activas" value={totals.listasActivas} tone="emerald" />
        <Stat label="Productos activos" value={totals.productosActivos} tone="indigo" />
      </div>

      <div className="grid gap-3">
        {lists.map((l) => (
          <div key={l.id}
            className={`rounded-xl border transition ${
              l.activa ? "border-emerald-200 bg-white" : "border-zinc-200 bg-zinc-50/60"
            }`}
          >
            <div className={`flex flex-wrap items-center justify-between gap-3 p-4 ${l.activa ? "" : "opacity-80"}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText className={`h-4 w-4 shrink-0 ${l.activa ? "text-emerald-600" : "text-zinc-400"}`} />
                  <p className="truncate text-sm font-bold text-zinc-900">{l.nombre}</p>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-600 capitalize">{l.proveedor}</span>
                  <span><strong className="text-zinc-700">{l.productos}</strong> productos</span>
                  {l.paginas > 0 && <span>{l.paginas} págs.</span>}
                  <span>{formatDate(l.fecha)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleExpand(l)}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold text-zinc-600 hover:border-indigo-300 hover:text-indigo-600 transition"
                >
                  {loadingProds === l.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <ChevronDown className={`h-3.5 w-3.5 transition ${expanded === l.id ? "rotate-180" : ""}`} />}
                  Ver productos
                </button>
                <button
                  onClick={() => toggle(l)}
                  disabled={busy === l.id}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                    l.activa ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                             : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300"
                  }`}
                >
                  {busy === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                  {l.activa ? "Activa" : "Inactiva"}
                </button>
                <button
                  onClick={() => remove(l)}
                  disabled={busy === l.id}
                  className="rounded-lg border border-zinc-300 p-2 text-zinc-400 hover:border-red-300 hover:text-red-500 disabled:opacity-50 transition"
                  title="Eliminar lista"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {expanded === l.id && (
              <div className="border-t border-zinc-100">
                {loadingProds === l.id ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-sm text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando productos…
                  </div>
                ) : (prodCache[l.id]?.length ?? 0) === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-zinc-400">Esta lista no tiene productos.</p>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto">
                    {/* Barra de selección — aparece solo cuando hay productos seleccionados */}
                    {(selectedProducts[l.id]?.size ?? 0) > 0 && (
                      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-2">
                        <span className="text-xs font-semibold text-red-700">
                          {selectedProducts[l.id].size} producto{selectedProducts[l.id].size !== 1 ? "s" : ""} seleccionado{selectedProducts[l.id].size !== 1 ? "s" : ""}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedProducts((prev) => ({ ...prev, [l.id]: new Set() }))}
                            className="text-xs font-semibold text-red-500 underline hover:text-red-700"
                          >
                            Limpiar selección
                          </button>
                          <button
                            onClick={() => discardSelected(l.id)}
                            disabled={discarding === l.id}
                            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 transition"
                          >
                            {discarding === l.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                            Descartar seleccionados
                          </button>
                        </div>
                      </div>
                    )}
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-zinc-50 text-zinc-500 uppercase tracking-wider border-b border-zinc-100">
                        <tr>
                          <th className="px-3 py-2 text-center font-semibold w-8">
                            <input
                              type="checkbox"
                              title="Seleccionar todos"
                              checked={(prodCache[l.id]?.length ?? 0) > 0 && (prodCache[l.id] ?? []).every((p) => selectedProducts[l.id]?.has(p.id))}
                              onChange={() => toggleSelectAll(l.id)}
                              className="h-3.5 w-3.5 cursor-pointer rounded accent-red-600"
                            />
                          </th>
                          <th className="px-4 py-2 text-left font-semibold">Producto</th>
                          <th className="px-4 py-2 text-left font-semibold">Categoría</th>
                          <th className="px-4 py-2 text-right font-semibold">Costo</th>
                          <th className="px-4 py-2 text-right font-semibold text-[#1e6cff]">Precio cliente</th>
                          <th className="px-4 py-2 text-right font-semibold">Publicar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {(prodCache[l.id] ?? []).map((p, idx) => {
                          const rowKey = `${l.id}-${idx}`;
                          const isEditing = editingRow === rowKey;
                          return (
                          <Fragment key={rowKey}>
                            <tr className={
                              isEditing ? "bg-indigo-50/40"
                              : selectedProducts[l.id]?.has(p.id) ? "bg-red-50/60"
                              : "hover:bg-zinc-50"
                            }>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedProducts[l.id]?.has(p.id) ?? false}
                                  onChange={() => toggleSelect(l.id, p.id)}
                                  className="h-3.5 w-3.5 cursor-pointer rounded accent-red-600"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <p className="font-semibold text-zinc-900 max-w-[300px] truncate">{p.nombre}</p>
                                <p className="text-zinc-400">{p.marca}{p.referencia ? ` · ${p.referencia}` : ""}</p>
                              </td>
                              <td className="px-4 py-2">
                                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600">{p.categoria}</span>
                              </td>
                              <td className="px-4 py-2 text-right text-zinc-500">{formatCOP(p.precio_costo)}</td>
                              <td className="px-4 py-2 text-right font-bold text-[#1e6cff]">{formatCOP(p.precio_final)}</td>
                              <td className="px-4 py-2 text-right whitespace-nowrap">
                                {published[rowKey] ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> En {TARGET_LABEL[published[rowKey]]}
                                  </span>
                                ) : (
                                  <div className="inline-flex items-center gap-1">
                                    {/* ✏️ Editar y publicar (panel inline) */}
                                    <button
                                      onClick={() => openEditor(rowKey, p)}
                                      title="Editar antes de publicar"
                                      className={`rounded-md border p-1 transition ${
                                        isEditing
                                          ? "border-indigo-400 bg-indigo-100 text-indigo-700"
                                          : "border-zinc-300 text-zinc-400 hover:border-indigo-400 hover:text-indigo-600"
                                      }`}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    {/* Publicación rápida */}
                                    <button
                                      onClick={() => doPublish(p, "catalogo", rowKey)}
                                      disabled={publishingId === rowKey}
                                      title="Publicar rápido al catálogo"
                                      className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                                    >
                                      {publishingId === rowKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <Store className="h-3 w-3" />}
                                      Publicar
                                    </button>
                                    <button
                                      onClick={() => doPublish(p, "destacado", rowKey)}
                                      disabled={publishingId === rowKey}
                                      title="Publicar y marcar como Destacado"
                                      className="rounded-md border border-amber-300 p-1 text-amber-500 hover:bg-amber-50 disabled:opacity-50 transition"
                                    >
                                      <Star className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => doPublish(p, "promocion", rowKey)}
                                      disabled={publishingId === rowKey}
                                      title="Publicar y marcar como Promoción"
                                      className="rounded-md border border-indigo-300 p-1 text-indigo-500 hover:bg-indigo-50 disabled:opacity-50 transition"
                                    >
                                      <Tag className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                            {isEditing && editors[rowKey] && (
                              <tr>
                                <td colSpan={6} className="p-0">
                                  <InlineEditor
                                    state={editors[rowKey]}
                                    onChange={(u) => updateEditor(rowKey, u)}
                                    onPublish={async () => { await doPublishEditor(rowKey, editors[rowKey], p); }}
                                    onClose={() => setEditingRow(null)}
                                  />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "zinc" }: { label: string; value: number; tone?: "zinc" | "emerald" | "indigo" }) {
  const colors = {
    zinc: "border-zinc-200 bg-white text-zinc-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-2.5 ${colors}`}>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
    </div>
  );
}

// ─── Editor inline de producto (dentro de la tabla de la lista) ───────────────

function InlineEditor({
  state,
  onChange,
  onPublish,
  onClose,
}: {
  state: EditorState;
  onChange: (u: Partial<EditorState>) => void;
  onPublish: () => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function handlePublish() {
    setSaving(true);
    try { await onPublish(); } finally { setSaving(false); }
  }

  return (
    <div className="border-t border-indigo-200 bg-indigo-50/30 px-4 py-4">
      <div className="flex flex-wrap gap-5">

        {/* ── Imagen ─────────────────────────────────── */}
        <div className="w-40 shrink-0">
          <ImageSlot
            identifier={state.referencia}
            tipo="card"
            url={state.imageUrl}
            onUrlChange={(u) => onChange({ imageUrl: u })}
            label="Imagen del producto"
          />
        </div>

        {/* ── Campos ─────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">

          {/* Nombre */}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Nombre</span>
            <input
              value={state.nombre}
              onChange={(e) => onChange({ nombre: e.target.value })}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </label>

          {/* Precio + Segmento */}
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-1 flex-col gap-1 min-w-[120px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Precio cliente (COP)</span>
              <input
                type="number"
                value={state.precio}
                onChange={(e) => onChange({ precio: Number(e.target.value) })}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 min-w-[160px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Segmento web</span>
              <select
                value={state.segmento}
                onChange={(e) => onChange({ segmento: e.target.value })}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              >
                {SEGMENTOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>

          {/* Descripción */}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Descripción / especificaciones <span className="font-normal normal-case text-zinc-400">(opcional)</span>
            </span>
            <textarea
              value={state.descripcionUso}
              onChange={(e) => onChange({ descripcionUso: e.target.value })}
              rows={2}
              placeholder="Ej: Intel Core i5-1235U · 16 GB RAM DDR4 · SSD 512 GB NVMe"
              className="resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </label>

          {/* Flags + acciones */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onChange({ destacado: !state.destacado })}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                state.destacado
                  ? "border-amber-400 bg-amber-50 text-amber-700"
                  : "border-zinc-300 text-zinc-500 hover:border-amber-300 hover:text-amber-600"
              }`}
            >
              <Star className="h-3.5 w-3.5" />
              {state.destacado ? "Destacado ✓" : "Destacado"}
            </button>
            <button
              type="button"
              onClick={() => onChange({ enPromocion: !state.enPromocion })}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                state.enPromocion
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                  : "border-zinc-300 text-zinc-500 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              {state.enPromocion ? "Promoción ✓" : "Promoción"}
            </button>

            <div className="ml-auto flex gap-2">
              <button
                onClick={onClose}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handlePublish}
                disabled={saving || !state.nombre.trim()}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Store className="h-3.5 w-3.5" />}
                Publicar al catálogo
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Tab: Buscar productos ─────────────────────────────────────────────────────

function BuscarTab({ totals, flash }: { totals: Totals; flash: (ok: boolean, msg: string) => void }) {
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);

  // Búsqueda con debounce
  useEffect(() => {
    const term = q.trim();
    if (term === "") { setMatches([]); setSearched(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const d = await (await fetch(`/api/admin/supplier-search?q=${encodeURIComponent(term)}`)).json();
        setMatches(d.matches ?? []);
        setSearched(true);
      } catch { setMatches([]); }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  async function publish(m: SearchMatch, rowKey: string) {
    setPublishing(rowKey);
    try {
      const map = mapCat(m.categoria);
      const res = await fetch("/api/admin/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: m.nombre,
          marca: m.marca,
          precio: m.precio_final,
          precioDesde: m.precio_final,
          referencia: m.referencia || undefined,
          categoria: map.categoria,
          usoCaso: map.usoCaso,
          segmento: map.segmento,
          publicado: true,
          descripcionUso: Object.values(m.specs ?? {}).slice(0, 3).join(" · "),
        }),
      });
      const data = await res.json();
      if (!res.ok) { flash(false, data.error ?? "No se pudo publicar"); return; }
      flash(true, `“${m.nombre}” publicado a la tienda (ref: ${data.referencia})`);
    } catch {
      flash(false, "Error de red al publicar");
    } finally {
      setPublishing(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca un producto en todas las listas activas (ej: ryzen 5, monitor 24, ssd 1tb)…"
            className="w-full rounded-lg border border-zinc-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Buscando entre <strong className="text-zinc-600">{totals.productosActivos}</strong> productos de{" "}
          <strong className="text-zinc-600">{totals.listasActivas}</strong> lista{totals.listasActivas !== 1 ? "s" : ""} activa{totals.listasActivas !== 1 ? "s" : ""}.
          {totals.listasActivas === 0 && " Activa al menos una lista para buscar."}
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 px-1 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
        </div>
      )}

      {!loading && searched && matches.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white py-10 text-center text-sm text-zinc-500">
          Sin resultados para “{q}” en las listas activas.
        </div>
      )}

      {matches.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider border-b border-zinc-100">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Producto</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Proveedor / Lista</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Costo</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-[#1e6cff]">Precio cliente</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Publicar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {matches.map((m, i) => {
                  const rowKey = `${m.listaId}-${m.id}-${i}`;
                  return (
                  <tr key={rowKey} className={m.esMasBarato ? "bg-emerald-50/50" : "hover:bg-zinc-50"}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-zinc-900 max-w-[260px] truncate">{m.nombre}</p>
                        {m.esMasBarato && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 whitespace-nowrap">★ más barato</span>
                        )}
                      </div>
                      <p className="text-zinc-400">{m.marca}{m.referencia ? ` · ${m.referencia}` : ""}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-zinc-700 capitalize">{m.proveedor}</p>
                      <p className="text-zinc-400 max-w-[180px] truncate">{m.listaNombre}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-500">{formatCOP(m.precio_costo)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-[#1e6cff]">{formatCOP(m.precio_final)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => publish(m, rowKey)}
                        disabled={publishing === rowKey}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                      >
                        {publishing === rowKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <Store className="h-3 w-3" />}
                        Publicar
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
