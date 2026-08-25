import { loadActiveProducts } from "@/lib/supplier-catalog";
import { opcionesDePlaca } from "@/lib/armador-plataformas";
import { ArmadorClient } from "./armador-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Armador de PC | teloconsigo.co" };

// Las placas madre se leen del inventario REAL en el servidor y bajan por props: el
// armador es un componente de cliente y no puede leer del disco. Así, cuando cambian las
// listas de proveedor, el armador ofrece lo nuevo sin tocar código.
export default function ArmadorPage() {
  const productos = loadActiveProducts();
  return (
    <ArmadorClient
      placas={{
        amd:   opcionesDePlaca(productos, "amd"),
        intel: opcionesDePlaca(productos, "intel"),
      }}
    />
  );
}
