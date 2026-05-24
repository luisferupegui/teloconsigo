"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "./product-card";
import { formatCOP, type Product } from "@/lib/products-types";

type SortOption =
  | "destacados"
  | "precio-asc"
  | "precio-desc"
  | "rating"
  | "nombre";

export function CategoryFilters({ products }: { products: Product[] }) {
  const [sort, setSort] = useState<SortOption>("destacados");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Brands disponibles en estos productos
  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.marca))).sort(),
    [products],
  );

  // Precio máximo de los productos
  const maxPriceAvailable = useMemo(
    () => Math.max(...products.map((p) => p.precio)),
    [products],
  );

  // Filtrar y ordenar
  const filtered = useMemo(() => {
    let r = [...products];
    if (selectedBrands.length > 0) {
      r = r.filter((p) => selectedBrands.includes(p.marca));
    }
    if (maxPrice !== null) {
      r = r.filter((p) => p.precio <= maxPrice);
    }
    if (inStockOnly) {
      r = r.filter((p) => p.stock > 0);
    }
    switch (sort) {
      case "precio-asc":
        r.sort((a, b) => a.precio - b.precio);
        break;
      case "precio-desc":
        r.sort((a, b) => b.precio - a.precio);
        break;
      case "rating":
        r.sort((a, b) => b.rating - a.rating);
        break;
      case "nombre":
        r.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      case "destacados":
      default:
        r.sort(
          (a, b) =>
            (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) ||
            b.rating - a.rating,
        );
    }
    return r;
  }, [products, selectedBrands, maxPrice, inStockOnly, sort]);

  const toggleBrand = (b: string) =>
    setSelectedBrands((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b],
    );

  const clearAll = () => {
    setSelectedBrands([]);
    setMaxPrice(null);
    setInStockOnly(false);
    setSort("destacados");
  };

  const activeFilters =
    selectedBrands.length + (maxPrice !== null ? 1 : 0) + (inStockOnly ? 1 : 0);

  const FiltersPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-zinc-900">Ordenar por</h3>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="destacados">Más relevantes</option>
          <option value="precio-asc">Precio: menor a mayor</option>
          <option value="precio-desc">Precio: mayor a menor</option>
          <option value="rating">Mejor valorados</option>
          <option value="nombre">Nombre A-Z</option>
        </select>
      </div>

      {brands.length > 1 && (
        <div>
          <h3 className="text-sm font-bold text-zinc-900">Marca</h3>
          <ul className="mt-2 space-y-2">
            {brands.map((b) => (
              <li key={b}>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(b)}
                    onChange={() => toggleBrand(b)}
                    className="h-4 w-4 rounded border-zinc-300 text-[#1e6cff] focus:ring-[#1e6cff]"
                  />
                  <span>{b}</span>
                  <span className="ml-auto text-xs text-zinc-400">
                    {products.filter((p) => p.marca === b).length}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-zinc-900">Precio máximo</h3>
        <input
          type="range"
          min={0}
          max={maxPriceAvailable}
          step={Math.max(1, Math.floor(maxPriceAvailable / 100))}
          value={maxPrice ?? maxPriceAvailable}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="mt-3 w-full accent-[#1e6cff]"
        />
        <p className="mt-2 text-sm font-semibold text-[#1e6cff]">
          Hasta {formatCOP(maxPrice ?? maxPriceAvailable)}
        </p>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-[#1e6cff]"
          />
          <span>Solo productos en stock</span>
        </label>
      </div>

      {activeFilters > 0 && (
        <button
          onClick={clearAll}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:border-red-500 hover:text-red-600"
        >
          <X className="h-4 w-4" /> Limpiar {activeFilters} filtro
          {activeFilters !== 1 && "s"}
        </button>
      )}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Sidebar desktop */}
      <aside className="hidden lg:block sticky top-32 self-start rounded-2xl border border-zinc-200 bg-white p-5 max-h-[calc(100vh-9rem)] overflow-y-auto">
        {FiltersPanel}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[80] bg-zinc-900/50 backdrop-blur"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">Filtros</h2>
              <button onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {FiltersPanel}
          </div>
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm text-zinc-600">
            <span className="font-bold text-zinc-900">{filtered.length}</span>{" "}
            de {products.length} productos
            {activeFilters > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-[#1e6cff]">
                {activeFilters} filtro{activeFilters !== 1 && "s"} activo
                {activeFilters !== 1 && "s"}
              </span>
            )}
          </p>
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filtros
            {activeFilters > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1e6cff] text-xs text-white">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
            <p className="text-2xl">🔍</p>
            <p className="mt-3 font-display text-lg font-bold">
              Sin resultados con esos filtros
            </p>
            <button
              onClick={clearAll}
              className="mt-3 text-sm font-semibold text-[#1e6cff] hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
