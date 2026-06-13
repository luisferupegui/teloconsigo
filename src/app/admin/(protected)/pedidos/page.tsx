import { getOrders } from "@/lib/orders";
import { ProveedorRow } from "./ProveedorRow";

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
                <th className="w-8 px-3 py-3" />
                <th className="px-4 py-3 font-semibold text-zinc-600">N° Orden</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Fecha</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Cliente</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Producto</th>
                <th className="px-4 py-3 font-semibold text-zinc-600 text-right">Und.</th>
                <th className="px-4 py-3 font-semibold text-zinc-600 text-right">Valor</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Proveedor</th>
                <th className="px-4 py-3 font-semibold text-zinc-600">Estado</th>
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <ProveedorRow key={o.id} order={o} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
