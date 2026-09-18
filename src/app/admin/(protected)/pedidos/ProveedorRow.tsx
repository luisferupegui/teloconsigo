"use client";

import Link from "next/link";
import { useState } from "react";
import type { Order, FuenteComparacion } from "@/lib/orders";
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
  const hasDetail = !!(pd && (pd.urlCompra || pd.costoUSD || pd.costoTotalCOP || pd.proveedorLocal || pd.comparacionProveedores?.length));

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
          <div className="flex items-center gap-1">
            <Link
              href={`/admin/pedidos/${o.id}/rotulo`}
              target="_blank"
              title="Imprimir rótulo de envío"
              className="rounded p-1 text-zinc-400 transition-colors hover:text-[#1e6cff]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6 9V4h12v5M6 18H4v-6a2 2 0 012-2h12a2 2 0 012 2v6h-2M6 14h12v6H6v-6z" />
              </svg>
            </Link>
            <DeleteButton orderId={o.id} />
          </div>
        </td>
      </tr>

      {/* Fila expandida: detalles del proveedor */}
      {expanded && hasDetail && (
        <tr className="border-b border-zinc-100 bg-blue-50/40">
          <td />
          <td colSpan={9} className="px-4 py-3">
            {/* Dos columnas: a la izquierda todo lo del proveedor (la comparación
                ocupaba el ancho completo y dejaba un hueco enorme entre la tienda
                y su precio), a la derecha los datos del cliente, que antes iban
                apretados en una sola línea al pie. */}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                  <span className="font-semibold text-zinc-700 uppercase tracking-wide text-xs w-full">Info proveedor (interno)</span>

                  {pd?.proveedorLocal && (
                    // El proveedor llega como el slug de la lista ("janus", "ledacom", …) o
                    // "manual" si el costo se estimó por piezas. Antes había 3 nombres fijos
                    // aquí y cualquier otra lista se mostraba como "Manual".
                    <Detail
                      label={pd.proveedorLocal === "manual" ? "Costo" : "Proveedor local"}
                      value={
                        pd.proveedorLocal === "manual"
                          ? "Estimado por piezas"
                          : pd.proveedorLocal.charAt(0).toUpperCase() + pd.proveedorLocal.slice(1)
                      }
                    />
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

                {/* Comparación entre proveedores: dónde conseguirlo más barato */}
                {pd?.comparacionProveedores && pd.comparacionProveedores.length > 0 ? (
                  <ComparacionProveedores
                    fuentes={pd.comparacionProveedores}
                    precioVenta={o.producto.precioCOP}
                  />
                ) : pd?.comparacionMercado ? (
                  /* Legado: pedidos antiguos guardaron solo el resumen de una línea */
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
                ) : null}
              </div>

              <DatosCliente cliente={o.cliente} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/** Ficha del cliente, a la derecha del panel: lo que hay que copiar para despachar. */
function DatosCliente({ cliente }: { cliente: Order["cliente"] }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Datos del cliente
      </p>
      <dl className="space-y-1.5 text-sm">
        <Campo label="Nombre" value={cliente.nombre} />
        <Campo label="Cédula" value={cliente.cedula} />
        <Campo label="Dirección" value={cliente.direccion} />
        <Campo label="Teléfono" value={cliente.telefono} href={`tel:${cliente.telefono}`} />
        <Campo label="Email" value={cliente.email} href={`mailto:${cliente.email}`} />
        <Campo
          label="Ciudad"
          value={cliente.departamento ? `${cliente.ciudad}, ${cliente.departamento}` : cliente.ciudad}
        />
      </dl>
    </div>
  );
}

function Campo({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="break-words text-zinc-800">
        {href ? (
          <a href={href} className="text-[#1e6cff] hover:underline">{value}</a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function ComparacionProveedores({
  fuentes, precioVenta,
}: { fuentes: FuenteComparacion[]; precioVenta: number }) {
  const icon = (t: FuenteComparacion["tipo"]) =>
    t === "lista" ? "📋" : t === "colombia_web" ? "🛒" : "🇺🇸";
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Dónde conseguirlo más barato
      </p>
      <div className="overflow-hidden rounded-lg border border-zinc-200">
        {fuentes.map((f, i) => {
          const masBarata = i === 0;
          const margen = precioVenta - f.costoCOP;
          return (
            <div
              key={`${f.fuente}-${i}`}
              className={`flex items-center justify-between gap-3 px-3 py-1.5 text-sm ${
                masBarata ? "bg-emerald-50" : "bg-white"
              } ${i > 0 ? "border-t border-zinc-100" : ""}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="leading-none">{icon(f.tipo)}</span>
                <span className={`truncate ${masBarata ? "font-semibold text-emerald-800" : "text-zinc-700"}`}>
                  {f.fuente}
                </span>
                {f.url && (
                  <a href={f.url} target="_blank" rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-[#1e6cff]" title="Ver listado">↗</a>
                )}
                {f.nota && <span className="text-xs text-zinc-400">{f.nota}</span>}
                {masBarata && fuentes.length > 1 && (
                  <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    ✓ más barata
                  </span>
                )}
              </span>
              <span className="flex items-center gap-3 whitespace-nowrap">
                <span className={`w-24 text-right ${masBarata ? "font-bold text-emerald-800" : "text-zinc-600"}`}>
                  {formatCOP(f.costoCOP)}
                </span>
                {f.nota === "precio de mercado" ? (
                  // Janus retail: mostrar si somos más baratos o más caros que el mercado
                  <span className={`text-xs ${margen >= 0 ? "text-red-500" : "text-emerald-600"}`}>
                    {margen >= 0
                      ? `somos ${formatCOP(margen)} más caros`
                      : `somos ${formatCOP(-margen)} más baratos`}
                  </span>
                ) : (
                  <span className={`text-xs ${margen >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    margen {formatCOP(margen)}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
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
