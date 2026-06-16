import { getHistory, getExpiredHistory, type HistoryOrder } from "@/lib/orders";
import { AccionesBanner, ExportButton } from "./HistorialClient";

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

export default function HistorialPage() {
  const history = getHistory();
  const expired = getExpiredHistory();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Historial de pedidos</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {history.length} pedido{history.length !== 1 ? "s" : ""} archivado{history.length !== 1 ? "s" : ""} · últimos 6 meses
          </p>
        </div>
        {history.length > 0 && <ExportButton />}
      </div>

      {/* Banner de vencimiento */}
      <AccionesBanner hayVencidos={expired.length > 0} />

      {history.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-16 text-center text-zinc-400">
          <p className="text-4xl mb-3">📜</p>
          <p className="font-medium">El historial está vacío</p>
          <p className="text-sm mt-1">Los pedidos que borres de la lista activa aparecerán aquí</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                <th className="px-4 py-3 font-semibold text-zinc-600">N° Orden</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Fecha pedido</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Archivado</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Cliente</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Producto</th>
                <th className="px-4 py-3 font-semibold text-zinc-600 text-right">Und.</th>
                <th className="px-4 py-3 font-semibold text-zinc-600 text-right">Valor</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Proveedor</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Costo CO</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Margen</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Estado</th>
              </tr>
            </thead>
            <tbody>
              {history.map((o) => (
                <HistorialRow key={o.id} order={o} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HistorialRow({ order: o }: { order: HistoryOrder }) {
  const pd = o.proveedorDetalle;
  const isExpired =
    Date.now() - new Date(o.fechaArchivado).getTime() > 6 * 30 * 24 * 60 * 60 * 1000;

  return (
    <tr className={`border-b border-zinc-100 last:border-0 ${isExpired ? "bg-amber-50/50" : "hover:bg-zinc-50"} transition-colors`}>
      <td className="px-4 py-3 font-mono font-semibold text-zinc-500 whitespace-nowrap">
        {o.orderNumber ?? "—"}
      </td>
      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{formatFecha(o.fecha)}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`text-xs ${isExpired ? "text-amber-700 font-semibold" : "text-zinc-400"}`}>
          {isExpired && "⏰ "}
          {formatFecha(o.fechaArchivado)}
        </span>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-zinc-700">{o.cliente.nombre}</p>
        <p className="text-xs text-zinc-400">{o.cliente.ciudad}</p>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-zinc-600">{o.producto.nombre}</p>
        {o.producto.modelo && (
          <p className="text-xs text-zinc-400">{o.producto.modelo}</p>
        )}
      </td>
      <td className="px-4 py-3 text-right text-zinc-500">{o.producto.cantidad}</td>
      <td className="px-4 py-3 text-right font-semibold text-zinc-700 whitespace-nowrap">
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
        {pd?.urlCompra && (
          <a
            href={pd.urlCompra}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block text-xs text-[#1e6cff] hover:underline truncate max-w-[160px]"
          >
            Ver fuente ↗
          </a>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-600 whitespace-nowrap">
        {pd?.costoTotalCOP ? formatCOP(pd.costoTotalCOP) : <span className="text-zinc-300">—</span>}
        {pd?.costoUSD && (
          <p className="text-xs text-zinc-400">US${pd.costoUSD}</p>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {pd?.margenCOP != null ? (
          <span className={`font-semibold text-sm ${pd.margenCOP >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {formatCOP(pd.margenCOP)}
          </span>
        ) : (
          <span className="text-zinc-300">—</span>
        )}
        {pd?.comparacionProveedores && pd.comparacionProveedores.length > 0 ? (
          <p className="text-xs mt-0.5 text-emerald-600" title="Fuente más barata para conseguirlo">
            💡 {pd.comparacionProveedores[0].fuente}: {formatCOP(pd.comparacionProveedores[0].costoCOP)}
          </p>
        ) : pd?.comparacionMercado ? (
          <p className={`text-xs mt-0.5 ${pd.comparacionMercado.includes("más económico") ? "text-emerald-600" : "text-amber-600"}`}>
            {pd.comparacionMercado.includes("más económico") ? "📉 " : "📈 "}
            {pd.comparacionMercado.split(":")[0].replace("MercadoLibre","ML").replace("Falabella","Falla")}
          </p>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
          o.estado === "entregado" ? "bg-emerald-100 text-emerald-700" :
          o.estado === "enviado"   ? "bg-blue-100 text-blue-700" :
          o.estado === "confirmado" ? "bg-violet-100 text-violet-700" :
          "bg-amber-100 text-amber-700"
        }`}>
          {o.estado.charAt(0).toUpperCase() + o.estado.slice(1)}
        </span>
      </td>
    </tr>
  );
}
