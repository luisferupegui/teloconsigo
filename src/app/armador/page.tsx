import { loadActiveProducts, costoImposible } from "@/lib/supplier-catalog";
import { opcionesDePlaca } from "@/lib/armador-plataformas";
import { ArmadorClient } from "./armador-client";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Armador de PC",
  description:
    "Arma tu PC pieza por pieza con compatibilidad verificada: procesador, board, memoria, gráfica y fuente. Cotización inmediata y envío a toda Colombia.",
  alternates: { canonical: "/armador" },
};

// Las placas madre se leen del inventario REAL en el servidor y bajan por props: el
// armador es un componente de cliente y no puede leer del disco. Así, cuando cambian las
// listas de proveedor, el armador ofrece lo nuevo sin tocar código.
export default function ArmadorPage() {
  // Lo que tiene un costo mal leído (una B760 a $179.000) no se ofrece como "en stock": el
  // cotizador del armador tampoco lo usa, y la placa se cotizaría fuera con otra entrega.
  const productos = loadActiveProducts().filter((p) => !costoImposible(p));
  return (
    <ArmadorClient
      placas={{
        amd:   opcionesDePlaca(productos, "amd"),
        intel: opcionesDePlaca(productos, "intel"),
      }}
    />
  );
}
