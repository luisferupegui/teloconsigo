import Link from "next/link";
import { loadPublishedBusinessProducts, formatCOP } from "@/lib/products";
import type { BusinessProduct } from "@/lib/products";
import { BusinessProductCard } from "@/components/business-product-card";
import { esDeLaSeccion } from "@/lib/promociones-relleno";
import {
  Laptop,
  Monitor,
  Tablet,
  Building2,
  Key,
  Package,
  MessageCircle,
  Gamepad2,
  Server,
  Video,
  Wifi,
  Home,
  Cpu,
} from "lucide-react";

export const metadata = {
  alternates: { canonical: "/soluciones" },
  title: "Promociones en tecnología",
  description:
    "Soluciones tecnológicas para hogar, gaming, oficina, movilidad, redes, creadores y más. Cotización rápida con asesoría experta.",
};

// ─── Tipo de sección ──────────────────────────────────────────────────────────
// filterBy:'usoCaso' → filtra por p.usoCaso (campos legacy existentes)
// filterBy:'segmento' → filtra por p.segmento (nuevas categorías del admin)

type SeccionDef = {
  id:           string;
  filterBy:     "usoCaso" | "segmento";
  filterValue:  string;
  titulo:       string;
  tags:         string[];
  descripcion:  string;
  icon:         React.ComponentType<{ className?: string }>;
  iconGradient: string;
  badge:        string;
  badgeIcon:    string;
  tagText:      string;
};

// ─── 11 secciones ─────────────────────────────────────────────────────────────

const PILL = "bg-[#1e6cff] text-white ring-1 ring-inset ring-white/20 hover:bg-blue-600 hover:ring-white/30";

const SECCIONES: SeccionDef[] = [
  {
    id:           "hogar-estudio",
    filterBy:     "segmento",
    filterValue:  "hogar-estudio",
    titulo:       "Hogar y Estudio",
    tags:         ["Teletrabajo", "Estudio", "Económicos"],
    descripcion:  "PCs y portátiles ágiles, confiables para estudiar, trabajar y disfrutar en casa con el equilibrio ideal entre rendimiento y precio.",
    icon:         Home,
    iconGradient: "from-sky-600 to-sky-400",
    badge:        PILL,
    badgeIcon:    "text-white",
    tagText:      "text-sky-700",
  },
  {
    id:           "gaming-streaming",
    filterBy:     "segmento",
    filterValue:  "gaming-streaming",
    titulo:       "Gaming y Streaming",
    tags:         ["Alta Gráficos", "FPS", "Streaming"],
    descripcion:  "Equipos de alto rendimiento con gráficos avanzados, pantallas fluidas y potencia diseñada para jugar y transmitir sin límites.",
    icon:         Gamepad2,
    iconGradient: "from-violet-700 to-purple-500",
    badge:        PILL,
    badgeIcon:    "text-white",
    tagText:      "text-violet-700",
  },
  {
    id:           "productividad-oficina",
    filterBy:     "usoCaso",
    filterValue:  "pc-empresarial",
    titulo:       "Productividad y Oficina",
    tags:         ["Oficinas", "Puntos de venta", "Empresas"],
    descripcion:  "PCs y portátiles confiables para multitarea, videollamadas y trabajo profesional desde el primer día.",
    icon:         Building2,
    iconGradient: "from-slate-700 to-slate-500",
    badge:        PILL,
    badgeIcon:    "text-white",
    tagText:      "text-slate-600",
  },
  {
    id:           "movilidad-premium",
    filterBy:     "usoCaso",
    filterValue:  "portatil-ejecutivo",
    titulo:       "Movilidad Premium",
    tags:         ["Livianos", "Elegantes", "Batería larga"],
    descripcion:  "Portátiles ultra delgados y profesionales diseñados para trabajar con velocidad, autonomía y estilo desde cualquier lugar.",
    icon:         Laptop,
    iconGradient: "from-[#0f3d91] to-[#1e6cff]",
    badge:        PILL,
    badgeIcon:    "text-white",
    tagText:      "text-blue-700",
  },
  {
    id:           "redes-servidores",
    filterBy:     "segmento",
    filterValue:  "redes-servidores",
    titulo:       "Redes y Servidores",
    tags:         ["Routers", "Switches", "NAS"],
    descripcion:  "Infraestructura empresarial con conectividad estable, segura y escalable para oficinas, negocios y entornos corporativos.",
    icon:         Server,
    iconGradient: "from-cyan-700 to-cyan-500",
    badge:        PILL,
    badgeIcon:    "text-white",
    tagText:      "text-cyan-700",
  },
  {
    id:           "creadores-produccion",
    filterBy:     "segmento",
    filterValue:  "creadores-produccion",
    titulo:       "Creadores y Producción",
    tags:         ["Diseño", "Video", "Edición"],
    descripcion:  "Equipos con GPU dedicada y pantallas de alta fidelidad para edición, diseño y creación de contenido profesional.",
    icon:         Video,
    iconGradient: "from-rose-700 to-pink-500",
    badge:        PILL,
    badgeIcon:    "text-white",
    tagText:      "text-rose-700",
  },
  {
    id:           "smart-home",
    filterBy:     "segmento",
    filterValue:  "smart-home",
    titulo:       "Smart Home y Conectividad",
    tags:         ["Domótica", "Cámaras", "Asistentes"],
    descripcion:  "Tecnología inteligente para hogares y oficinas modernas con automatización, conectividad y entretenimiento integrado.",
    icon:         Wifi,
    iconGradient: "from-orange-600 to-amber-400",
    badge:        PILL,
    badgeIcon:    "text-white",
    tagText:      "text-orange-700",
  },
  {
    id:           "monitores",
    filterBy:     "usoCaso",
    filterValue:  "monitor",
    titulo:       "Monitores",
    tags:         ["Productividad", "Setups dobles", "Ergonomía"],
    descripcion:  "Monitores Samsung, LG, Dell, Asus, AOC y Viewsonic para productividad, Gaming y configuraciones de una o doble pantalla.",
    icon:         Monitor,
    iconGradient: "from-teal-700 to-teal-500",
    badge:        PILL,
    badgeIcon:    "text-white",
    tagText:      "text-teal-700",
  },
  {
    id:           "tablets-empresariales",
    filterBy:     "usoCaso",
    filterValue:  "tablet-empresarial",
    titulo:       "Tablets Empresariales",
    tags:         ["Ventas", "Inventario", "Movilidad"],
    descripcion:  "Tablets confiables para trabajo remoto, puntos de venta y operaciones empresariales en movimiento.",
    icon:         Tablet,
    iconGradient: "from-indigo-700 to-indigo-500",
    badge:        PILL,
    badgeIcon:    "text-white",
    tagText:      "text-indigo-700",
  },
  {
    id:           "accesorios",
    filterBy:     "usoCaso",
    filterValue:  "accesorio",
    titulo:       "Accesorios",
    tags:         ["Mouse", "Teclados", "USB", "Discos"],
    descripcion:  "Periféricos y esenciales tecnológicos para mejorar productividad, conectividad, almacenamiento y comodidad diaria.",
    icon:         Package,
    iconGradient: "from-amber-700 to-amber-500",
    badge:        PILL,
    badgeIcon:    "text-white",
    tagText:      "text-amber-700",
  },
  {
    id:           "licencias-software",
    filterBy:     "usoCaso",
    filterValue:  "licencia",
    titulo:       "Licencias y Software",
    tags:         ["Windows", "Office", "Antivirus"],
    descripcion:  "Licencias originales Microsoft y soluciones de seguridad empresarial con activación rápida y soporte confiable.",
    icon:         Key,
    iconGradient: "from-emerald-700 to-emerald-500",
    badge:        PILL,
    badgeIcon:    "text-white",
    tagText:      "text-emerald-700",
  },
  {
    id:           "componentes",
    filterBy:     "segmento",
    filterValue:  "componentes",
    titulo:       "Componentes",
    tags:         ["CPU", "RAM", "GPU", "Almacenamiento"],
    descripcion:  "Procesadores, tarjetas gráficas, memorias RAM, fuentes de poder, motherboards y almacenamiento para armar o mejorar tu equipo.",
    icon:         Cpu,
    iconGradient: "from-purple-700 to-purple-500",
    badge:        PILL,
    badgeIcon:    "text-white",
    tagText:      "text-purple-700",
  },
];

// BusinessProductCard → src/components/business-product-card.tsx (variant="asesor")

// ─── Sección ──────────────────────────────────────────────────────────────────

function SeccionUso({
  sec,
  products,
}: {
  sec: SeccionDef;
  products: BusinessProduct[];
}) {
  const precios = products
    .map((p) => p.precioDesde ?? p.precio)
    .filter((v): v is number => v !== null);
  const minPrecio = precios.length ? Math.min(...precios) : null;

  return (
    <section className="mb-16">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${sec.iconGradient} shadow-lg`}>
            <sec.icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">{sec.titulo}</h2>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {sec.tags.map((tag) => (
                <span key={tag} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 ${sec.tagText}`}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        {minPrecio && (
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Desde</p>
            <p className="text-2xl font-bold text-zinc-900 tabular-nums">{formatCOP(minPrecio)}</p>
          </div>
        )}
      </div>

      <p className="text-sm text-zinc-600 mb-6 max-w-2xl leading-relaxed">{sec.descripcion}</p>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-sm text-zinc-400">
          Próximamente — estamos cargando el catálogo de {sec.titulo.toLowerCase()}.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <BusinessProductCard key={p.referencia ?? p.slug ?? p.id} product={p} variant="asesor" />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SolucionesPage() {
  const allProducts = loadPublishedBusinessProducts().filter((p) => p.enPromocion === true);

  // La misma regla que usa el panel para contar y para proponer: un producto
  // aparece en UNA sección. Ver `esDeLaSeccion`.
  const bySeccion = (filterBy: "usoCaso" | "segmento", filterValue: string) =>
    allProducts.filter((p) => esDeLaSeccion(p, filterBy, filterValue));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-zinc-500 mb-6">
        <Link href="/" className="hover:underline">Inicio</Link>
        <span className="mx-2">/</span>
        <span>Promociones</span>
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

        {/* Pills de navegación rápida */}
        <div className="mt-11 flex flex-wrap gap-2.5">
          {SECCIONES.map((s) => {
            const count = bySeccion(s.filterBy, s.filterValue).length;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${s.badge}`}
              >
                <s.icon className={`h-3.5 w-3.5 shrink-0 ${s.badgeIcon}`} />
                {s.titulo}
                {count > 0 && (
                  <span className="ml-0.5 tabular-nums text-white/50">({count})</span>
                )}
              </a>
            );
          })}
        </div>
      </div>

      <div className="border-t border-zinc-100 mb-12" />

      {/* Secciones */}
      {SECCIONES.map((sec) => (
        <div key={sec.id} id={sec.id}>
          <SeccionUso sec={sec} products={bySeccion(sec.filterBy, sec.filterValue)} />
        </div>
      ))}

      {/* CTA final */}
      <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#0f3d91] to-[#1e6cff] p-8 text-white text-center">
        <Building2 className="mx-auto mb-3 h-8 w-8 opacity-80" />
        <h2 className="text-xl font-bold mb-2">¿No encontraste lo que buscabas?</h2>
        <p className="text-blue-100 text-sm mb-5 max-w-md mx-auto leading-relaxed">
          Tenemos acceso a cientos de referencias más. Cuéntanos qué necesitas
          y nuestro Asesor IA te cotiza en minutos.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/asesor"
            className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition"
          >
            Habla con un Especialista en Tecnología →
          </Link>
          <Link
            href="/conseguir"
            className="rounded-full border border-white/40 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition"
          >
            Enviar solicitud
          </Link>
        </div>
      </div>
    </div>
  );
}
