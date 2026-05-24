import Link from "next/link";
import { getAllProducts, formatCOP } from "@/lib/products";
import { categories } from "@/lib/categories";
import { deleteProduct } from "./actions";
import { SmartImage } from "@/components/smart-image";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const { q, cat } = await searchParams;
  let list = getAllProducts();
  if (q) {
    const term = q.toLowerCase();
    list = list.filter((p) =>
      `${p.nombre} ${p.marca} ${p.categoria}`.toLowerCase().includes(term),
    );
  }
  if (cat) list = list.filter((p) => p.categoria === cat);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Productos</h1>
          <p className="text-sm text-zinc-600">
            {list.length} producto{list.length !== 1 && "s"} en catálogo
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/importar"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold hover:border-[#1e6cff]"
          >
            📥 Importar CSV
          </Link>
          <Link
            href="/admin/nuevo"
            className="rounded-md bg-[#1e6cff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1858d6]"
          >
            ➕ Nuevo producto
          </Link>
        </div>
      </div>

      <form
        action="/admin"
        className="mt-6 flex flex-wrap gap-2 rounded-lg border border-zinc-200 bg-white p-3"
      >
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre, marca…"
          className="flex-1 min-w-[200px] rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <select
          name="cat"
          defaultValue={cat ?? ""}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.nombre}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Filtrar
        </button>
        {(q || cat) && (
          <Link
            href="/admin"
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm"
          >
            Limpiar
          </Link>
        )}
      </form>

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3 text-right">Precio</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {list.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  No hay productos.{" "}
                  <Link
                    href="/admin/nuevo"
                    className="text-[#1e6cff] hover:underline"
                  >
                    Crea el primero →
                  </Link>
                </td>
              </tr>
            ) : (
              list.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <SmartImage
                        src={p.imagen}
                        alt={p.nombre}
                        className="h-12 w-12 shrink-0 rounded border border-zinc-200"
                        emojiSize="text-2xl"
                      />
                      <div>
                        <p className="font-semibold text-zinc-900">
                          {p.nombre}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {p.marca} · /{p.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {categories.find((c) => c.slug === p.categoria)?.nombre ??
                      p.categoria}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCOP(p.precio)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        p.stock > 0
                          ? "font-semibold text-emerald-600"
                          : "font-semibold text-red-600"
                      }
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.destacado && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        ★ Destacado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/producto/${p.slug}`}
                        target="_blank"
                        className="rounded border border-zinc-300 px-2 py-1 text-xs hover:border-[#1e6cff]"
                        title="Ver en tienda"
                      >
                        👁️
                      </Link>
                      <Link
                        href={`/admin/${p.id}/editar`}
                        className="rounded border border-zinc-300 px-2 py-1 text-xs hover:border-[#1e6cff]"
                      >
                        ✏️ Editar
                      </Link>
                      <form action={deleteProduct}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="rounded border border-zinc-300 px-2 py-1 text-xs text-red-600 hover:border-red-500 hover:bg-red-50"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
