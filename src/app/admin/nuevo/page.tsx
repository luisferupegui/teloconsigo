import Link from "next/link";
import { ProductForm } from "../ProductForm";
import { createProduct } from "../actions";

export const metadata = { title: "Nuevo producto" };

export default function NuevoProductoPage() {
  return (
    <div>
      <nav className="text-xs text-zinc-500 mb-3">
        <Link href="/admin" className="hover:underline">
          Productos
        </Link>
        <span className="mx-2">/</span>
        <span>Nuevo</span>
      </nav>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">
        ➕ Nuevo producto
      </h1>
      <ProductForm action={createProduct} submitLabel="Crear producto" />
    </div>
  );
}
