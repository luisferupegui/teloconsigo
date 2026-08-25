import { existsSync, statSync } from "fs";
import path from "path";
import Link from "next/link";
import { loadCategories } from "@/lib/categories";
import { conIconos } from "@/lib/categories-icons";
import { LineImageUploader } from "@/components/admin/line-image-uploader";
import { AccionesCategoria, NuevaLinea, AccionesLinea } from "@/components/admin/categoria-crud";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catálogo · Admin" };

const EXTS = ["webp", "jpg", "jpeg", "png"];

function resolveLineImage(categoria: string, slug: string, imagenPath?: string): string | null {
  // Slug-specific upload takes priority (deliberate admin override)
  for (const ext of EXTS) {
    const rel = `/lineas/${categoria}/${slug}.${ext}`;
    const abs = path.join(process.cwd(), "public", rel);
    if (existsSync(abs)) return `${rel}?v=${Math.floor(statSync(abs).mtimeMs)}`;
  }
  // Fall back to the shared brand-level image defined in categories.ts
  if (imagenPath) {
    const abs = path.join(process.cwd(), "public", imagenPath.replace(/^\//, ""));
    if (existsSync(abs)) return `${imagenPath}?v=${Math.floor(statSync(abs).mtimeMs)}`;
  }
  return null;
}

export default async function CatalogoAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria: catParam } = await searchParams;

  const categories = conIconos(loadCategories());
  const data = categories.map((cat) => {
    const lineas = (cat.lineas ?? []).map((l) => ({
      ...l,
      imageUrl: resolveLineImage(cat.slug, l.slug, l.imagen),
    }));
    const conImg = lineas.filter((l) => l.imageUrl).length;
    return { ...cat, lineas, conImg };
  });

  const totalLineas = data.reduce((s, c) => s + c.lineas.length, 0);
  const totalConImg = data.reduce((s, c) => s + c.conImg, 0);
  const totalSinImg = totalLineas - totalConImg;

  const catActiva = catParam ? data.find((c) => c.slug === catParam) ?? null : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">📦 Catálogo de Componentes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Imágenes de las líneas de producto que aparecen en{" "}
            <Link href="/tienda" target="_blank" className="text-indigo-600 hover:underline font-semibold">
              /tienda →
            </Link>
            {" "}Recomendado: <strong>600×600 px</strong>, fondo blanco, PNG o WebP.
          </p>
        </div>
        <a href="/tienda" target="_blank"
           className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold hover:border-indigo-400 transition">
          👁️ Ver catálogo
        </a>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Total líneas", value: totalLineas, color: "text-zinc-900"    },
          { label: "Con imagen",   value: totalConImg,  color: "text-emerald-600" },
          { label: "Sin imagen",   value: totalSinImg,  color: "text-amber-600"   },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Layout: sidebar + content */}
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">

        {/* Sidebar */}
        <aside className="space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-3 mb-3">
            Categorías
          </p>
          <Link
            href="/admin"
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition
              ${!catActiva
                ? "bg-indigo-600 text-white font-semibold shadow-sm"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
          >
            <span>Todas</span>
            <span className={`text-[11px] rounded-full px-1.5 py-0.5
              ${!catActiva ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"}`}>
              {totalLineas}
            </span>
          </Link>
          {data.map((cat) => (
            <Link
              key={cat.slug}
              href={`/admin?categoria=${cat.slug}`}
              className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition
                ${catActiva?.slug === cat.slug
                  ? "bg-indigo-600 text-white font-semibold shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
            >
              <span className="flex items-center gap-2 truncate">
                <cat.Icon className={`h-3.5 w-3.5 shrink-0
                  ${catActiva?.slug === cat.slug ? "text-white" : "text-indigo-500"}`} />
                <span className="truncate">{cat.nombre}</span>
              </span>
              <span className={`shrink-0 text-[11px] rounded-full px-1.5 py-0.5
                ${catActiva?.slug === cat.slug ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"}
                ${cat.lineas.length - cat.conImg > 0 && catActiva?.slug !== cat.slug ? "!bg-amber-100 !text-amber-700" : ""}`}>
                {cat.lineas.length}
              </span>
            </Link>
          ))}
        </aside>

        {/* Content */}
        <div>
          {catActiva ? (
            /* ── Categoría seleccionada: tabla de líneas ── */
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-zinc-100 bg-zinc-50 px-5 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                                border border-indigo-200 bg-indigo-50">
                  <catActiva.Icon className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-zinc-900">{catActiva.nombre}</span>
                  <span className="ml-2 text-xs text-zinc-400">{catActiva.descripcion}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                    {catActiva.conImg} con img
                  </span>
                  {catActiva.lineas.length - catActiva.conImg > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                      {catActiva.lineas.length - catActiva.conImg} sin img
                    </span>
                  )}
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 font-semibold text-zinc-600">
                    {catActiva.lineas.length} productos
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-5 py-3">
                <AccionesCategoria
                  slug={catActiva.slug}
                  nombre={catActiva.nombre}
                  descripcion={catActiva.descripcion}
                  icon={catActiva.icon}
                  lineas={catActiva.lineas.length}
                />
              </div>

              {catActiva.lineas.length === 0 ? (
                <p className="px-5 py-6 text-sm text-zinc-400">Todavía no hay productos en esta categoría.</p>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {catActiva.lineas.map((linea) => (
                    <div key={linea.slug} className="px-5 py-3 transition-colors hover:bg-zinc-50/70">
                      <div className="flex flex-wrap items-center gap-4">
                        <LineImageUploader
                          categoria={catActiva.slug}
                          slug={linea.slug}
                          initialUrl={linea.imageUrl}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-zinc-900">{linea.nombre}</p>
                          <p className="truncate text-xs text-zinc-500">{linea.marca}</p>
                          <p className="truncate font-mono text-[11px] text-zinc-400">{linea.slug}</p>
                        </div>

                        {linea.imageUrl ? (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                            ✓ Con imagen
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
                            ⚠ Sin imagen
                          </span>
                        )}

                        <AccionesLinea
                          categoria={catActiva.slug}
                          slug={linea.slug}
                          marca={linea.marca}
                          nombre={linea.nombre}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <NuevaLinea categoria={catActiva.slug} />
            </div>
          ) : (
            /* ── Sin categoría: grid de resumen ── */
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/admin?categoria=${cat.slug}`}
                  className="group flex items-center gap-4 rounded-xl border border-zinc-200
                             bg-white p-4 shadow-sm transition-all
                             hover:-translate-y-0.5 hover:border-indigo-400/40
                             hover:shadow-[0_6px_20px_rgba(99,102,241,0.08)]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                                  border border-indigo-200 bg-indigo-50
                                  group-hover:bg-indigo-100 transition">
                    <cat.Icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-900 group-hover:text-indigo-600 transition truncate">
                      {cat.nombre}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{cat.descripcion}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-emerald-600">
                        {cat.conImg} con img
                      </span>
                      {cat.lineas.length - cat.conImg > 0 && (
                        <span className="text-[11px] font-semibold text-amber-600">
                          · {cat.lineas.length - cat.conImg} sin img
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400 group-hover:text-indigo-500 transition">
                    →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
