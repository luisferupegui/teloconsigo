"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────

type Margins = Record<string, number>;

type ImportConfig = {
  divisor:  number;
  trm:      number;
  shipping: { component: number; laptop: number; desktop: number };
};

// ── Labels de categorías de márgenes ────────────────────────────────────────

const CAT_LABELS: Record<string, { label: string; desc: string }> = {
  "portatil":        { label: "Portátiles / Notebooks",           desc: "ThinkPad, HP EliteBook, Dell Latitude…" },
  "antivirus":       { label: "Antivirus",                        desc: "Kaspersky, Bitdefender, ESET, Norton…" },
  "tablet":          { label: "Tablets",                          desc: "iPad, Samsung Galaxy Tab, Wacom…" },
  "licencia":        { label: "Licencias Windows / Office",       desc: "Windows 11, Microsoft 365, Office 2021…" },
  "servidor":        { label: "Servidores",                       desc: "Dell PowerEdge, HPE ProLiant, tower/rack" },
  "procesador":      { label: "Procesadores / CPU",               desc: "Ryzen, Core i3–i9, Xeon…" },
  "monitor":         { label: "Monitores",                        desc: "Todos los tamaños y tipos" },
  "memoria-ram":     { label: "Memoria RAM",                      desc: "DDR4, DDR5 (SO-DIMM y DIMM)" },
  "almacenamiento":  { label: "Almacenamiento (SSD / HDD)",       desc: "NVMe, SATA, discos externos" },
  "tarjeta-grafica": { label: "Tarjetas gráficas (GPU)",          desc: "RTX, Radeon, Quadro…" },
  "fuente-poder":    { label: "Fuentes de poder (PSU)",           desc: "Certificadas 80+, modulares" },
  "refrigeracion":   { label: "Refrigeración / Coolers",          desc: "Disipadores aire y líquido" },
  "escritorio":      { label: "Computadores de escritorio",       desc: "Torres, AIO, mini-PCs" },
  "redes":           { label: "Redes (switches, routers, APs)",   desc: "Cisco, Ubiquiti, TP-Link…" },
  "mouse":           { label: "Mouse / Ratones",                  desc: "Inalámbrico, ergonómico, gaming" },
  "auriculares":     { label: "Auriculares / Headsets",           desc: "Diademas, in-ear, USB-C" },
  "streaming":       { label: "Streaming / Capturadoras",         desc: "Elgato, Razer, OBS compatible" },
  "impresora":       { label: "Impresoras",                       desc: "Láser, inkjet, multifuncionales" },
  "accesorios":      { label: "Accesorios generales",             desc: "Hubs, cables, adaptadores…" },
  "teclado":         { label: "Teclados",                         desc: "Mecánicos, membrana, inalámbrico" },
  "motherboard":     { label: "Motherboards / Placas madre",      desc: "AM5, LGA1700, HEDT…" },
  "default":         { label: "Categorías sin especificar",       desc: "Fallback cuando no hay categoría definida" },
};

// Orden de presentación (default siempre al final)
// Orden A→Z por label visible; "default" siempre al final.
const CAT_ORDER = [
  "accesorios",      // Accesorios generales
  "almacenamiento",  // Almacenamiento (SSD / HDD)
  "antivirus",       // Antivirus
  "auriculares",     // Auriculares / Headsets
  "escritorio",      // Computadores de escritorio
  "fuente-poder",    // Fuentes de poder (PSU)
  "impresora",       // Impresoras
  "licencia",        // Licencias Windows / Office
  "memoria-ram",     // Memoria RAM
  "monitor",         // Monitores
  "motherboard",     // Motherboards / Placas madre
  "mouse",           // Mouse / Ratones
  "portatil",        // Portátiles / Notebooks
  "procesador",      // Procesadores / CPU
  "redes",           // Redes (switches, routers, APs)
  "refrigeracion",   // Refrigeración / Coolers
  "servidor",        // Servidores
  "streaming",       // Streaming / Capturadoras
  "tablet",          // Tablets
  "tarjeta-grafica", // Tarjetas gráficas (GPU)
  "teclado",         // Teclados
  "default",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function calcUS(usd: number, cfg: ImportConfig, tier: "component" | "laptop" | "desktop") {
  const flete  = cfg.shipping[tier];
  const usdNet = usd / (cfg.divisor || 1);
  return Math.round((usdNet + flete) * (cfg.trm || 1) / 1000) * 1000;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function StatusBadge({ status }: { status: SaveStatus }) {
  if (status === "idle")   return null;
  if (status === "saving") return <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />;
  if (status === "saved")  return <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check className="h-3.5 w-3.5" /> Guardado</span>;
  return <span className="flex items-center gap-1 text-xs font-semibold text-rose-600"><X className="h-3.5 w-3.5" /> Error al guardar</span>;
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function PreciosPage() {
  const [margins,    setMargins]    = useState<Margins>({});
  const [importCfg,  setImportCfg]  = useState<ImportConfig>({ divisor: 0.7, trm: 3800, shipping: { component: 25, laptop: 60, desktop: 100 } });
  const [loading,    setLoading]    = useState(true);
  const [mStatus,    setMStatus]    = useState<SaveStatus>("idle");
  const [iStatus,    setIStatus]    = useState<SaveStatus>("idle");
  const [showDesc,   setShowDesc]   = useState(false);

  // Cargar datos
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/margins").then((r) => r.json()),
      fetch("/api/admin/importacion-config").then((r) => r.json()),
    ])
      .then(([m, cfg]) => { setMargins(m); setImportCfg(cfg); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Helpers para edición
  function setMargin(key: string, pct: string) {
    const v = parseFloat(pct);
    if (isNaN(v)) return;
    setMargins((prev) => ({ ...prev, [key]: Math.round(Math.max(0, Math.min(200, v))) / 100 }));
  }

  function setCfg(field: keyof ImportConfig, value: string, shippingKey?: "component" | "laptop" | "desktop") {
    const v = parseFloat(value);
    if (isNaN(v) || v <= 0) return;
    if (field === "shipping" && shippingKey) {
      setImportCfg((prev) => ({ ...prev, shipping: { ...prev.shipping, [shippingKey]: v } }));
    } else {
      setImportCfg((prev) => ({ ...prev, [field]: v }));
    }
  }

  // Guardar márgenes
  async function saveMargins() {
    setMStatus("saving");
    try {
      const res = await fetch("/api/admin/margins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(margins),
      });
      setMStatus(res.ok ? "saved" : "error");
    } catch { setMStatus("error"); }
    setTimeout(() => setMStatus("idle"), 3000);
  }

  // Guardar fórmula EE.UU.
  async function saveImport() {
    setIStatus("saving");
    try {
      const res = await fetch("/api/admin/importacion-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importCfg),
      });
      setIStatus(res.ok ? "saved" : "error");
    } catch { setIStatus("error"); }
    setTimeout(() => setIStatus("idle"), 3000);
  }

  // Construir lista de categorías a mostrar
  const catKeys = [
    ...CAT_ORDER.filter((k) => k in margins),
    ...Object.keys(margins).filter((k) => !CAT_ORDER.includes(k) && k !== "default"),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">💰 Configuración de Precios</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ajusta los márgenes de ganancia por categoría (Colombia y proveedores) y la fórmula de importación EE.UU.
        </p>
      </div>

      {/* ── SECCIÓN 1: Márgenes Colombia ───────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">

        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-bold text-zinc-900">📊 Márgenes por categoría — Colombia</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Aplican a: listas de proveedores (Infoshop / Ledacom) y búsquedas web en Colombia.
              Precio cliente = costo × (1 + %)
            </p>
          </div>
          <button
            onClick={() => setShowDesc(!showDesc)}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition"
          >
            {showDesc ? <><ChevronUp className="h-3.5 w-3.5" /> Ocultar ayuda</> : <><ChevronDown className="h-3.5 w-3.5" /> Mostrar ayuda</>}
          </button>
        </div>

        {showDesc && (
          <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 text-xs text-blue-800 space-y-1">
            <p><strong>Ejemplo:</strong> Costo Infoshop $500.000 + margen portátil 28% → precio cliente <strong>$640.000</strong></p>
            <p><strong>Ejemplo web:</strong> Promedio Alkosto/Ktronix $480.000 + margen monitor 25% → precio cliente <strong>$600.000</strong></p>
            <p>El margen <strong>&quot;Categorías sin especificar&quot;</strong> se usa cuando la categoría no coincide con ninguna de la lista.</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Categoría</th>
                <th className="px-6 py-3 text-left font-semibold hidden sm:table-cell">Productos típicos</th>
                <th className="px-6 py-3 text-center font-semibold w-32">Margen %</th>
                <th className="px-6 py-3 text-right font-semibold w-40">Ejemplo ($500.000 costo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {catKeys.map((key) => {
                const meta    = CAT_LABELS[key];
                const margen  = margins[key] ?? 0.35;
                const pct     = Math.round(margen * 100);
                const ejemplo = Math.ceil(500_000 * (1 + margen) / 1000) * 1000;
                const isDefault = key === "default";
                return (
                  <tr key={key} className={isDefault ? "bg-zinc-50/60" : "hover:bg-zinc-50/40"}>
                    <td className="px-6 py-3">
                      <span className={`font-semibold ${isDefault ? "text-zinc-500 italic" : "text-zinc-800"}`}>
                        {meta?.label ?? key}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-zinc-400 text-xs hidden sm:table-cell">
                      {meta?.desc ?? "—"}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={200}
                          step={1}
                          value={pct}
                          onChange={(e) => setMargin(key, e.target.value)}
                          className="w-16 rounded-lg border border-zinc-300 px-2 py-1.5 text-center text-sm font-bold tabular-nums text-zinc-900 focus:border-[#1e6cff] focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/20"
                        />
                        <span className="text-zinc-500 text-sm">%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className={`font-semibold tabular-nums ${isDefault ? "text-zinc-500" : "text-emerald-600"}`}>
                        {COP(ejemplo)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 bg-zinc-50">
          <StatusBadge status={mStatus} />
          <button
            onClick={saveMargins}
            disabled={mStatus === "saving"}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1e6cff] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-[#1e6cff]/20 hover:bg-[#1858d6] disabled:opacity-60 transition"
          >
            {mStatus === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar márgenes Colombia
          </button>
        </div>
      </div>

      {/* ── SECCIÓN 2: Fórmula EE.UU. ──────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">

        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-bold text-zinc-900">🇺🇸 Fórmula importación EE.UU.</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Precio cliente COP = (USD_producto ÷ <strong>DIVISOR</strong> + <strong>flete_USD</strong>) × <strong>TRM</strong>
          </p>
        </div>

        <div className="px-6 py-6 space-y-6">

          {/* Variables principales */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                DIVISOR
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0.01}
                  max={1}
                  step={0.01}
                  value={importCfg.divisor}
                  onChange={(e) => setCfg("divisor", e.target.value)}
                  className="w-24 rounded-lg border border-zinc-300 px-3 py-2 text-center text-lg font-bold tabular-nums text-zinc-900 focus:border-[#1e6cff] focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/20"
                />
                <div className="text-xs text-zinc-500 leading-relaxed">
                  <p>Factor aranceles + comisiones</p>
                  <p className="text-zinc-400">0.7 = 30% costos adicionales (recomendado)</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                TRM  <span className="normal-case font-normal">(COP / USD)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1000}
                  max={15000}
                  step={10}
                  value={importCfg.trm}
                  onChange={(e) => setCfg("trm", e.target.value)}
                  className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-center text-lg font-bold tabular-nums text-zinc-900 focus:border-[#1e6cff] focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/20"
                />
                <div className="text-xs text-zinc-500 leading-relaxed">
                  <p>Tasa de cambio actual</p>
                  <p className="text-zinc-400">Actualizar mensualmente</p>
                </div>
              </div>
            </div>
          </div>

          {/* Fletes por tipo */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Flete por tipo de producto (USD)</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { key: "component", label: "⚡ Componentes",  desc: "GPU, RAM, SSD, periféricos, monitores ≤27\"" },
                  { key: "laptop",    label: "💻 Portátiles",    desc: "Laptops, notebooks, mini-PCs" },
                  { key: "desktop",   label: "🖥️ Escritorios",   desc: "Torres, AIO, workstations" },
                ] as const
              ).map(({ key, label, desc }) => (
                <div key={key} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-bold text-zinc-700 mb-0.5">{label}</p>
                  <p className="text-[10px] text-zinc-400 mb-2">{desc}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-500">USD</span>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      step={5}
                      value={importCfg.shipping[key]}
                      onChange={(e) => setCfg("shipping", e.target.value, key)}
                      className="w-20 rounded-lg border border-zinc-300 px-3 py-2 text-center text-base font-bold tabular-nums text-zinc-900 focus:border-[#1e6cff] focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/20"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview en vivo */}
          <div className="rounded-xl border border-[#1e6cff]/20 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-3">Vista previa en vivo</p>
            <div className="grid gap-2 sm:grid-cols-3 text-sm">
              {(
                [
                  { tier: "component" as const, label: "Componente $50 USD",  usd: 50  },
                  { tier: "laptop"    as const, label: "Portátil $800 USD",   usd: 800 },
                  { tier: "desktop"   as const, label: "Escritorio $1.200 USD", usd: 1200 },
                ] as const
              ).map(({ tier, label, usd }) => (
                <div key={tier} className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2 ring-1 ring-[#1e6cff]/10">
                  <span className="text-zinc-600 text-xs">{label}</span>
                  <span className="font-bold text-[#1e6cff] tabular-nums whitespace-nowrap">
                    {COP(calcUS(usd, importCfg, tier))}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-blue-500">
              Fórmula: (USD ÷ {importCfg.divisor}) + flete) × {importCfg.trm.toLocaleString("es-CO")} COP/USD
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 bg-zinc-50">
          <StatusBadge status={iStatus} />
          <button
            onClick={saveImport}
            disabled={iStatus === "saving"}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1e6cff] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-[#1e6cff]/20 hover:bg-[#1858d6] disabled:opacity-60 transition"
          >
            {iStatus === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar fórmula EE.UU.
          </button>
        </div>
      </div>

    </div>
  );
}
