"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ShieldCheck, Truck, CreditCard, Award, ArrowUp, Mail, MapPin } from "lucide-react";

function FacebookIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.408.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
    </svg>
  );
}
function InstagramIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}
function LinkedinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
function YoutubeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
function TiktokIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43V8.13a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.84-.56z" />
    </svg>
  );
}
function WhatsappIcon({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.595 5.392zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.713.307 1.27.489 1.703.625.717.227 1.369.195 1.883.118.575-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z" />
    </svg>
  );
}

const PAYMENT_METHODS = ["Visa", "Mastercard", "PSE", "Bancolombia"];

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "Productos originales", color: "text-[#4d8dff]" },
  { icon: Award,       label: "Garantía oficial",     color: "text-emerald-400" },
  { icon: Truck,       label: "Envíos a todo el país", color: "text-amber-400"   },
  { icon: CreditCard,  label: "Pago seguro",          color: "text-violet-400"  },
];

const SOCIAL = [
  { Icon: InstagramIcon, label: "Instagram", href: "#", bg: "hover:bg-gradient-to-br hover:from-pink-500 hover:via-orange-500 hover:to-yellow-400" },
  { Icon: FacebookIcon,  label: "Facebook",  href: "#", bg: "hover:bg-[#1877F2]" },
  { Icon: TiktokIcon,    label: "TikTok",    href: "#", bg: "hover:bg-zinc-900"   },
  { Icon: YoutubeIcon,   label: "YouTube",   href: "#", bg: "hover:bg-red-600"    },
  { Icon: LinkedinIcon,  label: "LinkedIn",  href: "#", bg: "hover:bg-[#0A66C2]"  },
];

export function Footer() {
  return (
    <footer className="relative bg-[#050a18] text-zinc-300 mt-auto overflow-hidden">
      <div className="absolute inset-0 bg-tech-grid-dark opacity-30 pointer-events-none" />
      <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-[#1e6cff] opacity-10 blur-[120px] pointer-events-none" />

      {/* ── Main grid ── */}
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-6">

          {/* Logo + tagline */}
          <div className="lg:col-span-2">
            <Link href="/" className="relative inline-block cursor-default" aria-label="Te lo Consigo · Inicio">
              {/* El resplandor es ambiente, no reacciona al mouse: el logo es la marca. */}
              <div className="absolute inset-0 -m-6 rounded-3xl bg-[#1e6cff] opacity-20 blur-3xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-footer.png"
                srcSet="/logo-footer.png 1x, /logo-footer@2x.png 2x"
                alt="Te lo Consigo"
                width={339}
                height={78}
                className="relative h-[78px] w-[339px] mix-blend-lighten"
                loading="lazy"
                decoding="async"
              />
            </Link>
            <p className="mt-5 max-w-xs text-sm text-zinc-400 leading-loose">
              Tecnología con atención personalizada. Hardware, periféricos y equipos para profesionales y empresas. Si no lo encuentras, te lo conseguimos.
            </p>
          </div>

          {/* TIENDA */}
          <div>
            <h3 className="font-display text-[13px] font-bold uppercase tracking-widest text-[#4d8dff]">Tienda</h3>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                ["Catálogo completo", "/catalogo"],
                ["Promociones",        "/soluciones"],
                ["Armador de PC",     "/armador"],
                ["Cotiza Ya Mismo",   "/asesor"],
              ].map(([label, href]) => (
                <li key={label}><Link href={href} className="hover:text-[#4d8dff] transition">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* EMPRESA */}
          <div>
            <h3 className="font-display text-[13px] font-bold uppercase tracking-widest text-[#4d8dff]">Empresa</h3>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                ["Sobre nosotros",  "/nosotros"],
                ["Contacto",        "/contacto"],
                ["Blog tech",       "/#cuidado-tips"],
              ].map(([label, href]) => (
                <li key={label}><Link href={href} className="hover:text-[#4d8dff] transition">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* AYUDA */}
          <div>
            <h3 className="font-display text-[13px] font-bold uppercase tracking-widest text-[#4d8dff]">Ayuda</h3>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                ["Devoluciones",          "/devoluciones"],
                ["Envíos",               "/envios"],
                ["Garantía",             "/garantia"],
                ["Preguntas frecuentes", "/faq"],
              ].map(([label, href]) => (
                <li key={label}><Link href={href} className="hover:text-[#4d8dff] transition">{label}</Link></li>
              ))}
            </ul>
          </div>

          {/* CONTACTO */}
          <div>
            <h3 className="font-display text-[13px] font-bold uppercase tracking-widest text-[#4d8dff]">Contacto</h3>
            <ul className="mt-5 space-y-3.5">
              <li>
                <a href="https://wa.me/573102878194" className="flex items-center gap-3 group">
                  <WhatsappIcon
                    className="h-[18px] w-[18px] shrink-0 text-emerald-400 transition group-hover:text-emerald-300"
                    style={{ filter: "drop-shadow(0 0 5px rgba(52,211,153,0.75))" }}
                  />
                  <span className="text-xs text-zinc-300 group-hover:text-white transition whitespace-nowrap">+57 310 2878194</span>
                </a>
              </li>
              <li>
                <a href="mailto:contacto@teloconsigo.co" className="flex items-center gap-3 group">
                  <Mail
                    className="h-[18px] w-[18px] shrink-0 text-[#4d8dff] transition group-hover:text-blue-300"
                    style={{ filter: "drop-shadow(0 0 5px rgba(77,141,255,0.75))" }}
                  />
                  <span className="text-xs text-zinc-300 group-hover:text-white transition whitespace-nowrap">contacto@teloconsigo.co</span>
                </a>
              </li>
              <li>
                <a href="mailto:ventas@teloconsigo.co" className="flex items-center gap-3 group">
                  <Mail
                    className="h-[18px] w-[18px] shrink-0 text-[#4d8dff] transition group-hover:text-blue-300"
                    style={{ filter: "drop-shadow(0 0 5px rgba(77,141,255,0.75))" }}
                  />
                  <span className="text-xs text-zinc-300 group-hover:text-white transition whitespace-nowrap">ventas@teloconsigo.co</span>
                </a>
              </li>
              <li className="flex items-center gap-3">
                <MapPin
                  className="h-[18px] w-[18px] shrink-0 text-violet-400"
                  style={{ filter: "drop-shadow(0 0 5px rgba(167,139,250,0.75))" }}
                />
                <span className="text-xs text-zinc-400 whitespace-nowrap">Medellín, Colombia</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Trust badges strip ── */}
        <div className="mt-8 border-t border-white/10 pt-4">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 sm:divide-x divide-white/10">
            {TRUST_ITEMS.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center justify-center gap-2.5 px-4 py-2">
                <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                <span className="text-xs font-semibold text-zinc-300">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Social + Pagos ── */}
        <div className="mt-6 flex flex-col gap-5 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Síguenos</p>
            <div className="flex gap-2.5">
              {SOCIAL.map(({ Icon, label, href, bg }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:border-transparent transition ${bg}`}
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Métodos de pago</p>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {PAYMENT_METHODS.map((m) => (
                <span
                  key={m}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold tracking-wide text-zinc-300"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Copyright ── */}
      <div className="relative border-t border-white/10 bg-[#020611]">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-5 text-xs text-zinc-500 sm:px-6 lg:px-8">
          <button
            onClick={() => typeof window !== "undefined" && window.scrollTo({ top: 0, behavior: "smooth" })}
            className="absolute -top-5 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-[#1e6cff] text-white shadow-lg shadow-[#1e6cff]/40 hover:bg-[#1858d6] hover:-translate-y-0.5 transition"
            aria-label="Volver arriba"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
          <p>© {new Date().getFullYear()} <span className="font-semibold text-zinc-300">Teloconsigo.co</span> – Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
