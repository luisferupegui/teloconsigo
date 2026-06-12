"use client";

import { useTransition } from "react";
import { cambiarEstado } from "./actions";
import type { OrderEstado } from "@/lib/orders";

const ESTADOS: { value: OrderEstado; label: string; color: string }[] = [
  { value: "pendiente",  label: "Pendiente",  color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "confirmado", label: "Confirmado", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "enviado",    label: "Enviado",    color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "entregado",  label: "Entregado",  color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];

export function StatusSelector({ orderId, current }: { orderId: string; current: OrderEstado }) {
  const [pending, startTransition] = useTransition();

  const currentIdx = ESTADOS.findIndex((e) => e.value === current);
  const currentStyle = ESTADOS[currentIdx]?.color ?? "bg-zinc-100 text-zinc-600 border-zinc-200";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuevoEstado = e.target.value as OrderEstado;
    startTransition(() => cambiarEstado(orderId, nuevoEstado));
  }

  return (
    <select
      defaultValue={current}
      onChange={handleChange}
      disabled={pending}
      className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize cursor-pointer transition-opacity ${currentStyle} ${pending ? "opacity-50" : ""}`}
    >
      {ESTADOS.map((e) => (
        <option key={e.value} value={e.value}>
          {e.label}
        </option>
      ))}
    </select>
  );
}
