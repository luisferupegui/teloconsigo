import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrders, getHistory } from "@/lib/orders";
import { rotuloDe } from "@/lib/rotulo";
import { BotonImprimir } from "./BotonImprimir";
import { RotuloHoja } from "./RotuloHoja";

export const metadata = { title: "Rótulo de envío" };

export default async function RotuloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // También en el historial: un pedido archivado puede necesitar un rótulo de reenvío.
  const order = [...getOrders(), ...getHistory()].find((o) => o.id === id);
  if (!order) notFound();

  return (
    <div>
      {/* Todo lo que no es el rótulo desaparece al imprimir */}
      <div className="print:hidden mb-5 flex items-center justify-between">
        <div>
          <nav className="mb-1 text-xs text-zinc-500">
            <Link href="/admin/pedidos" className="hover:underline">Pedidos</Link>
            <span className="mx-2">/</span>
            <span>Rótulo #{order.orderNumber}</span>
          </nav>
          <h1 className="text-2xl font-bold text-zinc-900">Rótulo de envío</h1>
          <p className="mt-1 text-sm text-zinc-500">
            10 × 15 cm. Imprime en etiqueta adhesiva o guarda como PDF desde el
            diálogo de impresión.
          </p>
        </div>
        <BotonImprimir />
      </div>

      <RotuloHoja r={rotuloDe(order)} />
    </div>
  );
}
