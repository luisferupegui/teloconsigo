"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, FileText, Loader2, CheckCircle2, AlertCircle, X, Sparkles,
  Package, Search, Trash2, KeyRound, Eye, EyeOff, Power, Store, ListChecks, ChevronDown,
  Star, Tag, Globe, Plus, ExternalLink,
} from "lucide-react";

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
// Formatea respetando la moneda real del precio (la búsqueda web puede traer USD, etc.).
function formatMoney(n: number, moneda?: string) {
  const cur = (moneda || "COP").toUpperCase();
  try {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n)} ${cur}`;
  }
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
  const [tab, setTab] = useState<"cargar" | "listas" | "buscar" | "web">("cargar");
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

  const hasKey = keyStatus?.hasKey ?? false;

  return (
    <div className="space-y-5">
      <ApiKeyPanel status={keyStatus} onChange={refreshKey} flash={flash} />

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-white p-1 w-fit shadow-sm">
        {([
          ["cargar", Upload,     "Cargar PDF"],
          ["listas", ListChecks, `Listas cargadas${totals.listas ? ` (${totals.listas})` : ""}`],
          ["buscar", Search,     "Buscar productos"],
          ["web",    Globe,      "Buscar en web"],
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
          hasKey={hasKey}
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
      {tab === "web" && (
        <WebTab flash={flash} />
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

// ─── Tab: Cargar PDF ───────────────────────────────────────────────────────────

function CargarTab({ hasKey, onImported, flash }: {
  hasKey: boolean; onImported: (n: number) => void; flash: (ok: boolean, msg: string) => void;
}) {
  const [pdfText, setPdfText] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [pdfPages, setPdfPages] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [proveedor, setProveedor] = useState("ledacom");
  const [modo, setModo] = useState<"rapido" | "preciso">("rapido");
  const [extracting, setExtracting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handlePdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/pdf-extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al procesar el PDF");
      setPdfText(data.text); setPdfName(data.name); setPdfPages(data.pages);
    } catch (err) {
      flash(false, err instanceof Error ? err.message : "Error al leer el PDF");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleExtract() {
    if (!pdfText) return;
    if (!hasKey) { flash(false, "Configura primero la clave API arriba"); return; }
    setExtracting(true);
    try {
      const res = await fetch("/api/admin/extract-text-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pdfText, proveedor, nombre: pdfName, paginas: pdfPages, modo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error con la IA");
      onImported(data.count ?? 0);
      setPdfText(null); setPdfName(""); setPdfPages(0);
    } catch (err) {
      flash(false, err instanceof Error ? err.message : "Error con la IA");
    } finally {
      setExtracting(false);
    }
  }

  const chunks = pdfText ? Math.ceil(pdfText.length / 35000) : 0;
  const conc = modo === "rapido" ? 4 : 2;
  const waves = Math.max(1, Math.ceil(chunks / conc));
  const estLo = waves * (modo === "rapido" ? 8 : 20);
  const estHi = waves * (modo === "rapido" ? 15 : 40);

  if (!pdfText) {
    return (
      <div
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-16 transition hover:border-indigo-400 hover:bg-indigo-50/30"
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
              <p className="mt-1 text-xs text-zinc-400">Cada PDF se guarda como una lista que puedes activar o desactivar · Máx. 20 MB</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">
              <Upload className="h-4 w-4" /> Seleccionar PDF
            </div>
          </>
        )}
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdf} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-zinc-900">📄 {pdfName}</p>
          <p className="text-xs text-zinc-400">
            {pdfPages} página{pdfPages !== 1 ? "s" : ""} · {pdfText.length.toLocaleString()} caracteres extraídos
          </p>
        </div>
        <button
          onClick={() => { setPdfText(null); setPdfName(""); setPdfPages(0); }}
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

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Modo</span>
          <div className="flex rounded-lg border border-zinc-300 p-0.5">
            {([["rapido", "⚡ Rápido"], ["preciso", "🎯 Preciso"]] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setModo(val)}
                title={val === "rapido" ? "Modelo Haiku: más veloz y barato" : "Modelo Sonnet: más exacto en listas enredadas"}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  modo === val ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleExtract}
          disabled={extracting || !hasKey}
          title={!hasKey ? "Configura primero la clave API" : undefined}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 transition"
        >
          {extracting
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Extrayendo con IA…</>
            : <><Sparkles className="h-4 w-4" /> Extraer TODO con IA</>}
        </button>
      </div>

      {!hasKey && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
          <AlertCircle className="h-3.5 w-3.5" /> Configura la clave API arriba para poder extraer.
        </p>
      )}

      {extracting && (
        <div className="mt-3 rounded-lg bg-violet-50 border border-violet-200 px-4 py-3">
          <p className="text-xs font-semibold text-violet-800">
            Procesando el PDF en {chunks} fragmento{chunks !== 1 ? "s" : ""} en paralelo · modo {modo === "rapido" ? "rápido (Haiku)" : "preciso (Sonnet)"}…
          </p>
          <p className="text-xs text-violet-600 mt-1">
            Suele tomar <strong>{estLo}–{estHi} segundos</strong>. En cuentas de Anthropic nuevas puede tardar más por el límite de velocidad (sube solo con el uso). No cierres esta ventana.
          </p>
        </div>
      )}
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
        <p className="text-xs text-zinc-400">Sube un PDF en la pestaña “Cargar PDF” para empezar.</p>
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
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-zinc-50 text-zinc-500 uppercase tracking-wider border-b border-zinc-100">
                        <tr>
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
                          return (
                          <tr key={rowKey} className="hover:bg-zinc-50">
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
                                  <button
                                    onClick={() => doPublish(p, "catalogo", rowKey)}
                                    disabled={publishingId === rowKey}
                                    title="Publicar al catálogo"
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

// ─── Tab: Buscar en web ────────────────────────────────────────────────────────

type WebResult = { nombre: string; precio: number | null; moneda: string; sitio: string; url: string };

function WebTab({ flash }: { flash: (ok: boolean, msg: string) => void }) {
  const [sites, setSites] = useState<string[]>([]);
  const [newSite, setNewSite] = useState("");
  const [savingSites, setSavingSites] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<WebResult[] | null>(null);
  const [searchCount, setSearchCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/web-search").then((r) => r.json()).then((d) => setSites(d.sites ?? [])).catch(() => {});
  }, []);

  async function persistSites(next: string[]) {
    setSavingSites(true);
    try {
      const res = await fetch("/api/admin/web-search", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sites: next }),
      });
      const d = await res.json();
      if (!res.ok) { flash(false, d.error ?? "Error al guardar sitios"); return; }
      setSites(d.sites ?? next);
    } catch {
      flash(false, "Error de red al guardar sitios");
    } finally {
      setSavingSites(false);
    }
  }

  function addSite() {
    const s = newSite.trim();
    if (!s) return;
    setNewSite("");
    persistSites([...sites, s]);
  }

  async function runSearch() {
    if (!query.trim()) return;
    if (sites.length === 0) { flash(false, "Agrega al menos un sitio primero"); return; }
    setSearching(true);
    setResults(null);
    try {
      const res = await fetch("/api/admin/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { flash(false, d.error ?? "Error en la búsqueda web"); return; }
      setResults(d.results ?? []);
      setSearchCount(d.searchCount ?? 0);
    } catch {
      flash(false, "Error de red en la búsqueda");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Sitios permitidos */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-bold text-zinc-900">
          <Globe className="h-4 w-4 text-indigo-600" /> Sitios donde buscar
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          El buscador SOLO mirará en estos sitios. Escribe el dominio (ej: mercadolibre.com.co, alkosto.com).
        </p>

        <div className="mt-3 flex gap-2">
          <input
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSite(); } }}
            placeholder="ej: mercadolibre.com.co"
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
          <button
            onClick={addSite}
            disabled={savingSites || !newSite.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {savingSites ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Agregar
          </button>
        </div>

        {sites.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {sites.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                {s}
                <button onClick={() => persistSites(sites.filter((x) => x !== s))} className="text-zinc-400 hover:text-red-500" title="Quitar">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-amber-600">Aún no has agregado sitios. Agrega al menos uno para poder buscar.</p>
        )}
      </div>

      {/* Búsqueda */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(); } }}
              placeholder="¿Qué producto buscar? (ej: Ryzen 5 5600, monitor LG 27)"
              className="w-full rounded-lg border border-zinc-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <button
            onClick={runSearch}
            disabled={searching || sites.length === 0 || !query.trim()}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 transition"
          >
            {searching ? <><Loader2 className="h-4 w-4 animate-spin" /> Buscando…</> : <><Globe className="h-4 w-4" /> Buscar en web</>}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Usa la IA con búsqueda web. Tarda ~15-30 s y consume créditos de tu cuenta (~$0,14 USD por búsqueda). Los precios son <strong>de referencia del mercado</strong>, no tu costo de proveedor.
        </p>
      </div>

      {searching && (
        <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          <Loader2 className="h-4 w-4 animate-spin" /> Buscando en {sites.length} sitio{sites.length !== 1 ? "s" : ""}… Claude está leyendo las páginas.
        </div>
      )}

      {results && !searching && (
        results.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white py-10 text-center text-sm text-zinc-500">
            No se encontraron productos para “{query}” en los sitios configurados.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
              <p className="text-xs font-semibold text-zinc-600">{results.length} resultado{results.length !== 1 ? "s" : ""} · {searchCount} búsqueda{searchCount !== 1 ? "s" : ""} web</p>
              <p className="text-[11px] text-zinc-400">Precios de referencia — verifica en el sitio</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-zinc-100 bg-white text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Producto</th>
                    <th className="px-4 py-2 text-left font-semibold">Sitio</th>
                    <th className="px-4 py-2 text-right font-semibold">Precio ref.</th>
                    <th className="px-4 py-2 text-right font-semibold">Enlace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {results.map((r, i) => (
                    <tr key={i} className="hover:bg-zinc-50">
                      <td className="px-4 py-2.5 font-semibold text-zinc-900 max-w-[340px]">{r.nombre}</td>
                      <td className="px-4 py-2.5 text-zinc-500">{r.sitio}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#1e6cff]">
                        {r.precio != null ? formatMoney(r.precio, r.moneda) : <span className="font-normal text-zinc-400">s/d</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
                            Ver <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : <span className="text-zinc-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
