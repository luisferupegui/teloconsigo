import Link from "next/link";
import { NewProductForm } from "@/components/admin/new-product-form";
import { loadBusinessProducts } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo producto · Admin" };

export default function NuevoProductoPage() {
  // Cuántas cards ocupa ya cada sección del home: el formulario avisa antes de que el
  // cliente elija una llena, en vez de dejarle descubrirlo al guardar.
  const productos = loadBusinessProducts();
  const destCount = productos.filter((p) => p.destacado).length;
  const accCount  = productos.filter((p) => p.enAccesorios).length;

  return (
    <div>
      <nav className="mb-3 text-xs text-zinc-500">
        <Link href="/admin/marketing" className="hover:underline">
          Productos
        </Link>
        <span className="mx-2">/</span>
        <span>Nuevo</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">➕ Nuevo producto</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ingresa la información, elige la categoría y sube las imágenes — igual que en el editor.
        </p>
      </div>

      <NewProductForm destCount={destCount} accCount={accCount} />
    </div>
  );
}
