"use client";

import Link from "next/link";
import { useState } from "react";
import { CONTACTO, whatsappUrl } from "@/lib/contacto";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  CheckCircle2,
} from "lucide-react";

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

const EMAIL       = CONTACTO.email;
const TEL_DISPLAY = CONTACTO.telefonoVisible;
const TEL_E164    = CONTACTO.telefono;

export default function ContactoPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="bg-zinc-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0d1e3a] via-[#13294b] to-[#1e6cff] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(125,200,255,0.18),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <nav className="text-xs text-zinc-300 mb-3">
            <Link href="/" className="hover:underline">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <span>Contacto</span>
          </nav>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Hablemos
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-200">
            Estamos aquí para ayudarte. Escríbenos, llámanos o pasa por
            nuestras oficinas — nuestro equipo te responde con la atención
            personalizada que mereces.
          </p>
        </div>
      </section>

      {/* Contact info cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-14 relative z-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Mail,
              titulo: "Correo electrónico",
              valor: EMAIL,
              href: `mailto:${EMAIL}`,
              cta: "Enviar correo",
              gradient: "from-[#1e6cff] to-[#7e4dff]",
              shadow: "shadow-[#1e6cff]/30",
            },
            {
              icon: Phone,
              titulo: "Teléfono",
              valor: TEL_DISPLAY,
              href: `tel:${TEL_E164}`,
              cta: "Llamar ahora",
              gradient: "from-[#4d8dff] to-[#1e6cff]",
              shadow: "shadow-[#4d8dff]/30",
            },
            {
              icon: MessageCircle,
              titulo: "WhatsApp",
              valor: "Respuesta rápida",
              href: whatsappUrl(),
              cta: "Abrir WhatsApp",
              gradient: "from-emerald-400 to-emerald-600",
              shadow: "shadow-emerald-500/30",
            },
            {
              icon: Clock,
              titulo: "Horario",
              valor: "Lun–Vie 8am–6pm",
              href: "#",
              cta: "Atención inmediata",
              gradient: "from-orange-400 to-rose-500",
              shadow: "shadow-orange-500/30",
            },
          ].map((c) => (
            <a
              key={c.titulo}
              href={c.href}
              className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-transparent"
            >
              {/* Background gradient glow on hover */}
              <div
                className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${c.gradient} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30`}
              />

              {/* Icon with gradient + glow */}
              <div
                className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${c.gradient} text-white shadow-lg ${c.shadow} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}
              >
                <c.icon className="h-7 w-7" strokeWidth={2} />
                {/* Shine effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 to-transparent" />
              </div>

              <p className="mt-5 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                {c.titulo}
              </p>
              <p className="mt-1 font-display text-base font-bold text-zinc-900 break-all leading-tight">
                {c.valor}
              </p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#1e6cff] group-hover:gap-2 transition-all">
                {c.cta} <span>→</span>
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Form + info */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Formulario */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold text-zinc-900">
              Envíanos un mensaje
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Te respondemos en menos de 24 horas hábiles.
            </p>

            {sent ? (
              <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                <h3 className="mt-3 font-display text-xl font-bold text-emerald-900">
                  ¡Mensaje enviado!
                </h3>
                <p className="mt-2 text-sm text-emerald-800">
                  Hemos recibido tu mensaje. Te contactaremos a la brevedad.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-4 text-xs font-semibold text-emerald-700 underline"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="mt-6 space-y-5"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-zinc-900">
                      Nombre completo *
                    </span>
                    <input
                      required
                      type="text"
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#1e6cff] focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/20"
                      placeholder="Tu nombre"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-zinc-900">
                      Correo electrónico *
                    </span>
                    <input
                      required
                      type="email"
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#1e6cff] focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/20"
                      placeholder="tu@correo.com"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-zinc-900">
                      Teléfono / WhatsApp
                    </span>
                    <input
                      type="tel"
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#1e6cff] focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/20"
                      placeholder="+57 300 000 0000"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-zinc-900">
                      Asunto
                    </span>
                    <select className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#1e6cff] focus:outline-none">
                      <option>Consulta sobre un producto</option>
                      <option>Asesoría para armar PC</option>
                      <option>Solicitud &quot;Te lo conseguimos&quot;</option>
                      <option>Soporte post-venta</option>
                      <option>Empresas / Cotización corporativa</option>
                      <option>Otro</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold text-zinc-900">
                    Mensaje *
                  </span>
                  <textarea
                    required
                    rows={5}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#1e6cff] focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/20"
                    placeholder="Cuéntanos en qué te podemos ayudar…"
                  />
                </label>

                <label className="flex items-start gap-2 text-xs text-zinc-600">
                  <input type="checkbox" required className="mt-0.5" />
                  <span>
                    Acepto los{" "}
                    <Link
                      href="/terminos"
                      className="text-[#1e6cff] hover:underline"
                    >
                      términos
                    </Link>{" "}
                    y la{" "}
                    <Link
                      href="/privacidad"
                      className="text-[#1e6cff] hover:underline"
                    >
                      política de privacidad
                    </Link>
                    .
                  </span>
                </label>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1e6cff] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#1e6cff]/20 hover:bg-[#1858d6]"
                >
                  <Send className="h-4 w-4" /> Enviar mensaje
                </button>
              </form>
            )}
          </div>

          {/* Sidebar info */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="font-display text-lg font-bold text-zinc-900">
                Información de contacto
              </h3>
              <ul className="mt-4 space-y-4 text-sm">
                <li className="flex gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-[#1e6cff]" />
                  <div>
                    <p className="font-semibold text-zinc-900">Email</p>
                    <a
                      href={`mailto:${EMAIL}`}
                      className="text-zinc-600 hover:text-[#1e6cff]"
                    >
                      {EMAIL}
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Phone className="mt-0.5 h-5 w-5 text-[#1e6cff]" />
                  <div>
                    <p className="font-semibold text-zinc-900">Teléfono</p>
                    <a
                      href={`tel:${TEL_E164}`}
                      className="text-zinc-600 hover:text-[#1e6cff]"
                    >
                      {TEL_DISPLAY}
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-[#1e6cff]" />
                  <div>
                    <p className="font-semibold text-zinc-900">Sede</p>
                    <p className="text-zinc-600">Medellín · Colombia</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-[#1e6cff]" />
                  <div>
                    <p className="font-semibold text-zinc-900">Horario</p>
                    <p className="text-zinc-600">Lunes a Viernes</p>
                    <p className="text-zinc-600">8:00 am – 6:00 pm</p>
                  </div>
                </li>
              </ul>
            </div>

            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-2xl bg-emerald-500 p-5 text-white hover:bg-emerald-600 transition"
            >
              <div>
                <p className="font-display text-base font-bold">
                  ¿Prefieres WhatsApp?
                </p>
                <p className="text-xs text-emerald-50">Respuesta inmediata</p>
              </div>
              <MessageCircle className="h-10 w-10" strokeWidth={1.5} />
            </a>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h3 className="font-display text-lg font-bold text-zinc-900">
                Síguenos
              </h3>
              <div className="mt-4 flex gap-2">
                {[
                  { Icon: InstagramIcon, label: "Instagram", base: "bg-pink-50 text-pink-600",   hover: "hover:bg-gradient-to-br hover:from-pink-500 hover:via-orange-500 hover:to-yellow-400 hover:text-white" },
                  { Icon: FacebookIcon,  label: "Facebook",  base: "bg-blue-50 text-[#1877F2]",  hover: "hover:bg-[#1877F2] hover:text-white" },
                  { Icon: TiktokIcon,    label: "TikTok",    base: "bg-zinc-100 text-zinc-800",  hover: "hover:bg-zinc-900 hover:text-white" },
                  { Icon: YoutubeIcon,   label: "YouTube",   base: "bg-red-50 text-red-600",     hover: "hover:bg-red-600 hover:text-white" },
                  { Icon: LinkedinIcon,  label: "LinkedIn",  base: "bg-sky-50 text-[#0A66C2]",   hover: "hover:bg-[#0A66C2] hover:text-white" },
                ].map(({ Icon, label, base, hover }) => (
                  <a
                    key={label}
                    href="#"
                    aria-label={label}
                    className={`flex h-11 w-11 items-center justify-center rounded-lg transition ${base} ${hover}`}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* FAQ rápido */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold text-zinc-900">
            Preguntas frecuentes
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                q: "¿Hacen envíos a todo el País?",
                a: "Sí, despachamos a cualquier ciudad del país con las mejores transportadoras.",
              },
              {
                q: "¿Cuánto tarda mi pedido?",
                a: "Entre 2 y 5 días hábiles dependiendo de la ciudad.",
              },
              {
                q: "¿Los productos tienen garantía?",
                a: "Todos nuestros productos cuentan con garantía oficial del fabricante.",
              },
              {
                q: "¿Aceptan pagos en cuotas?",
                a: "Sí, aceptamos tarjetas de crédito con cuotas a través de ePayco y PSE.",
              },
            ].map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-zinc-200 bg-zinc-50 p-5 open:bg-blue-50 open:border-[#1e6cff]"
              >
                <summary className="cursor-pointer font-semibold text-zinc-900 marker:content-none flex items-center justify-between">
                  {f.q}
                  <ChevronDownIcon />
                </summary>
                <p className="mt-2 text-sm text-zinc-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      className="h-4 w-4 text-zinc-400 transition group-open:rotate-180"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}
