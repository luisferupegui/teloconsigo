"use client";

import Link from "next/link";
import { useState } from "react";
import { Shield, Search, MessageCircle, Mail, CheckCircle2, AlertCircle, FileText } from "lucide-react";

const COBERTURAS = [
  { categoria: "Portátiles y PCs",        duracion: "12 meses",  tipo: "Defectos de fabricación" },
  { categoria: "Componentes (RAM, SSD…)", duracion: "12 meses",  tipo: "Defectos de fabricación" },
  { categoria: "Monitores",               duracion: "12 meses",  tipo: "Defectos de fabricación" },
  { categoria: "Periféricos",             duracion: "6 meses",   tipo: "Defectos de fabricación" },
  { categoria: "Accesorios",              duracion: "3 meses",   tipo: "Defectos de fabricación" },
];

const PASOS = [
  { num: "01", title: "Ingresa tu pedido",   desc: "Busca tu número de pedido abajo para ver las instrucciones específicas de tu compra." },
  { num: "02", title: "Contáctanos",         desc: "Escríbenos por WhatsApp o email con el número de pedido y una descripción del fallo." },
  { num: "03", title: "Evaluación",          desc: "Nuestro equipo técnico evalúa el caso en un plazo de 3 días hábiles." },
  { num: "04", title: "Resolución",          desc: "Reparación, reemplazo o reembolso según aplique la política del fabricante." },
];

export default function GarantiaPage() {
  const [pedido, setPedido] = useState("");
  const [buscado, setBuscado] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (pedido.trim()) setBuscado(true);
  }

  return (
    <div className="bg-zinc-50 min-h-screen">

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0d1e3a] via-[#13294b] to-[#1e6cff] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(125,200,255,0.18),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <nav className="text-xs text-zinc-300 mb-3">
            <Link href="/" className="hover:underline">Inicio</Link>
            <span className="mx-2">/</span>
            <span>Garantía</span>
          </nav>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Garantía</h1>
          <p className="mt-3 max-w-xl text-zinc-200">
            Todos nuestros productos tienen garantía oficial del fabricante. Ingresa tu número de pedido para ver las instrucciones de tu caso.
          </p>
        </div>
      </section>

      {/* Buscador */}
      <section className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <Shield className="h-6 w-6 text-[#1e6cff]" />
            <h2 className="font-display text-xl font-bold text-zinc-900">Consulta tu garantía</h2>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={pedido}
              onChange={e => { setPedido(e.target.value); setBuscado(false); }}
              placeholder="Número de pedido · Ej: TLC-20240001"
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:border-[#1e6cff] focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/20"
            />
            <button type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1e6cff] px-5 py-3 text-sm font-bold text-white hover:bg-[#1858d6] transition">
              <Search className="h-4 w-4" /> Consultar
            </button>
          </form>

          {buscado && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-900 text-sm">Pedido <span className="text-[#1e6cff]">{pedido}</span> — Garantía activa</p>
                  <p className="mt-1 text-xs text-emerald-800">
                    Para iniciar el proceso de garantía, contáctanos con este número de pedido a través de uno de los canales de atención indicados abajo. Nuestro equipo te guiará paso a paso.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <a href="https://wa.me/14079169299"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition">
                  <MessageCircle className="h-4 w-4" />
                  Abrir WhatsApp con número de pedido
                </a>
                <a href={`mailto:soporte@teloconsigo.co?subject=Garantía pedido ${pedido}`}
                  className="flex items-center gap-2 rounded-lg bg-[#1e6cff] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1858d6] transition">
                  <Mail className="h-4 w-4" />
                  Enviar correo a soporte
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Proceso */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-display text-xl font-bold text-zinc-900 mb-6">Proceso de garantía</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PASOS.map(({ num, title, desc }) => (
            <div key={num} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="font-display text-3xl font-black text-[#1e6cff]/20">{num}</p>
              <p className="mt-2 font-semibold text-zinc-900 text-sm">{title}</p>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Coberturas */}
        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#1e6cff]" />
            <h3 className="font-display text-base font-bold text-zinc-900">Cobertura por categoría</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Categoría</th>
                <th className="px-5 py-3 text-left font-semibold">Duración</th>
                <th className="px-5 py-3 text-left font-semibold">Cubre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {COBERTURAS.map(c => (
                <tr key={c.categoria} className="hover:bg-zinc-50">
                  <td className="px-5 py-3 font-medium text-zinc-800">{c.categoria}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{c.duracion}</span>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{c.tipo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* No cubre */}
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-semibold mb-1">La garantía no cubre:</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Daños causados por mal uso, golpes o líquidos</li>
              <li>Daños por instalación incorrecta o modificaciones</li>
              <li>Desgaste natural del producto</li>
              <li>Productos con sellos de garantía rotos o alterados</li>
            </ul>
          </div>
        </div>

        {/* Canales */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a href="https://wa.me/14079169299" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-2xl bg-emerald-500 p-5 text-white hover:bg-emerald-600 transition">
            <MessageCircle className="h-10 w-10 shrink-0" strokeWidth={1.5} />
            <div>
              <p className="font-display font-bold">WhatsApp</p>
              <p className="text-xs text-emerald-50">Respuesta inmediata · +1 407 916 9299</p>
            </div>
          </a>
          <a href="mailto:soporte@teloconsigo.co"
            className="flex items-center gap-4 rounded-2xl bg-[#1e6cff] p-5 text-white hover:bg-[#1858d6] transition">
            <Mail className="h-10 w-10 shrink-0" strokeWidth={1.5} />
            <div>
              <p className="font-display font-bold">Correo soporte</p>
              <p className="text-xs text-blue-100">soporte@teloconsigo.co</p>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}
