import { loadBusinessProducts } from "@/lib/products";
import { resolveProductImage } from "@/lib/product-images";
import { ProductManager, type ManagedBusinessProduct } from "@/components/admin/product-manager";
import { SupplierListsManager } from "@/components/admin/supplier-lists-manager";
import { JanusImporter } from "@/components/admin/janus-importer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Productos · Admin" };

const TABS = [
  { id: "productos", label: "📋 Gestionar productos" },
  { id: "pdf",       label: "📄 Listas de precios (Word/Excel)" },
  { id: "janus",     label: "🖥️ Lista Janus (PDF)" },
] as const;

export default async function ProductosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filter?: string }>;
}) {
  const { tab = "productos", filter = "all" } = await searchParams;
  const activeTab = (
    tab === "pdf" ? "pdf" : tab === "janus" ? "janus" : "productos"
  ) as "productos" | "pdf" | "janus";

  const raw = loadBusinessProducts();

  const products: ManagedBusinessProduct[] = raw.map((p) => {
    const identifier = p.referencia ?? p.slug ?? p.id;
    return {
      ...p,
      id:         p.id   ?? identifier,
      slug:       p.slug ?? identifier,
      cardUrl:    resolveProductImage(identifier, "card"),
      detalleUrl: resolveProductImage(identifier, "detalle"),
    };
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">📋 Gestión de Productos</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Edita info, imágenes y visibilidad · Importa productos desde listas de precios en Word o Excel.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 w-fit shadow-sm">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`/admin/productos?tab=${t.id}`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition
              ${activeTab === t.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900"
              }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {activeTab === "productos" && <ProductManager products={products} initialFilter={filter} />}
      {activeTab === "pdf"       && <SupplierListsManager />}
      {activeTab === "janus"     && <JanusImporter />}
    </div>
  );
}
