import Link from "next/link";
import { categories } from "@/lib/categories";
import type { Product } from "@/lib/products";

export function ProductForm({
  action,
  product,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  product?: Product;
  submitLabel: string;
}) {
  const specsStr = product
    ? Object.entries(product.specs)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")
    : "";

  return (
    <form
      action={action}
      className="grid gap-6 lg:grid-cols-[1fr_360px]"
    >
      <div className="space-y-5 rounded-lg border border-zinc-200 bg-white p-6">
        <div>
          <label className="block text-sm font-semibold text-zinc-900">
            Nombre del producto *
          </label>
          <input
            required
            name="nombre"
            defaultValue={product?.nombre ?? ""}
            placeholder="AMD Ryzen 7 7800X3D"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-zinc-900">
              Marca *
            </label>
            <input
              required
              name="marca"
              defaultValue={product?.marca ?? ""}
              placeholder="AMD"
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-900">
              Categoría *
            </label>
            <select
              required
              name="categoria"
              defaultValue={product?.categoria ?? ""}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Selecciona…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-900">
            Descripción
          </label>
          <textarea
            name="descripcion"
            rows={3}
            defaultValue={product?.descripcion ?? ""}
            placeholder="Descripción corta del producto…"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-900">
            Especificaciones técnicas
          </label>
          <textarea
            name="specs"
            rows={8}
            defaultValue={specsStr}
            placeholder={"socket: AM5\nnucleos: 8\nhilos: 16\nfrecuencia: 4.2 GHz"}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 font-mono text-xs"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Una spec por línea, formato <code>clave: valor</code>.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-900">
            Imagen (emoji o URL)
          </label>
          <input
            name="imagen"
            defaultValue={product?.imagen ?? "📦"}
            placeholder="🧠 o https://…"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Por ahora puedes usar un emoji. La subida real de imágenes se
            habilita cuando conectemos el backend.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-zinc-900">
            Slug (URL)
          </label>
          <input
            name="slug"
            defaultValue={product?.slug ?? ""}
            placeholder="amd-ryzen-7-7800x3d (se genera automáticamente)"
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <aside className="space-y-5">
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h3 className="text-sm font-bold text-zinc-900">Precio y stock</h3>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700">
                Precio (COP) *
              </label>
              <input
                required
                type="number"
                name="precio"
                min={0}
                defaultValue={product?.precio ?? 0}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700">
                Precio anterior (descuento)
              </label>
              <input
                type="number"
                name="precioAnterior"
                min={0}
                defaultValue={product?.precioAnterior ?? ""}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700">
                Stock disponible
              </label>
              <input
                type="number"
                name="stock"
                min={0}
                defaultValue={product?.stock ?? 0}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h3 className="text-sm font-bold text-zinc-900">Reputación</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700">
                Rating (1-5)
              </label>
              <input
                type="number"
                step="0.1"
                min={1}
                max={5}
                name="rating"
                defaultValue={product?.rating ?? 5}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700">
                Reseñas
              </label>
              <input
                type="number"
                min={0}
                name="reviews"
                defaultValue={product?.reviews ?? 0}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="destacado"
              defaultChecked={product?.destacado ?? false}
              className="h-4 w-4"
            />
            <span className="text-sm font-semibold">
              ★ Marcar como destacado
            </span>
          </label>
          <p className="mt-1 text-xs text-zinc-500">
            Aparece en la home en &quot;Productos destacados&quot;.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-md bg-[#1e6cff] px-4 py-3 text-sm font-bold text-white hover:bg-[#1858d6]"
          >
            {submitLabel}
          </button>
          <Link
            href="/admin"
            className="rounded-md border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold"
          >
            Cancelar
          </Link>
        </div>
      </aside>
    </form>
  );
}
