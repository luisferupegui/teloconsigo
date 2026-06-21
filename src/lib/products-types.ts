// Tipos y utilidades client-safe (sin `fs`)
export type Product = {
  id: string;
  slug: string;
  nombre: string;
  marca: string;
  categoria: string;
  precio: number;
  precioAnterior?: number;
  stock: number;
  rating: number;
  reviews: number;
  imagen: string;
  destacado?: boolean;
  specs: Record<string, string | number>;
  descripcion: string;
};

// ─── Segmentos (categoría única del admin, alineada con /catalogo) ─────────────
export type Segmento =
  | "hogar-estudio"
  | "gaming-streaming"
  | "productividad-oficina"
  | "movilidad-premium"
  | "redes-servidores"
  | "creadores-produccion"
  | "smart-home"
  | "monitores"
  | "accesorios"
  | "componentes";

export const SEGMENTOS: { value: Segmento; label: string }[] = [
  { value: "hogar-estudio",         label: "Hogar y Estudio"          },
  { value: "gaming-streaming",      label: "Gaming y Streaming"       },
  { value: "productividad-oficina", label: "Productividad y Oficina"  },
  { value: "movilidad-premium",     label: "Movilidad Premium"        },
  { value: "redes-servidores",      label: "Redes y Servidores"       },
  { value: "creadores-produccion",  label: "Creadores y Producción"   },
  { value: "smart-home",            label: "Smart Home y Conectividad"},
  { value: "monitores",             label: "Monitores"                },
  { value: "accesorios",            label: "Accesorios"               },
  { value: "componentes",           label: "Componentes"              },
];

export const SEGMENTO_LABEL: Record<string, string> = Object.fromEntries(
  SEGMENTOS.map((s) => [s.value, s.label]),
);

// Color por segmento para los chips de la lista admin
export const SEGMENTO_COLOR: Record<Segmento, string> = {
  "hogar-estudio":         "bg-blue-100 text-blue-700",
  "gaming-streaming":      "bg-red-100 text-red-700",
  "productividad-oficina": "bg-cyan-100 text-cyan-700",
  "movilidad-premium":     "bg-violet-100 text-violet-700",
  "redes-servidores":      "bg-emerald-100 text-emerald-700",
  "creadores-produccion":  "bg-orange-100 text-orange-700",
  "smart-home":            "bg-amber-100 text-amber-700",
  "monitores":             "bg-teal-100 text-teal-700",
  "accesorios":            "bg-zinc-100 text-zinc-600",
  "componentes":           "bg-purple-100 text-purple-700",
};

// Capacidad de las secciones del home (cards): mínimo y máximo por sección.
export const HOME_MIN = 4;
export const HOME_MAX = 12;

export type BusinessProduct = {
  id: string;
  slug: string;
  nombre: string;
  marca: string;
  // `segmento` es la ÚNICA categoría que gestiona el admin (9 opciones).
  segmento?: Segmento;
  // `publicado`: controla si el producto se ve en la web pública.
  publicado?: boolean;
  // ── Legacy (lo sigue usando el storefront actual; no editar desde el admin) ──
  categoria: "portatil" | "pc" | "monitor" | "tablet" | "licencia" | "accesorio";
  usoCaso:
    | "portatil-ejecutivo"
    | "portatil-oficina"
    | "portatil-gaming"
    | "pc-empresarial"
    | "monitor"
    | "tablet-empresarial"
    | "licencia"
    | "accesorio";
  referencia?: string;
  precio: number | null;
  precioDesde: number | null;
  precioIvaIncluido?: boolean;
  proveedor: "ledacom" | "infoshop" | "manual";
  specs: Record<string, string>;
  descripcionUso: string;
  // Ubicación en el home (independientes): destacado = "Productos Destacados",
  // enAccesorios = "Accesorios & Esenciales", enPromocion = Promociones.
  destacado?: boolean;
  enAccesorios?: boolean;
  enPromocion?: boolean;
};

export const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
