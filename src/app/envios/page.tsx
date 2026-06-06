"use client";

import Link from "next/link";
import { useState } from "react";
import { Truck, Search, ExternalLink, Clock, MapPin, Package } from "lucide-react";

const CARRIERS = [
  { name: "Servientrega",     color: "bg-red-600",    text: "text-white", url: "https://www.servientrega.com.co/wps/portal/rastreoenvios" },
  { name: "Coordinadora",     color: "bg-blue-600",   text: "text-white", url: "https://www.coordinadora.com/portafolio-de-servicios/servicios-en-linea/rastrear-guias/" },
  { name: "Interrapidísimo",  color: "bg-orange-500", text: "text-white", url: "https://www.interrapidisimo.com/rastrea-tu-envio/" },
  { name: "TCC",              color: "bg-yellow-400", text: "text-zinc-900", url: "https://www.tcc.com.co/rastreo/" },
];

const INFO = [
  { icon: Clock,   title: "Tiempo de entrega",  desc: "1 a 5 días hábiles según la ciudad de destino." },
  { icon: MapPin,  title: "Cobertura",           desc: "Despachamos a cualquier municipio de Colombia." },
  { icon: Package, title: "Empaque seguro",      desc: "Todos los pedidos se embalan con protección adicional." },
];

export default function EnviosPage() {
  const [guia, setGuia] = useState("");
  const [searching, setSearching] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (guia.trim()) setSearching(true);
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
            <span>Envíos</span>
          </nav>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Rastrea tu pedido</h1>
          <p className="mt-3 max-w-xl text-zinc-200">
            Ingresa tu número de guía para consultar el estado de tu envío directamente con la transportadora.
          </p>
        </div>
      </section>

      {/* Buscador */}
      <section className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <Truck className="h-6 w-6 text-[#1e6cff]" />
            <h2 className="font-display text-xl font-bold text-zinc-900">Número de guía</h2>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={guia}
              onChange={e => { setGuia(e.target.value); setSearching(false); }}
              placeholder="Ej: 1234567890"
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-sm focus:border-[#1e6cff] focus:outline-none focus:ring-2 focus:ring-[#1e6cff]/20"
            />
            <button type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1e6cff] px-5 py-3 text-sm font-bold text-white hover:bg-[#1858d6] transition">
              <Search className="h-4 w-4" /> Buscar
            </button>
          </form>

          {searching && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-zinc-700 mb-3">
                Consulta el estado de la guía <span className="text-[#1e6cff]">{guia}</span> en la transportadora:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {CARRIERS.map(c => (
                  <a
                    key={c.name}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold ${c.color} ${c.text} hover:opacity-90 transition`}
                  >
                    {c.name}
                    <ExternalLink className="h-4 w-4 opacity-70" />
                  </a>
                ))}
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                Copia tu número de guía y pégalo en el sitio de la transportadora para ver el estado actualizado.
              </p>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-center text-zinc-500">
          ¿No tienes tu número de guía? Revisa el correo de confirmación de tu pedido o escríbenos a{" "}
          <a href="mailto:soporte@teloconsigo.co" className="text-[#1e6cff] hover:underline font-medium">soporte@teloconsigo.co</a>.
        </p>
      </section>

      {/* Info envíos */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="font-display text-xl font-bold text-zinc-900 mb-6">Información de envíos</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {INFO.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1e6cff]/10">
                <Icon className="h-5 w-5 text-[#1e6cff]" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 text-sm">{title}</p>
                <p className="mt-1 text-xs text-zinc-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabla tiempos */}
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="font-display text-base font-bold text-zinc-900">Tiempos estimados por ciudad</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Ciudad</th>
                <th className="px-5 py-3 text-left font-semibold">Tiempo estimado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {[
                ["Medellín",      "1 día hábil"],
                ["Bogotá",        "1–2 días hábiles"],
                ["Cali",          "2–3 días hábiles"],
                ["Barranquilla",  "2–3 días hábiles"],
                ["Bucaramanga",   "2–3 días hábiles"],
                ["Otras ciudades","3–5 días hábiles"],
              ].map(([city, time]) => (
                <tr key={city} className="hover:bg-zinc-50">
                  <td className="px-5 py-3 font-medium text-zinc-800">{city}</td>
                  <td className="px-5 py-3 text-zinc-600">{time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
