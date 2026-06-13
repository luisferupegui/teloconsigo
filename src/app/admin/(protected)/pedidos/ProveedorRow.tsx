"use client";

import { useState } from "react";
import type { Order } from "@/lib/orders";
import { StatusSelector } from "./StatusSelector";
import { DeleteButton } from "./DeleteButton";

function formatCOP(n: number) {
  return "$" + n.toLocaleString("es-CO");
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function ProveedorRow({ order: o }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const pd = o.proveedorDetalle;
  const hasDetail = !!(pd && (pd.urlCompra || pd.costoUSD || pd.costoTotalCOP || pd.proveedorLocal));

  return (
    <>
      <tr className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors">
        {/* Expand toggle */}
        <td className="px-3 py-3">
          {hasDetail ? (
            <button
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Ocultar detalles proveedor" : "Ver detalles proveedor"}
              className="rounded p-0.5 text-zinc-400 hover:text-[#1e6cff] transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <span className="block w-4" />
          )}
        </td>

        <td className="px-4 py-3 font-mono font-semibold text-[#1e6cff] whitespace-nowrap">
          {(o as Order & { orderNumber?: string }).orderNumber ?? "—"}
        </td>
        <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{formatFecha(o.fecha)}</td>
        <td className="px-4 py-3">
          <p className="font-medium text-zinc-900">{o.cliente.nombre}</p>
          <p className="text-xs text-zinc-400">{o.cliente.ciudad} · {o.cliente.telefono}</p>
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-zinc-800">{o.producto.nombre}</p>
          {o.producto.modelo && (
            <p className="text-xs text-zinc-400">{o.producto.modelo}</p>
          )}
        </td>
        <td className="px-4 py-3 text-right text-zinc-700">{o.producto.cantidad}</td>
        <td className="px-4 py-3 text-right font-semibold text-[#1e6cff] whitespace-nowrap">
          {formatCOP(o.producto.precioCOP * o.producto.cantidad)}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            o.producto.proveedor === "eeuu"
              ? "bg-blue-50 text-blue-700"
              : "bg-emerald-50 text-emerald-700"
          }`}>
            {o.producto.proveedor === "eeuu" ? "🇺🇸 EE.UU." : "🇨🇴 Colombia"}
          </span>
        </td>
        <td className="px-4 py-3">
          <StatusSelector orderId={o.id} current={o.estado} />
        </td>
        <td className="px-3 py-3">
          <DeleteButton orderId={o.id} />
        </td>
      </tr>

      {/* Fila expandida: detalles del proveedor */}
      {expanded && hasDetail && (
        <tr className="border-b border-zinc-100 bg-blue-50/40">
          <td />
          <td colSpan={9} className="px-4 py-3">
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <span className="font-semibold text-zinc-700 uppercase tracking-wide text-xs w-full">Info proveedor (interno)</span>

              {pd?.proveedorLocal && (
                <Detail label="Proveedor local" value={
                  pd.proveedorLocal === "ledacom" ? "Ledacom" :
                  pd.proveedorLocal === "infoshop" ? "Infoshop" : "Manual"
                } />
              )}

              {pd?.costoUSD != null && (
                <Detail label="Costo origen (USD)" value={`US$${pd.costoUSD.toLocaleString("es-CO", { minimumFractionDigits: 2 })}`} />
              )}

              {pd?.costoTotalCOP != null && (
                <Detail label="Costo puesto en CO" value={formatCOP(pd.costoTotalCOP)} />
              )}

              {pd?.margenCOP != null && (
                <Detail
                  label="Margen"
                  value={formatCOP(pd.margenCOP)}
                  highlight={pd.margenCOP >= 0 ? "green" : "red"}
                />
              )}

              {pd?.urlCompra && (
                <span className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-500">Dónde comprar</span>
                  <a href={pd.urlCompra} target="_blank" rel="noopener noreferrer"
                    className="text-[#1e6cff] hover:underline truncate max-w-xs">
                    {pd.urlCompra.length > 55 ? pd.urlCompra.slice(0, 55) + "…" : pd.urlCompra}
                  </a>
                </span>
              )}
            </div>

            {/* Comparación de mercado local */}
            {pd?.comparacionMercado && (
              <div className={`mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                pd.comparacionMercado.includes("más económico")
                  ? "bg-emerald-50 text-emerald-800"
                  : pd.comparacionMercado.includes("más caro")
                  ? "bg-amber-50 text-amber-800"
                  : "bg-zinc-100 text-zinc-700"
              }`}>
                <span className="text-base leading-none">
                  {pd.comparacionMercado.includes("más económico") ? "📉" :
                   pd.comparacionMercado.includes("más caro")      ? "📈" : "≈"}
                </span>
                <span>
                  <span className="font-semibold">Mercado local: </span>
                  {pd.comparacionMercado}
                  {pd.fuenteLocal && (
                    <a href={pd.fuenteLocal} target="_blank" rel="noopener noreferrer"
                      className="ml-1 underline opacity-70 hover:opacity-100">↗</a>
                  )}
                </span>
              </div>
            )}

            {/* Email del cliente */}
            <p className="mt-2 text-xs text-zinc-400">
              Email cliente: <span className="text-zinc-600">{o.cliente.email}</span>
              &nbsp;·&nbsp;Cédula: <span className="text-zinc-600">{o.cliente.cedula}</span>
              &nbsp;·&nbsp;Dirección: <span className="text-zinc-600">{o.cliente.direccion}</span>
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "red" }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`font-semibold ${
        highlight === "green" ? "text-emerald-700" :
        highlight === "red"   ? "text-red-600" :
        "text-zinc-800"
      }`}>{value}</span>
    </span>
  );
}
