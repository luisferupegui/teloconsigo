"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import {
  FileText, Loader2, CheckCircle2, AlertCircle,
  Package, Search, Trash2, KeyRound, Eye, EyeOff, Power, Store, ChevronDown,
  Star, Tag, Pencil, RefreshCw, ShieldCheck, ClipboardList,
} from "lucide-react";
import { ImageSlot } from "@/components/admin/image-slot";
import { PROVEEDORES_CONOCIDOS } from "@/lib/proveedores-conocidos";

// ─── Tipos ──────────────────────────────────────────────────────────────────

type KeyStatus = {
  hasKey: boolean; masked: string | null; source: "panel" | "env" | null;
  hasSerperKey?: boolean; serperMasked?: string | null; serperSource?: "panel" | "env" | null;
};

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

// Sugerencias, no una lista cerrada: el campo admite cualquier proveedor nuevo.
const PROVEEDORES = PROVEEDORES_CONOCIDOS;

// Mapea la categoría del proveedor a los campos del catálogo público.
const CAT_MAP: Record<string, { categoria: string; usoCaso: string; segmento: string }> = {
  portatil:          { categoria: "portatil", usoCaso: "portatil-oficina", segmento: "productividad-oficina" },
  monitor:           { categoria: "monitor",  usoCaso: "monitor",          segmento: "monitores" },
  escritorio:        { categoria: "pc",        usoCaso: "pc-empresarial",  segmento: "productividad-oficina" },
  procesador:        { categoria: "accesorio", usoCaso: "accesorio",       segmento: "componentes" },
  motherboard:       { categoria: "accesorio", usoCaso: "accesorio",       segmento: "componentes" },
  "memoria-ram":     { categoria: "accesorio", usoCaso: "accesorio",       segmento: "componentes" },
  almacenamiento:    { categoria: "accesorio", usoCaso: "accesorio",       segmento: "componentes" },
  "tarjeta-grafica": { categoria: "accesorio", usoCaso: "accesorio",       segmento: "componentes" },
  "fuente-poder":    { categoria: "accesorio", usoCaso: "accesorio",       segmento: "componentes" },
  refrigeracion:     { categoria: "accesorio", usoCaso: "accesorio",       segmento: "componentes" },
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
  /** A quién se lo compramos. No es la marca y no sale a la tienda. */
  proveedor?: string;
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
  ["componentes",           "Componentes"],
];

// Publica un producto del proveedor al catálogo público (con margen ya aplicado).
async function publishToStore(p: PublishableProduct, target: PublishTarget): Promise<{ ok: boolean; error?: string; referencia?: string }> {
  const map = mapCat(p.categoria);
  const res = await fetch("/api/admin/product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: p.nombre,
      // Última puerta antes de la tienda: si la "marca" es en realidad el
      // proveedor, no se publica. Acabaría en la ficha del producto y en el
      // `brand` del JSON-LD, o sea indexada por Google — decirle al cliente a
      // quién le compramos es darle el dato para saltarse la tienda.
      marca: p.marca.trim().toLowerCase() === (p.proveedor ?? "").trim().toLowerCase() ? "" : p.marca,
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

/** Cada vista es una pestaña del panel.
 *
 *  Antes vivían todas dentro de "Listas Word/Excel": los paneles de mantenimiento arriba y
 *  tres sub-pestañas debajo, así que para llegar a "Buscar productos" había que entrar en la
 *  sección de cargar listas. Ahora cada una es su propio encabezado y este componente
 *  muestra solo la que le pidan, conservando en un único sitio la carga de listas y claves
 *  que todas comparten. */
export type VistaListas = "listas" | "buscar" | "herramientas";

export function SupplierListsManager({ vista }: { vista: VistaListas }) {
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
      {vista === "herramientas" && (
        <>
          <ApiKeyPanel status={keyStatus} onChange={refreshKey} flash={flash} />
          <SerperKeyPanel status={keyStatus} onChange={refreshKey} flash={flash} />
          <WebCachePanel flash={flash} />
          <SaneoPanel flash={flash} onDone={refreshLists} />
          <FichasPanel flash={flash} onDone={refreshLists} />
        </>
      )}

      {vista === "listas" && (
        <ListasTab lists={lists} totals={totals} onRefresh={refreshLists} flash={flash} />
      )}
      {vista === "buscar" && (
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
              {configured ? "Cambiar clave API de DeepSeek" : "Falta configurar la clave API de DeepSeek"}
            </p>
            <p className={`mt-0.5 text-xs ${configured ? "text-zinc-500" : "text-amber-700"}`}>
              Es el cerebro de Andrea, el asesor del chat. Sin una clave válida el asesor responde
              &ldquo;no disponible&rdquo;. Consíguela en{" "}
              <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" className="font-semibold underline">
                platform.deepseek.com
              </a>{" "}(empieza por <code className="rounded bg-black/5 px-1">sk-</code>).
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[260px]">
                <input
                  type={show ? "text" : "password"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="sk-…"
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
        <span className="font-semibold text-emerald-900">Clave API de DeepSeek configurada</span>
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

// ─── Panel de la key de Serper (búsqueda EE.UU., opcional) ──────────────────────

function SerperKeyPanel({ status, onChange, flash }: {
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
        body: JSON.stringify({ serperApiKey: value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { flash(false, data.error ?? "Error al guardar la key"); return; }
      if (data.valid) { flash(true, "Key de Serper válida y guardada ✓"); setEditing(false); setValue(""); }
      else { flash(false, data.error ?? "La key no es válida"); }
      onChange();
    } catch {
      flash(false, "Error de red al guardar la key");
    } finally {
      setSaving(false);
    }
  }

  const configured = status?.hasSerperKey ?? false;

  if (!configured || editing) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <KeyRound className="h-5 w-5 shrink-0 mt-0.5 text-zinc-500" />
          <div className="flex-1">
            <p className="text-sm font-bold text-zinc-900">
              Búsqueda web con Serper <span className="font-normal text-amber-600">(necesaria para cotizar)</span>
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              DeepSeek no navega la web, así que TODA la cotización web (Colombia y EE.UU.) pasa por Serper.
              Sin esta key, Andrea solo puede ofrecer lo que haya en las listas de proveedor. Consíguela gratis en{" "}
              <a href="https://serper.dev" target="_blank" rel="noreferrer" className="font-semibold underline">serper.dev</a>{" "}
              (2.500 búsquedas sin tarjeta).
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[260px]">
                <input
                  type={show ? "text" : "password"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Tu API key de Serper"
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <span className="font-semibold text-emerald-900">Serper conectado</span>
        <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs text-emerald-800">{status?.serperMasked}</code>
        <span className="text-xs text-emerald-700">· fuente: {status?.serperSource === "panel" ? "panel" : ".env"}</span>
      </div>
      <button onClick={() => setEditing(true)}
        className="text-xs font-semibold text-emerald-700 underline hover:text-emerald-900">
        Cambiar
      </button>
    </div>
  );
}

// ─── Panel: actualizar precios cacheados de EE.UU. ──────────────────────────────

// ─── Completar fichas técnicas incompletas ─────────────────────────────────────
//
// Algunas listas llegan solo con marca, modelo y precio. Lo ideal es que el proveedor
// mande las specs; esto es el plan B: buscar el modelo exacto en internet y completar la
// ficha UNA vez, dejándola guardada. Se paga una consulta por producto, no una por
// cotización, y nada se guarda sin que el admin vea antes qué se encontró.
type Propuesta = { id: string; nombre: string; specs: Record<string, string>; fuente: string };
type Hallazgos = { propuestas: Propuesta[]; consultados: number; pendientes: number };

function FichasPanel({ flash, onDone }: { flash: (ok: boolean, msg: string) => void; onDone: () => void }) {
  const [incompletos, setIncompletos] = useState<number | null>(null);
  const [hallazgos, setHallazgos] = useState<Hallazgos | null>(null);
  const [busy, setBusy] = useState<"contar" | "buscar" | "guardar" | null>(null);

  const contar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/completar-fichas");
      const d = await r.json();
      if (r.ok) setIncompletos(d.incompletos);
    } catch { /* el panel simplemente no muestra el conteo */ }
  }, []);
  useEffect(() => { contar(); }, [contar]);

  async function buscar() {
    setBusy("buscar");
    try {
      const r = await fetch("/api/admin/completar-fichas", { method: "POST" });
      const d = await r.json();
      if (!r.ok) { flash(false, d.error ?? "No se pudo consultar"); return; }
      setHallazgos(d);
      if (d.propuestas.length === 0) flash(false, `Se consultaron ${d.consultados} modelos y no se pudo confirmar ninguna spec.`);
    } catch {
      flash(false, "Error de red");
    } finally { setBusy(null); }
  }

  async function guardar() {
    if (!hallazgos) return;
    setBusy("guardar");
    try {
      const r = await fetch("/api/admin/completar-fichas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propuestas: hallazgos.propuestas }),
      });
      const d = await r.json();
      if (!r.ok) { flash(false, d.error ?? "No se pudo guardar"); return; }
      flash(true, `${d.aplicadas} ficha(s) completada(s) ✓`);
      setHallazgos(null);
      contar();
      onDone();
    } catch {
      flash(false, "Error de red");
    } finally { setBusy(null); }
  }

  // Si no falta nada, el panel no estorba.
  if (incompletos === 0 && !hallazgos) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <ClipboardList className="h-5 w-5 shrink-0 mt-0.5 text-zinc-500" />
        <div className="flex-1">
          <p className="text-sm font-bold text-zinc-900">
            Completar fichas técnicas{incompletos ? ` (${incompletos} incompletas)` : ""}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Hay equipos que llegaron sin memoria, disco o tamaño de pantalla porque la lista del
            proveedor no los trae. Se busca cada modelo exacto en internet y se completa la ficha
            una sola vez. Lo ideal sigue siendo pedirle al proveedor la lista con esos campos.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={buscar}
              disabled={busy !== null}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {busy === "buscar" ? "Consultando modelos…" : "Buscar y previsualizar"}
            </button>

            {hallazgos && hallazgos.propuestas.length > 0 && (
              <button
                onClick={guardar}
                disabled={busy !== null}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {busy === "guardar" ? "Guardando…" : `Guardar ${hallazgos.propuestas.length} ficha(s)`}
              </button>
            )}
          </div>

          {busy === "buscar" && (
            <p className="mt-2 text-[11px] text-zinc-500">
              Se consulta un modelo cada vez para no disparar el gasto; puede tardar un par de minutos.
            </p>
          )}

          {hallazgos && hallazgos.propuestas.length > 0 && (
            <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
              <p className="text-xs font-semibold text-indigo-900">
                {hallazgos.propuestas.length} de {hallazgos.consultados} modelos consultados dieron datos
                {hallazgos.pendientes > 0 ? ` · quedan ${hallazgos.pendientes} para una próxima tanda` : ""}
              </p>
              <ul className="mt-2 space-y-1.5">
                {hallazgos.propuestas.map((p) => (
                  <li key={p.id} className="text-[11px] leading-tight text-indigo-900">
                    <span className="font-semibold">{p.nombre.slice(0, 62)}</span>
                    <br />
                    <span className="text-indigo-700">
                      {Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                    </span>
                    <br />
                    <span className="text-indigo-500">según: {p.fuente.slice(0, 78)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-indigo-700">
                Revísalas antes de guardar: un mismo código de modelo puede tener variantes según el
                mercado. Lo que no se pueda confirmar se queda sin dato, y la ficha lo dirá.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Saneo de listas ya importadas ─────────────────────────────────────────────
//
// Los lectores de listas se han ido corrigiendo, pero los datos que se importaron ANTES
// de esas correcciones siguen como estaban: el volumen conserva sus propios archivos y no
// recibe los del repositorio. Este panel aplica las mismas reglas sobre lo ya importado.
// Primero enseña qué encontró y solo corrige cuando el usuario lo confirma: es un cambio
// destructivo sobre datos de producción.
type Saneo = { descartados: number; recategorizados: number; ejemplos: { nombre: string; detalle: string }[] };

function SaneoPanel({ flash, onDone }: { flash: (ok: boolean, msg: string) => void; onDone: () => void }) {
  const [previo, setPrevio] = useState<Saneo | null>(null);
  const [busy, setBusy] = useState<"ver" | "aplicar" | null>(null);

  async function revisar() {
    setBusy("ver");
    try {
      const res = await fetch("/api/admin/sanear-listas");
      const data = await res.json();
      if (!res.ok) { flash(false, data.error ?? "No se pudo revisar"); return; }
      setPrevio(data);
      if (data.descartados + data.recategorizados === 0) flash(true, "Las listas ya están al día ✓");
    } catch {
      flash(false, "Error de red");
    } finally { setBusy(null); }
  }

  async function aplicar() {
    setBusy("aplicar");
    try {
      const res = await fetch("/api/admin/sanear-listas", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { flash(false, data.error ?? "No se pudo aplicar"); return; }
      flash(true, data.aplicado
        ? `Listo: ${data.descartados} equipo(s) descartado(s) y ${data.recategorizados} producto(s) recategorizado(s).`
        : "Las listas ya estaban al día ✓");
      setPrevio(null);
      onDone();
    } catch {
      flash(false, "Error de red");
    } finally { setBusy(null); }
  }

  const total = previo ? previo.descartados + previo.recategorizados : 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-zinc-500" />
        <div className="flex-1">
          <p className="text-sm font-bold text-zinc-900">Sanear listas importadas</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Pasa las listas ya cargadas por las MISMAS reglas que hoy se aplican al importar: descarta
            equipos cuyo tamaño de monitor no cuadra con su precio, corrige categorías equivocadas —memorias
            USB, PC completos archivados como si fueran un disco, gabinetes vacíos— y guarda las specs que
            el nombre ya declara. Primero te muestra qué encontró.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={revisar}
              disabled={busy !== null}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {busy === "ver" ? "Revisando…" : "Revisar listas"}
            </button>

            {total > 0 && (
              <button
                onClick={aplicar}
                disabled={busy !== null}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
              >
                {busy === "aplicar" ? "Corrigiendo…" : `Corregir ${total} producto(s)`}
              </button>
            )}
          </div>

          {previo && total > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-900">
                {previo.descartados} equipo(s) se descartarían · {previo.recategorizados} producto(s) cambiarían de categoría
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {previo.ejemplos.map((e) => (
                  <li key={e.nombre} className="text-[11px] leading-tight text-amber-800">
                    <span className="font-medium">{e.nombre.slice(0, 70)}</span> — {e.detalle}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-amber-700">
                Se guarda una copia previa: si algo sale mal, «Restaurar listas» la recupera.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WebCachePanel({ flash }: { flash: (ok: boolean, msg: string) => void }) {
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState<"one" | "all" | null>(null);

  async function refresh(all: boolean) {
    setBusy(all ? "all" : "one");
    try {
      const res = await fetch("/api/admin/web-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(all ? {} : { term: term.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { flash(false, data.error ?? "No se pudo actualizar"); return; }
      flash(true, all
        ? `Caché de precios EE.UU. vaciado (${data.removed}). Se re-cotizará al consultar.`
        : `Listo: “${term.trim()}” se re-cotizará con precio fresco en la próxima consulta.`);
      if (!all) setTerm("");
    } catch {
      flash(false, "Error de red");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <RefreshCw className="h-5 w-5 shrink-0 mt-0.5 text-zinc-500" />
        <div className="flex-1">
          <p className="text-sm font-bold text-zinc-900">Actualizar precios de EE.UU.</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Los precios de EE.UU. se guardan 7 días para no recotizar (ahorra costo). Si sabes que un
            precio cambió, fuérzalo aquí: se re-cotiza en la próxima consulta.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Producto a actualizar (ej: Ryzen 7 5700G)"
              className="flex-1 min-w-[240px] rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
            <button
              onClick={() => refresh(false)}
              disabled={busy !== null || term.trim() === ""}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {busy === "one" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar precio
            </button>
          </div>
          <button
            onClick={() => refresh(true)}
            disabled={busy !== null}
            className="mt-2 text-xs font-semibold text-zinc-400 underline hover:text-red-500 disabled:opacity-50 transition"
          >
            {busy === "all" ? "Vaciando…" : "Vaciar todo el caché de precios EE.UU."}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Cargar lista (Word / Excel) ──────────────────────────────────────────

// ─── Tab: Listas cargadas ──────────────────────────────────────────────────────

/** Etiqueta del proveedor, editable en el sitio. Un clic y se cambia: el nombre se
 *  escribe al importar y equivocarse obligaba a borrar la lista entera y volver a
 *  subirla. Dejarlo vacío la marca como "sin-proveedor", que no es lo mismo que borrarla. */
function ProveedorTag({ lista, onRefresh, flash }: {
  lista: ListMeta; onRefresh: () => void; flash: (ok: boolean, msg: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(lista.proveedor);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (valor.trim().toLowerCase() === lista.proveedor.trim().toLowerCase()) { setEditando(false); return; }
    setGuardando(true);
    try {
      const res = await fetch("/api/admin/supplier-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setProveedor", listId: lista.id, proveedor: valor }),
      });
      const data = await res.json();
      if (!res.ok) { flash(false, data.error ?? "No se pudo cambiar el proveedor"); return; }
      flash(true, `Proveedor: ${data.proveedor}`);
      setEditando(false);
      onRefresh();
    } catch {
      flash(false, "Error de red");
    } finally { setGuardando(false); }
  }

  if (!editando) {
    return (
      <button
        onClick={() => { setValor(lista.proveedor); setEditando(true); }}
        title="Cambiar el proveedor de esta lista"
        className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-600 capitalize transition hover:bg-indigo-100 hover:text-indigo-700"
      >
        {lista.proveedor}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        autoFocus
        value={valor}
        list="proveedores-doc"
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") guardar(); if (e.key === "Escape") setEditando(false); }}
        placeholder="sin proveedor"
        className="w-36 rounded-full border border-indigo-300 px-2 py-0.5 text-xs focus:outline-none"
      />
      <button onClick={guardar} disabled={guardando} className="text-[11px] font-bold text-indigo-600 hover:underline disabled:opacity-50">
        {guardando ? "…" : "guardar"}
      </button>
      <button onClick={() => setEditando(false)} className="text-[11px] text-zinc-400 hover:text-zinc-600">cancelar</button>
      <datalist id="proveedores-doc">
        {PROVEEDORES.map((p) => <option key={p} value={p} />)}
      </datalist>
    </span>
  );
}

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
                  <ProveedorTag lista={l} onRefresh={onRefresh} flash={flash} />
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
                              <td className="px-4 py-2 text-right text-zinc-500">{p.precio_costo > 0 ? formatCOP(p.precio_costo) : <span className="font-bold text-amber-600">sin precio</span>}</td>
                              <td className="px-4 py-2 text-right font-bold text-[#1e6cff]">{p.precio_final > 0 ? formatCOP(p.precio_final) : "—"}</td>
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
                                      disabled={publishingId === rowKey || p.precio_final <= 0}
                                      title="Publicar rápido al catálogo"
                                      className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                                    >
                                      {publishingId === rowKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <Store className="h-3 w-3" />}
                                      Publicar
                                    </button>
                                    <button
                                      onClick={() => doPublish(p, "destacado", rowKey)}
                                      disabled={publishingId === rowKey || p.precio_final <= 0}
                                      title="Publicar y marcar como Destacado"
                                      className="rounded-md border border-amber-300 p-1 text-amber-500 hover:bg-amber-50 disabled:opacity-50 transition"
                                    >
                                      <Star className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => doPublish(p, "promocion", rowKey)}
                                      disabled={publishingId === rowKey || p.precio_final <= 0}
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
                      <p className="font-semibold text-zinc-700">{m.proveedor}</p>
                      <p className="text-zinc-400 max-w-[180px] truncate">{m.listaNombre}</p>
                    </td>
                    {/* Sin costo no hay precio de venta, y sin precio de venta no
                        se publica. El botón lo dice antes de intentarlo: la API
                        lo rechaza igual, pero enterarse al hacer clic es peor. */}
                    <td className="px-4 py-2.5 text-right text-zinc-500">
                      {m.precio_costo > 0
                        ? formatCOP(m.precio_costo)
                        : <span className="font-bold text-amber-600">sin precio</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-[#1e6cff]">
                      {m.precio_final > 0 ? formatCOP(m.precio_final) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => publish(m, rowKey)}
                        disabled={publishing === rowKey || m.precio_final <= 0}
                        title={m.precio_final <= 0
                          ? "Este producto llegó sin precio en la lista del proveedor. Pídeselo y complétalo antes de publicarlo."
                          : "Publicar al catálogo"}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition"
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
