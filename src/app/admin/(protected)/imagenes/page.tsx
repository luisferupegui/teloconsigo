import { loadBusinessProducts, getAllProducts } from "@/lib/products";
import { resolveProductImage } from "@/lib/product-images";
import { ImageManager, type ManagedProduct } from "@/components/admin/image-manager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gestor de Imágenes · Admin",
};

export default function ImagenesAdminPage() {
  const businessProducts = loadBusinessProducts();
  const regularProducts  = getAllProducts();

  // Build unified list
  const products: ManagedProduct[] = [
    ...businessProducts.map((p) => ({
      id:          p.id,
      identifier:  p.referencia ?? p.slug ?? p.id,
      nombre:      p.nombre,
      marca:       p.marca,
      categoria:   p.categoria,
      tipo:        "empresarial" as const,
      cardUrl:     resolveProductImage(p.referencia ?? p.slug, "card"),
      detalleUrl:  resolveProductImage(p.referencia ?? p.slug, "detalle"),
    })),
    ...regularProducts.map((p) => ({
      id:          p.id,
      identifier:  p.slug,
      nombre:      p.nombre,
      marca:       p.marca,
      categoria:   p.categoria,
      tipo:        "general" as const,
      cardUrl:     resolveProductImage(p.slug, "card"),
      detalleUrl:  resolveProductImage(p.slug, "detalle"),
    })),
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">🖼️ Gestor de Imágenes</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sube, cambia o elimina imágenes de tarjeta (card) y de detalle para cada producto.
          Formatos soportados: <strong>JPG, PNG, WebP</strong> · Máx. <strong>10 MB</strong>.
        </p>
      </div>

      {/* Tips */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="flex gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="shrink-0 text-2xl">🃏</div>
          <div>
            <p className="text-sm font-bold text-indigo-900">Imagen de Tarjeta (Card)</p>
            <p className="text-xs text-indigo-700 leading-relaxed mt-0.5">
              Aparece en las cards de Productos Destacados del home y en el carrusel.
              Recomendado: <strong>800×800 px</strong>, fondo blanco o transparente, producto centrado.
            </p>
          </div>
        </div>
        <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="shrink-0 text-2xl">🔍</div>
          <div>
            <p className="text-sm font-bold text-emerald-900">Imagen de Detalle (Catálogo)</p>
            <p className="text-xs text-emerald-700 leading-relaxed mt-0.5">
              Aparece en la página de detalle del producto y en el catálogo completo.
              Recomendado: <strong>1200×1200 px</strong>, alta resolución, fotorrealística o silueta.
            </p>
          </div>
        </div>
      </div>

      <ImageManager products={products} />
    </div>
  );
}
