"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Package, Megaphone, ShoppingCart, Users, ChevronDown, type LucideIcon } from "lucide-react";

// Menú del panel. Cuatro secciones: Productos · Marketing · Ventas · Usuarios.
// "Ventas" agrupa Pedidos, Historial y Precios en un desplegable que se abre al pasar el
// mouse y también al hacer clic (en pantallas táctiles no hay hover).

type Sub = { href: string; label: string; desc: string; icono: string };
type Entrada = {
  href: string; label: string; desc: string; Icon: LucideIcon;
  sub?: Sub[]; activo: (p: string) => boolean;
};

const VENTAS: Sub[] = [
  { href: "/admin/pedidos",   label: "Pedidos",   desc: "Pedidos activos y su estado", icono: "🛍️" },
  { href: "/admin/historial", label: "Historial", desc: "Pedidos archivados",          icono: "📜" },
  { href: "/admin/precios",   label: "Precios",   desc: "Márgenes e importación",      icono: "💰" },
];

const MENU: Entrada[] = [
  { href: "/admin", label: "Productos", desc: "Catálogo de la tienda", Icon: Package,
    activo: (p) => p === "/admin" },
  { href: "/admin/marketing", label: "Marketing", desc: "Publicación y promociones", Icon: Megaphone,
    activo: (p) => p.startsWith("/admin/marketing") || p.startsWith("/admin/productos") || p.startsWith("/admin/nuevo") },
  { href: "/admin/pedidos", label: "Ventas", desc: "Pedidos, historial y precios", Icon: ShoppingCart, sub: VENTAS,
    activo: (p) => VENTAS.some((s) => p.startsWith(s.href)) },
  { href: "/admin/usuarios", label: "Usuarios", desc: "Acceso al panel", Icon: Users,
    activo: (p) => p.startsWith("/admin/usuarios") },
];

export function AdminNav() {
  const pathname = usePathname() ?? "";
  const [abierto, setAbierto] = useState<string | null>(null);

  return (
    <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex items-stretch gap-1">
        {MENU.map((m) => {
          const activo = m.activo(pathname);
          const desplegado = abierto === m.label;

          // La sección activa se marca con fondo suave + barra inferior: en una barra
          // ancha el subrayado solo se pierde de vista.
          const caja = `group relative flex min-w-[150px] items-center gap-3 rounded-t-xl px-4 py-3.5 transition ${
            activo ? "bg-[#1e6cff]/[0.07]" : "hover:bg-zinc-50"
          }`;
          const marco = `flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
            activo
              ? "border-[#1e6cff]/25 bg-[#1e6cff]/10 text-[#1e6cff]"
              : "border-zinc-200 bg-white text-zinc-400 group-hover:border-[#1e6cff]/30 group-hover:text-[#1e6cff]"
          }`;

          const contenido = (
            <>
              <span className={marco}><m.Icon className="h-[18px] w-[18px]" /></span>
              <span className="min-w-0 text-left">
                <span className={`flex items-center gap-1 text-[13px] font-bold leading-tight ${
                  activo ? "text-[#1e6cff]" : "text-zinc-700 group-hover:text-zinc-900"
                }`}>
                  {m.label}
                  {m.sub && <ChevronDown className={`h-3.5 w-3.5 transition ${desplegado ? "rotate-180" : ""}`} />}
                </span>
                <span className="block truncate text-[11px] leading-tight text-zinc-400">{m.desc}</span>
              </span>
              <span className={`absolute inset-x-3 bottom-0 h-[3px] rounded-t-full transition ${
                activo ? "bg-[#1e6cff]" : "bg-transparent"
              }`} />
            </>
          );

          if (!m.sub) {
            return <Link key={m.href} href={m.href} className={caja}>{contenido}</Link>;
          }

          return (
            <div
              key={m.href}
              className="relative"
              onMouseEnter={() => setAbierto(m.label)}
              onMouseLeave={() => setAbierto(null)}
            >
              <button
                type="button"
                onClick={() => setAbierto((a) => (a === m.label ? null : m.label))}
                className={`${caja} w-full`}
                aria-expanded={desplegado}
                aria-haspopup="menu"
              >
                {contenido}
              </button>

              {desplegado && (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-30 min-w-[260px] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1.5 shadow-xl shadow-zinc-900/10"
                >
                  {m.sub.map((s) => {
                    const sActivo = pathname.startsWith(s.href);
                    return (
                      <Link
                        key={s.href}
                        href={s.href}
                        role="menuitem"
                        onClick={() => setAbierto(null)}
                        className={`flex items-start gap-3 px-4 py-2.5 transition ${
                          sActivo ? "bg-[#1e6cff]/[0.07]" : "hover:bg-zinc-50"
                        }`}
                      >
                        <span className="mt-0.5 text-base leading-none">{s.icono}</span>
                        <span>
                          <span className={`block text-[13px] font-bold leading-tight ${
                            sActivo ? "text-[#1e6cff]" : "text-zinc-700"
                          }`}>
                            {s.label}
                          </span>
                          <span className="block text-[11px] leading-tight text-zinc-400">{s.desc}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
