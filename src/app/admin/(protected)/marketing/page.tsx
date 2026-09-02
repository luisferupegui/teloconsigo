import Link from "next/link";
import { Plus } from "lucide-react";
import { loadBusinessProducts } from "@/lib/products";
import { resolveProductImage } from "@/lib/product-images";
import { ProductManager, type ManagedBusinessProduct } from "@/components/admin/product-manager";
import { SupplierListsManager } from "@/components/admin/supplier-lists-manager";
import { ImportadorListas } from "@/components/admin/importador-listas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Productos · Admin" };

// Cada sección del panel es su propio encabezado. Antes, "Listas cargadas" y "Buscar
// productos" eran sub-pestañas escondidas dentro de Word/Excel, y los paneles de claves y
// mantenimiento se apilaban encima de ellas: para consultar una lista había que pasar por
// la pantalla de importar. Ahora se llega a cada cosa directamente.
//
// Importar era TRES pestañas —Word/Excel, PDF y Catimporter— y había que saber de
// antemano cuál abrir según la extensión del archivo. Para quien importa es siempre la
// misma tarea, así que ahora es una sola: el importador reconoce el formato solo.
const TABS = [
  { id: "productos",    label: "📋 Gestionar productos" },
  { id: "importador",   label: "📥 Importador de listas" },
  { id: "listas",       label: "📚 Listas cargadas" },
  { id: "buscar",       label: "🔍 Buscar productos" },
  { id: "herramientas", label: "🛠️ Herramientas" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Ids de pestañas que ya no existen. Se siguen aceptando para no romper los enlaces
// con ?tab= que estén guardados en un marcador.
const ALIAS: Record<string, TabId> = {
  janus:        "importador",
  pdf:          "importador",
  "listas-pdf": "importador",
  catimporter:  "importador",
};

export default async function ProductosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filter?: string }>;
}) {
  const { tab = "productos", filter = "all" } = await searchParams;
  const pedida = ALIAS[tab] ?? tab;
  const activeTab: TabId = TABS.some((t) => t.id === pedida) ? (pedida as TabId) : "productos";

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
          <h1 className="text-2xl font-bold text-zinc-900">📣 Marketing</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Qué se publica en la web, qué se destaca y qué entra en promoción · Importa productos desde las listas de tus proveedores.
          </p>
        </div>
        <Link
          href="/admin/nuevo"
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo producto
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 w-fit shadow-sm">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`/admin/marketing?tab=${t.id}`}
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

      {activeTab === "productos"    && <ProductManager products={products} initialFilter={filter} />}
      {activeTab === "importador"   && <ImportadorListas />}
      {activeTab === "listas"       && <SupplierListsManager vista="listas" />}
      {activeTab === "buscar"       && <SupplierListsManager vista="buscar" />}
      {activeTab === "herramientas" && <SupplierListsManager vista="herramientas" />}
    </div>
  );
}
