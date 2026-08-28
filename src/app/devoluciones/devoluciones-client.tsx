"use client";

import Link from "next/link";
import { useState } from "react";
import { PackageX, CheckCircle2, Send, RotateCcw, Clock, Shield } from "lucide-react";

const MOTIVOS = [
  "Producto defectuoso o dañado",
  "Producto incorrecto (no corresponde al pedido)",
  "Producto no llegó completo",
  "Daño durante el transporte",
  "Cambio de opinión",
  "Otro",
];

const PASOS = [
  { icon: PackageX,   title: "Llena el formulario",       desc: "Indica tu número de pedido y el motivo de la devolución." },
  { icon: RotateCcw,  title: "Recibe instrucciones",       desc: "Te contactamos en 24 h con los pasos para enviar el producto." },
  { icon: CheckCircle2, title: "Reembolso o cambio",       desc: "Procesamos tu caso en 5–10 días hábiles." },
];

export default function DevolucionesPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="bg-zinc-50 min-h-screen">

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0d1e3a] via-[#13294b] to-[#1e6cff] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(125,200,255,0.18),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <nav className="text-xs text-zinc-300 mb-3">
            <Link href="/" className="hover:underline">Inicio</Link>
            <span className="mx-2">/</span>
            <span>Devoluciones</span>
          </nav>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Devoluciones</h1>
          <p className="mt-3 max-w-xl text-zinc-200">
            ¿Algo no salió bien? Tramita tu devolución en minutos. Tienes hasta <strong>15 días hábiles</strong> desde la recepción del pedido.
          </p>
        </div>
      </section>

      {/* Pasos */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {PASOS.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1e6cff]/10">
                <Icon className="h-5 w-5 text-[#1e6cff]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Paso {i + 1}</p>
                <p className="font-semibold text-zinc-900 text-sm">{title}</p>
                <p className="mt-1 text-xs text-zinc-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Formulario */}
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">

          {sent ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
              <h2 className="mt-4 font-display text-2xl font-bold text-zinc-900">¡Solicitud enviada!</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Hemos recibido tu solicitud. Te contactaremos a <span className="font-semibold">soporte@teloconsigo.co</span> en las próximas 24 horas hábiles con los pasos a seguir.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-6 text-xs font-semibold text-[#1e6cff] underline"
              >
                Hacer otra solicitud
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <PackageX className="h-6 w-6 text-[#1e6cff]" />
                <h2 className="font-display text-xl font-bold text-zinc-900">Solicitud de devolución</h2>
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); setSent(true); }}
                className="space-y-5"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-zinc-800">Nombre completo *</span>
                    <input required type="text" placeholder="Tu nombre"
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#1e6cff] focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/20" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-zinc-800">Correo electrónico *</span>
                    <input required type="email" placeholder="tu@correo.com"
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#1e6cff] focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/20" />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-zinc-800">Número de pedido *</span>
                    <input required type="text" placeholder="Ej: TLC-20240001"
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#1e6cff] focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/20" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-zinc-800">Teléfono / WhatsApp</span>
                    <input type="tel" placeholder="+57 300 000 0000"
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#1e6cff] focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/20" />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold text-zinc-800">Motivo de la devolución *</span>
                  <select required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#1e6cff] focus:outline-none">
                    <option value="">Selecciona un motivo…</option>
                    {MOTIVOS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-zinc-800">Descripción del problema *</span>
                  <textarea required rows={4} placeholder="Descríbenos qué ocurrió con el producto…"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#1e6cff] focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/20" />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-zinc-800">Foto o evidencia <span className="text-zinc-400 font-normal">(opcional)</span></span>
                  <div className="mt-1 flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 px-4 py-6 text-center cursor-pointer hover:border-[#1e6cff] transition">
                    <div>
                      <p className="text-sm text-zinc-500">Arrastra o haz clic para adjuntar</p>
                      <p className="text-xs text-zinc-400 mt-1">PNG, JPG o PDF · Máx 5 MB</p>
                      <input type="file" accept="image/*,.pdf" className="hidden" />
                    </div>
                  </div>
                </label>

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex gap-2.5">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Las devoluciones aplican dentro de los <strong>15 días hábiles</strong> siguientes a la recepción del pedido y el producto debe estar en su empaque original.
                  </p>
                </div>

                <button type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1e6cff] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#1e6cff]/20 hover:bg-[#1858d6] transition">
                  <Send className="h-4 w-4" /> Enviar solicitud
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <Shield className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-600">
            ¿Tienes dudas antes de radicar tu solicitud? Escríbenos directamente a{" "}
            <a href="mailto:soporte@teloconsigo.co" className="text-[#1e6cff] font-semibold hover:underline">soporte@teloconsigo.co</a>{" "}
            o por WhatsApp al{" "}
            <a href="https://wa.me/573102878194" className="text-[#1e6cff] font-semibold hover:underline">+57 310 2878194</a>.
          </p>
        </div>
      </section>
    </div>
  );
}
