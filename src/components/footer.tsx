"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  ShieldCheck,
  Truck,
  CreditCard,
  Award,
  ArrowUp,
} from "lucide-react";

// SVG inline para iconos sociales (lucide v1.16 no los tenía)
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
function WhatsappIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.595 5.392zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.713.307 1.27.489 1.703.625.717.227 1.369.195 1.883.118.575-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z" />
    </svg>
  );
}

export function Footer() {
  const [sent, setSent] = useState(false);

  return (
    <footer className="relative bg-[#050a18] text-zinc-300 mt-auto overflow-hidden">
      {/* Tech grid background */}
      <div className="absolute inset-0 bg-tech-grid-dark opacity-30 pointer-events-none" />
      {/* Subtle ambient blue glow */}
      <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-[#1e6cff] opacity-10 blur-[120px] pointer-events-none" />

      {/* Newsletter top strip */}
      <div className="relative border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid items-center gap-6 lg:grid-cols-2">
            <div>
              <h3 className="font-display text-2xl font-bold text-white sm:text-3xl">
                Mantente al día con lo último en tecnología
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Recibe ofertas exclusivas, lanzamientos y guías de armado en tu
                correo. Sin spam, prometido.
              </p>
            </div>
            {sent ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-display font-bold text-emerald-200">
                    ¡Listo!
                  </p>
                  <p className="text-xs text-emerald-300/80">
                    Te suscribiste al newsletter.
                  </p>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <input
                  required
                  type="email"
                  placeholder="tu@correo.com"
                  className="flex-1 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#4d8dff] focus:outline-none focus:ring-2 focus:ring-[#4d8dff]/20"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1e6cff] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#1e6cff]/30 hover:bg-[#1858d6] transition"
                >
                  Suscribirme <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Logo + descripción */}
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="group relative inline-block"
              aria-label="Te lo Consigo · Inicio"
            >
              {/* Glow azul detrás del logo */}
              <div className="absolute inset-0 -m-6 rounded-3xl bg-[#1e6cff] opacity-20 blur-3xl group-hover:opacity-40 transition duration-500" />
              <Image
                src="/Logo%20Oscuro%20Con%20Slogan.png"
                alt="Te lo Consigo"
                width={1200}
                height={450}
                quality={100}
                className="relative h-32 w-auto mix-blend-lighten transition group-hover:scale-105"
                unoptimized
              />
            </Link>
            <p className="mt-5 max-w-md text-sm text-zinc-400 leading-relaxed">
              Tecnología con atención personalizada. Hardware, periféricos y
              equipos para profesionales y entusiastas. Si no lo encuentras, te
              lo conseguimos.
            </p>

            {/* Trust badges */}
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
                <ShieldCheck className="h-4 w-4 text-[#4d8dff] shrink-0" />
                <span className="text-zinc-300">Productos originales</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
                <Truck className="h-4 w-4 text-[#4d8dff] shrink-0" />
                <span className="text-zinc-300">Envíos a Colombia</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
                <Award className="h-4 w-4 text-[#4d8dff] shrink-0" />
                <span className="text-zinc-300">Garantía oficial</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
                <CreditCard className="h-4 w-4 text-[#4d8dff] shrink-0" />
                <span className="text-zinc-300">Pago seguro</span>
              </div>
            </div>
          </div>

          {/* Tienda */}
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              Tienda
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/catalogo" className="hover:text-[#4d8dff] transition">
                  Catálogo completo
                </Link>
              </li>
              <li>
                <Link href="/ofertas" className="hover:text-[#4d8dff] transition">
                  🔥 Ofertas
                </Link>
              </li>
              <li>
                <Link href="/armador" className="hover:text-[#4d8dff] transition">
                  Armador de PC
                </Link>
              </li>
              <li>
                <Link href="/asesor" className="hover:text-[#4d8dff] transition">
                  Asesor IA
                </Link>
              </li>
              <li>
                <Link href="/conseguir" className="hover:text-[#4d8dff] transition">
                  Te lo conseguimos
                </Link>
              </li>
              <li>
                <Link href="/comparar" className="hover:text-[#4d8dff] transition">
                  Comparar productos
                </Link>
              </li>
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              Empresa
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/nosotros" className="hover:text-[#4d8dff] transition">
                  Sobre nosotros
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="hover:text-[#4d8dff] transition">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href="/empresas" className="hover:text-[#4d8dff] transition">
                  Para empresas
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-[#4d8dff] transition">
                  Blog tech
                </Link>
              </li>
              <li>
                <Link href="/trabaja-con-nosotros" className="hover:text-[#4d8dff] transition">
                  Trabaja con nosotros
                </Link>
              </li>
            </ul>
          </div>

          {/* Ayuda + Contacto */}
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              Ayuda
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/envios" className="hover:text-[#4d8dff] transition">
                  Envíos
                </Link>
              </li>
              <li>
                <Link href="/garantia" className="hover:text-[#4d8dff] transition">
                  Garantía
                </Link>
              </li>
              <li>
                <Link href="/devoluciones" className="hover:text-[#4d8dff] transition">
                  Devoluciones
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-[#4d8dff] transition">
                  Preguntas frecuentes
                </Link>
              </li>
            </ul>

            <h3 className="mt-6 font-display text-sm font-bold uppercase tracking-wider text-white">
              Contacto
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="tel:+14079169299"
                  className="flex items-center gap-2 hover:text-[#4d8dff] transition"
                >
                  <Phone className="h-4 w-4" /> +1 407 916 9299
                </a>
              </li>
              <li>
                <a
                  href="mailto:contacto@teloconsigo.com"
                  className="flex items-center gap-2 hover:text-[#4d8dff] transition break-all"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  <span>contacto@teloconsigo.com</span>
                </a>
              </li>
              <li className="flex items-center gap-2 text-zinc-400">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>Medellín, Colombia</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Redes sociales + métodos de pago */}
        <div className="mt-12 grid gap-6 border-t border-white/10 pt-8 md:grid-cols-2">
          {/* Social */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Síguenos
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                {
                  Icon: WhatsappIcon,
                  label: "WhatsApp",
                  href: "https://wa.me/14079169299",
                  color: "hover:bg-emerald-500",
                },
                {
                  Icon: FacebookIcon,
                  label: "Facebook",
                  href: "#",
                  color: "hover:bg-[#1877F2]",
                },
                {
                  Icon: InstagramIcon,
                  label: "Instagram",
                  href: "#",
                  color: "hover:bg-gradient-to-br hover:from-pink-500 hover:via-orange-500 hover:to-yellow-400",
                },
                {
                  Icon: TiktokIcon,
                  label: "TikTok",
                  href: "#",
                  color: "hover:bg-zinc-900",
                },
                {
                  Icon: YoutubeIcon,
                  label: "YouTube",
                  href: "#",
                  color: "hover:bg-red-600",
                },
                {
                  Icon: LinkedinIcon,
                  label: "LinkedIn",
                  href: "#",
                  color: "hover:bg-[#0A66C2]",
                },
              ].map(({ Icon, label, href, color }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:border-transparent transition ${color}`}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Pagos */}
          <div className="md:text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Métodos de pago
            </p>
            <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
              {["Visa", "Mastercard", "PSE", "ePayco", "Nequi", "Bancolombia"].map(
                (m) => (
                  <span
                    key={m}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300"
                  >
                    {m}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="relative border-t border-white/10 bg-[#020611]">
        <div className="mx-auto flex flex-col items-center justify-between gap-3 max-w-7xl px-4 py-5 text-xs text-zinc-500 sm:px-6 md:flex-row lg:px-8">
          <button
            onClick={() =>
              typeof window !== "undefined" &&
              window.scrollTo({ top: 0, behavior: "smooth" })
            }
            className="absolute -top-5 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-[#1e6cff] text-white shadow-lg shadow-[#1e6cff]/40 hover:bg-[#1858d6] hover:-translate-y-0.5 transition"
            aria-label="Volver arriba"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
          <p>
            © {new Date().getFullYear()}{" "}
            <span className="font-semibold text-zinc-300">Te lo Consigo</span>{" "}
            · Todos los derechos reservados.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/terminos" className="hover:text-zinc-300 transition">
              Términos
            </Link>
            <Link href="/privacidad" className="hover:text-zinc-300 transition">
              Privacidad
            </Link>
            <Link href="/cookies" className="hover:text-zinc-300 transition">
              Cookies
            </Link>
            <span className="hidden md:inline">·</span>
            <span>
              Hecho con <span className="text-red-500">♥</span> en Colombia
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
