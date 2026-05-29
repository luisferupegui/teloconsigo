import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/products";
import { ProductForm } from "../../../ProductForm";
import { updateProduct } from "../../../actions";

export const metadata = { title: "Editar producto" };

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  const action = updateProduct.bind(null, id);

  return (
    <div>
      <nav className="text-xs text-zinc-500 mb-3">
        <Link href="/admin" className="hover:underline">
          Productos
        </Link>
        <span className="mx-2">/</span>
        <span>Editar</span>
      </nav>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">
        ✏️ Editar: {product.nombre}
      </h1>
      <ProductForm
        action={action}
        product={product}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
