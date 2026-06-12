import { getOrders, type Order } from "@/lib/orders";
import { StatusSelector } from "./StatusSelector";


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

export default function PedidosPage() {
  const orders = getOrders();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Pedidos realizados</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {orders.length} pedido{orders.length !== 1 ? "s" : ""} registrado{orders.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-16 text-center text-zinc-400">
          <p className="text-4xl mb-3">🛍️</p>
          <p className="font-medium">Aún no hay pedidos registrados</p>
          <p className="text-sm mt-1">Los pedidos que Andrea tome aparecerán aquí</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                <th className="px-4 py-3 font-semibold text-zinc-600">N° Orden</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Fecha</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Cliente</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Producto</th>
                <th className="px-4 py-3 font-semibold text-zinc-600 text-right">Und.</th>
                <th className="px-4 py-3 font-semibold text-zinc-600 text-right">Valor</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Proveedor</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
