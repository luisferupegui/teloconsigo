"use client";

import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  portatil: "Portátiles",
  procesador: "Procesadores",
  monitor: "Monitores",
  "memoria-ram": "Memoria RAM",
  almacenamiento: "Almacenamiento",
  "tarjeta-grafica": "Tarjetas Gráficas",
  "fuente-poder": "Fuentes de Poder",
  refrigeracion: "Refrigeración",
  escritorio: "Equipos de Escritorio",
  redes: "Redes",
  mouse: "Mouse",
  auriculares: "Auriculares",
  streaming: "Streaming",
  impresora: "Impresoras",
  accesorios: "Accesorios",
  teclado: "Teclados",
  motherboard: "Motherboards",
  default: "Por defecto",
};

export default function MargenesPage() {
  const [margins, setMargins] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/margins")
      .then((r) => r.json())
      .then(setMargins)
      .catch(() => {});
  }, []);

  async function saveMargins() {
    setSaving(true);
    try {
      await fetch("/api/admin/margins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(margins),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Márgenes por categoría</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Define el % de utilidad que se suma al precio de costo de cada lista de proveedor para
          calcular el precio al cliente.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Se aplican al publicar productos desde las listas de proveedor.
          </p>
          <button
            onClick={saveMargins}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1e6cff] px-4 py-2 text-sm font-bold text-white hover:bg-[#1858d6] disabled:opacity-50 transition"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saved ? "¡Guardado!" : "Guardar"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
            <label key={cat} className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:border-zinc-300">
              <span className="text-sm font-medium text-zinc-700">{label}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={200}
                  step={1}
                  value={Math.round((margins[cat] ?? 0.35) * 100)}
                  onChange={(e) =>
                    setMargins((prev) => ({ ...prev, [cat]: Number(e.target.value) / 100 }))
                  }
                  className="w-16 rounded-lg border border-zinc-300 px-2 py-1 text-center text-sm font-semibold focus:border-[#1e6cff] focus:outline-none"
                />
                <span className="text-sm text-zinc-400">%</span>
              </div>
            </label>
          ))}
        </div>

        <p className="mt-4 text-xs text-zinc-400">
          Ejemplo: costo $90.000 · margen 40% → precio al cliente <strong>$126.000</strong> (redondeado a $1.000)
        </p>
      </div>
    </div>
  );
}
