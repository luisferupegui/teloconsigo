import Link from "next/link";
import { loadBusinessProducts, formatCOP } from "@/lib/products";
import type { BusinessProduct } from "@/lib/products";
import {
  Laptop,
  Monitor,
  Tablet,
  Building2,
  Cpu,
  Key,
  Package,
  MessageCircle,
  Zap,
} from "lucide-react";

export const metadata = {
  title: "Productos | teloconsigo.co",
  description:
    "Equipos tecnológicos corporativos: portátiles ejecutivos, PCs empresariales, monitores, tablets, accesorios y licencias. Cotización rápida.",
};

// ─── Secciones por caso de uso ────────────────────────────────────────────────

const SECCIONES = [
  {
    usoCaso: "portatil-ejecutivo" as const,
    titulo: "Portátiles Ejecutivos",
    subtitulo: "Livianos · Elegantes · Batería larga",
    descripcion:
      "Para profesionales que exigen lo mejor. ThinkPad, Dell Pro, Asus ExpertBook — transmiten empresa desde el primer vistazo.",
    icon: Laptop,
    color: "from-blue-600 to-blue-800",
    badgeColor: "bg-blue-100 text-blue-800",
  },
  {
    usoCaso: "portatil-oficina" as const,
    titulo: "Equipos para Oficina",
    subtitulo: "Rápidos · Confiables · Multitarea",
    descripcion:
      "El balance perfecto entre precio y rendimiento para el trabajo diario. Ideales para contadores, abogados y startups.",
    icon: Laptop,
    color: "from-indigo-500 to-indigo-700",
    badgeColor: "bg-indigo-100 text-indigo-800",
  },
  {
    usoCaso: "pc-empresarial" as const,
    titulo: "PCs Empresariales",
    subtitulo: "Oficinas · Puntos de venta · Empresas",
    descripcion:
      "Equipos de escritorio completos con monitor. Listos para instalar y trabajar desde el primer día.",
    icon: Cpu,
    color: "from-slate-600 to-slate-800",
    badgeColor: "bg-slate-100 text-slate-800",
  },
  {
    usoCaso: "monitor" as const,
    titulo: "Monitores",
    subtitulo: "Productividad · Setups · Ergonomía",
    descripcion:
      "Samsung, LG, AOC. Para un solo monitor o para montar doble pantalla y multiplicar tu productividad.",
    icon: Monitor,
    color: "from-cyan-500 to-cyan-700",
    badgeColor: "bg-cyan-100 text-cyan-800",
  },
  {
    usoCaso: "tablet-empresarial" as const,
    titulo: "Tablets Empresariales",
    subtitulo: "Ventas · Inventario · Movilidad",
    descripcion:
      "Para equipos en campo, puntos de venta y trabajo remoto. Lenovo y Samsung con soporte garantizado.",
    icon: Tablet,
    color: "from-violet-500 to-violet-700",
    badgeColor: "bg-violet-100 text-violet-800",
  },
  {
    usoCaso: "accesorio" as const,
    titulo: "Accesorios",
    subtitulo: "Mouse · Teclados · USB · Discos",
    descripcion:
      "Todo lo que necesita tu equipo de trabajo: combos inalámbricos Logitech, memorias USB, microSD y discos externos Kingston y ADATA.",
    icon: Package,
    color: "from-orange-500 to-orange-700",
    badgeColor: "bg-orange-100 text-orange-800",
  },
  {
    usoCaso: "licencia" as const,
    titulo: "Licencias y Software",
    subtitulo: "Windows · Office · Antivirus",
    descripcion:
      "Licencias originales Microsoft y antivirus empresarial. Activación inmediata, sin complicaciones.",
    icon: Key,
    color: "from-emerald-500 to-emerald-700",
    badgeColor: "bg-emerald-100 text-emerald-800",
  },
] as const;

// ─── Tarjeta de producto ──────────────────────────────────────────────────────

function BusinessProductCard({ product }: { product: BusinessProduct }) {
  const price = product.precioDesde ?? product.precio;

  // Muestra solo las 3 primeras specs relevantes
  const specEntries = Object.entries(product.specs).slice(0, 3);

  return (
    <div className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:-translate-y-0.5">
      <h3 className="text-sm font-semibold text-zinc-900 leading-snug line-clamp-2">
        {product.nombre}
      </h3>

      <p className="mt-1.5 text-xs text-zinc-500 line-clamp-2">
        {product.descripcionUso}
      </p>

      {/* Specs principales */}
      <div className="mt-3 space-y-1 flex-1">
        {specEntries.map(([k, v]) => (
          <div key={k} className="flex gap-1.5 text-xs text-zinc-600">
            <span className="font-medium capitalize text-zinc-400 w-20 shrink-0">
              {k}
            </span>
            <span className="line-clamp-1">{String(v)}</span>
          </div>
        ))}
      </div>

      {/* Precio y CTA */}
      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          {price ? (
            <>
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
                Desde
              </span>
              <p className="text-lg font-bold text-zinc-900 leading-tight">
                {formatCOP(price)}
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-zinc-500">
              Consultar precio
            </p>
          )}
        </div>
        <Link
          href={`/conseguir?ref=${product.referencia ?? product.slug}`}
          className="shrink-0 rounded-full bg-[#1e6cff] px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          Cotizar
        </Link>
      </div>
    </div>
  );
}

// ─── Sección de categoría ─────────────────────────────────────────────────────

function SeccionUso({
  sec,
  products,
}: {
  sec: (typeof SECCIONES)[number];
  products: BusinessProduct[];
}) {
  const precios = products
    .map((p) => p.precioDesde ?? p.precio)
    .filter((v): v is number => v !== null);
  const minPrecio = precios.length ? Math.min(...precios) : null;

  return (
    <section className="mb-16">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${sec.color} shrink-0`}
          >
            <sec.icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">{sec.titulo}</h2>
            <p className="text-sm text-zinc-500">{sec.subtitulo}</p>
          </div>
        </div>

        {minPrecio && (
          <div className="text-right">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">
              Desde
            </p>
            <p className="text-xl font-bold text-zinc-900">
              {formatCOP(minPrecio)}
            </p>
          </div>
        )}
      </div>

      <p className="text-sm text-zinc-600 mb-6 max-w-2xl">{sec.descripcion}</p>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400">
          Próximamente — estamos cargando el catálogo de{" "}
          {sec.titulo.toLowerCase()}.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <BusinessProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductosPage() {
  const allProducts = loadBusinessProducts();
  const byUso = (uso: BusinessProduct["usoCaso"]) =>
    allProducts.filter((p) => p.usoCaso === uso);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-zinc-500 mb-6">
        <Link href="/" className="hover:underline">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <span>Productos</span>
      </nav>

      {/* Hero */}
      <div className="mb-12">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 sm:text-4xl">
              Soluciones Tecnológicas
              <br />
              <span className="text-[#1e6cff]">para tu Empresa</span>
            </h1>
            <p className="mt-3 text-zinc-600 max-w-xl text-base">
              No vendemos referencias técnicas. Te ayudamos a elegir el equipo
              correcto para tu operación, con cotización rápida y entrega ágil.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/asesor"
              className="inline-flex items-center gap-2 rounded-full bg-[#1e6cff] px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              <Zap className="h-4 w-4" />
              Asesor IA
            </Link>
            <Link
              href="/conseguir"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition"
            >
              <MessageCircle className="h-4 w-4" />
              Cotizar ahora
            </Link>
          </div>
        </div>

        {/* Filtros rápidos */}
        <div className="mt-8 flex flex-wrap gap-2">
          {SECCIONES.map((s) => {
            const count = byUso(s.usoCaso).length;
            return (
              <a
                key={s.usoCaso}
                href={`#${s.usoCaso}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition hover:opacity-80 ${s.badgeColor}`}
              >
                <s.icon className="h-3.5 w-3.5" />
                {s.titulo}
                {count > 0 && (
                  <span className="ml-0.5 opacity-60">({count})</span>
                )}
              </a>
            );
          })}
        </div>
      </div>

      {/* Secciones */}
      {SECCIONES.map((sec) => (
        <div key={sec.usoCaso} id={sec.usoCaso}>
          <SeccionUso sec={sec} products={byUso(sec.usoCaso)} />
        </div>
      ))}

      {/* CTA final */}
      <div className="mt-8 rounded-2xl bg-gradient-to-r from-[#1e6cff] to-blue-700 p-8 text-white text-center">
        <Building2 className="mx-auto mb-3 h-8 w-8 opacity-80" />
        <h2 className="text-xl font-bold mb-2">
          ¿No encontraste lo que buscabas?
        </h2>
        <p className="text-blue-100 text-sm mb-5 max-w-md mx-auto">
          Tenemos acceso a cientos de referencias más a través de nuestros
          mayoristas. Cuéntanos qué necesitas y te cotizamos en minutos.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/conseguir"
            className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition"
          >
            Te lo conseguimos →
          </Link>
          <Link
            href="/asesor"
            className="rounded-full border border-white/40 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition"
          >
            Consultar con Asesor IA
          </Link>
        </div>
      </div>
    </div>
  );
}
