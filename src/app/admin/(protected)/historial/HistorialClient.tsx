"use client";

import { useState, useTransition } from "react";
import { limpiarHistorial, cambiarEstadoHistorial } from "./actions";
import type { OrderEstado } from "@/lib/orders";

const ESTADOS: { value: OrderEstado; label: string; color: string }[] = [
  { value: "pendiente",  label: "Pendiente",  color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "confirmado", label: "Confirmado", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "enviado",    label: "Enviado",    color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "entregado",  label: "Entregado",  color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];

export function HistorialStatusSelector({ orderId, current }: { orderId: string; current: OrderEstado }) {
  const [pending, startTransition] = useTransition();
  const currentStyle = ESTADOS.find((e) => e.value === current)?.color ?? "bg-zinc-100 text-zinc-600 border-zinc-200";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevoEstado = e.target.value as OrderEstado;
    startTransition(() => cambiarEstadoHistorial(orderId, nuevoEstado));
  }

  return (
    <select
      defaultValue={current}
      onChange={handleChange}
      disabled={pending}
      className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize cursor-pointer transition-opacity ${currentStyle} ${pending ? "opacity-50" : ""}`}
    >
      {ESTADOS.map((e) => (
        <option key={e.value} value={e.value}>{e.label}</option>
      ))}
    </select>
  );
}

export function AccionesBanner({ hayVencidos }: { hayVencidos: boolean }) {
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!hayVencidos && !confirming) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⏰</span>
        <div className="flex-1">
          <p className="font-semibold text-amber-900">
            Hay pedidos en el historial con más de 6 meses
          </p>
          <p className="mt-0.5 text-sm text-amber-700">
            ¿Deseas exportar el historial completo a CSV antes de eliminarlo, o eliminarlo directamente?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="/api/admin/historial/export"
              download
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
            >
              ⬇️ Exportar CSV
            </a>
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
              >
                🗑️ Eliminar historial
              </button>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-sm text-red-700 font-medium">¿Confirmas? Se eliminará todo el historial.</span>
                <button
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    await limpiarHistorial();
                  }}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? "Eliminando…" : "Sí, eliminar"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Cancelar
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExportButton() {
  return (
    <a
      href="/api/admin/historial/export"
      download
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
    >
      ⬇️ Exportar CSV
    </a>
  );
}
