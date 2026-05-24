"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  CheckCircle2,
  Facebook,
} from "lucide-react";

function Instagram({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37a4 4 0 1 1-7.91 1.18 4 4 0 0 1 7.91-1.18Z" />
      <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
    </svg>
  );
}

function Linkedin({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

const EMAIL = "contacto@teloconsigo.com";
const TEL_DISPLAY = "+1 407 916 9299";
const TEL_E164 = "+14079169299";
const WHATSAPP = "+14079169299";

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
              href: `https://wa.me/${WHATSAPP.replace("+", "")}`,
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
                      <option>Solicitud "Te lo conseguimos"</option>
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
              href={`https://wa.me/${WHATSAPP.replace("+", "")}`}
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
                <a
                  href="#"
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#1e6cff] hover:bg-[#1e6cff] hover:text-white transition"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-pink-50 text-pink-600 hover:bg-gradient-to-br hover:from-pink-500 hover:to-orange-400 hover:text-white transition"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-700 hover:text-white transition"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
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
                q: "¿Hacen envíos a todo Colombia?",
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
