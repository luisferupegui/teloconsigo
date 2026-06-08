import Link from "next/link";
import { loadPublishedBusinessProducts, formatCOP } from "@/lib/products";
import type { BusinessProduct } from "@/lib/products";
import { BusinessProductCard } from "@/components/business-product-card";
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

// SPEC_LABEL movido a src/components/business-product-card.tsx

// ─── Paleta de colores por categoría ─────────────────────────────────────────
// Inspirada en el azul corporativo #1e6cff como ancla.
// Colores profesionales y equilibrados, distinguibles entre sí.

const SECCIONES = [
  {
    usoCaso:     "portatil-ejecutivo" as const,
    titulo:      "Portátiles Ejecutivos",
    tags:        ["Livianos", "Elegantes", "Batería larga"],
    descripcion: "Para profesionales que exigen lo mejor. ThinkPad, Dell Pro, Asus ExpertBook — transmiten empresa desde el primer vistazo.",
    icon:        Laptop,
    // Degradado profundo en el azul de marca
    iconGradient:"from-[#0f3d91] to-[#1e6cff]",
    // Badge pill: fondo muy suave, texto oscuro, borde sutil
    badge:       "bg-[#1e6cff] text-white ring-1 ring-inset ring-white/20 hover:bg-blue-600",
    tagText:     "text-blue-700",
  },
  {
    usoCaso:     "portatil-oficina" as const,
    titulo:      "Equipos para Oficina",
    tags:        ["Rápidos", "Confiables", "Multitarea"],
    descripcion: "El balance perfecto entre precio y rendimiento para el trabajo diario. Ideales para contadores, abogados y startups.",
    icon:        Laptop,
    iconGradient:"from-sky-600 to-sky-400",
    badge:       "bg-[#1e6cff] text-white ring-1 ring-inset ring-white/20 hover:bg-blue-600",
    tagText:     "text-sky-700",
  },
  {
    usoCaso:     "pc-empresarial" as const,
    titulo:      "PCs Empresariales",
    tags:        ["Oficinas", "Puntos de venta", "Empresas"],
    descripcion: "Equipos de escritorio completos con monitor incluido. Listos para instalar y trabajar desde el primer día.",
    icon:        Cpu,
    iconGradient:"from-slate-700 to-slate-500",
    badge:       "bg-[#1e6cff] text-white ring-1 ring-inset ring-white/20 hover:bg-blue-600",
    tagText:     "text-slate-600",
  },
  {
    usoCaso:     "monitor" as const,
    titulo:      "Monitores",
    tags:        ["Productividad", "Setups dobles", "Ergonomía"],
    descripcion: "Samsung, LG, AOC, Dahua. Desde 22\" hasta 32\". Para escritorios de una o doble pantalla.",
    icon:        Monitor,
    iconGradient:"from-teal-700 to-teal-500",
    badge:       "bg-[#1e6cff] text-white ring-1 ring-inset ring-white/20 hover:bg-blue-600",
    tagText:     "text-teal-700",
  },
  {
    usoCaso:     "tablet-empresarial" as const,
    titulo:      "Tablets Empresariales",
    tags:        ["Ventas", "Inventario", "Movilidad"],
    descripcion: "Para equipos en campo, puntos de venta y trabajo remoto. Lenovo y Samsung con soporte garantizado.",
    icon:        Tablet,
    iconGradient:"from-indigo-700 to-indigo-500",
    badge:       "bg-[#1e6cff] text-white ring-1 ring-inset ring-white/20 hover:bg-blue-600",
    tagText:     "text-indigo-700",
  },
  {
    usoCaso:     "accesorio" as const,
    titulo:      "Accesorios",
    tags:        ["Mouse", "Teclados", "USB", "Discos"],
    descripcion: "Combos inalámbricos Logitech, memorias USB y microSD Kingston, discos externos ADATA. Todo lo que necesita tu equipo.",
    icon:        Package,
    iconGradient:"from-amber-700 to-amber-500",
    badge:       "bg-[#1e6cff] text-white ring-1 ring-inset ring-white/20 hover:bg-blue-600",
    tagText:     "text-amber-700",
  },
  {
    usoCaso:     "licencia" as const,
    titulo:      "Licencias y Software",
    tags:        ["Windows", "Office", "Antivirus"],
    descripcion: "Licencias originales Microsoft y antivirus empresarial ESET y Kaspersky. Activación inmediata, sin complicaciones.",
    icon:        Key,
    iconGradient:"from-emerald-700 to-emerald-500",
    badge:       "bg-[#1e6cff] text-white ring-1 ring-inset ring-white/20 hover:bg-blue-600",
    tagText:     "text-emerald-700",
  },
] as const;

// BusinessProductCard → src/components/business-product-card.tsx

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
      {/* Header de sección */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          {/* Icono con sombra */}
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${sec.iconGradient} shadow-lg`}
          >
            <sec.icon className="h-5 w-5 text-white" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-zinc-900">{sec.titulo}</h2>
            {/* Tags como chips de colores */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {sec.tags.map((tag) => (
                <span
                  key={tag}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 ${sec.tagText}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Precio mínimo */}
        {minPrecio && (
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Desde
            </p>
            <p className="text-2xl font-bold text-zinc-900 tabular-nums">
              {formatCOP(minPrecio)}
            </p>
          </div>
        )}
      </div>

      <p className="text-sm text-zinc-600 mb-6 max-w-2xl leading-relaxed">
        {sec.descripcion}
      </p>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-sm text-zinc-400">
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
  const allProducts = loadPublishedBusinessProducts();
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
        <div className="max-w-xl">
          <h1 className="text-3xl font-bold text-zinc-900 sm:text-4xl leading-tight">
            Soluciones Tecnológicas
            <br />
            <span className="text-[#1e6cff]">para tu Empresa</span>
          </h1>
          <p className="mt-3 text-zinc-500 text-base leading-relaxed">
            No vendemos referencias técnicas. Te ayudamos a elegir el equipo
            correcto para tu operación — con cotización rápida y entrega ágil.
          </p>
          <div className="mt-12">
            <Link
              href="/conseguir"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#128C7E] to-[#25D366] px-6 py-3 text-sm font-bold text-white shadow-md shadow-[#25D366]/30 hover:shadow-lg hover:shadow-[#25D366]/50 hover:brightness-110 hover:scale-[1.02] transition-all duration-200"
            >
              <MessageCircle className="h-4 w-4" />
              Cotiza Ya Mismo
            </Link>
          </div>
        </div>

        {/* Filtros rápidos — pills con colores por categoría */}
        <div className="mt-11 flex flex-wrap gap-2.5">
          {SECCIONES.map((s) => {
            const count = byUso(s.usoCaso).length;
            return (
              <a
                key={s.usoCaso}
                href={`#${s.usoCaso}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition hover:opacity-80 ${s.badge}`}
              >
                <s.icon className="h-3.5 w-3.5" />
                {s.titulo}
                {count > 0 && (
                  <span className="ml-0.5 tabular-nums opacity-60">
                    ({count})
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-100 mb-12" />

      {/* Secciones */}
      {SECCIONES.map((sec) => (
        <div key={sec.usoCaso} id={sec.usoCaso}>
          <SeccionUso sec={sec} products={byUso(sec.usoCaso)} />
        </div>
      ))}

      {/* CTA final */}
      <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#0f3d91] to-[#1e6cff] p-8 text-white text-center">
        <Building2 className="mx-auto mb-3 h-8 w-8 opacity-80" />
        <h2 className="text-xl font-bold mb-2">
          ¿No encontraste lo que buscabas?
        </h2>
        <p className="text-blue-100 text-sm mb-5 max-w-md mx-auto leading-relaxed">
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
