"use client";

import Link from "next/link";
import { useState } from "react";

type FormState = {
  nombre:      string;
  telefono:    string;
  correo:      string;
  descripcion: string;
  presupuesto: string;
  ciudad:      string;
};

const INITIAL: FormState = {
  nombre:      "",
  telefono:    "",
  correo:      "",
  descripcion: "",
  presupuesto: "No estoy seguro",
  ciudad:      "",
};

export default function ConseguirPage() {
  const [form,    setForm]    = useState<FormState>(INITIAL);
  const [enviado, setEnviado] = useState(false);
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/conseguir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Error al enviar");
      setEnviado(true);
    } catch {
      setError("No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp.");
    } finally {
      setSending(false);
    }
  }

  if (enviado) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <span className="text-6xl">✅</span>
        <h1 className="mt-4 text-3xl font-bold text-zinc-900">
          ¡Solicitud recibida!
        </h1>
        <p className="mt-3 text-zinc-600">
          Nuestro equipo te contactará en menos de 24 horas hábiles con
          opciones y precio.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-[#1e6cff] px-6 py-3 text-sm font-semibold text-white"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="text-xs text-zinc-500 mb-3">
        <Link href="/" className="hover:underline">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <span>Te lo conseguimos</span>
      </nav>

      <div className="rounded-3xl bg-gradient-to-br from-[#1e6cff] to-[#0d1e3a] px-8 py-10 text-white">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
          ✨ Nuestro diferencial
        </span>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          ¿No lo encuentras? Te lo conseguimos.
        </h1>
        <p className="mt-3 text-white/90">
          Cuéntanos qué necesitas: un componente raro, una marca específica, un
          equipo industrial. Nuestro equipo lo busca por ti y te avisa con
          opciones y precio.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-zinc-900">
              Nombre *
            </span>
            <input
              required
              type="text"
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#1e6cff] focus:outline-none"
              placeholder="Tu nombre"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-900">
              WhatsApp / Teléfono *
            </span>
            <input
              required
              type="tel"
              value={form.telefono}
              onChange={(e) => set("telefono", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#1e6cff] focus:outline-none"
              placeholder="+57 300 000 0000"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-zinc-900">
            Correo electrónico
          </span>
          <input
            type="email"
            value={form.correo}
            onChange={(e) => set("correo", e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#1e6cff] focus:outline-none"
            placeholder="tu@correo.com"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-zinc-900">
            ¿Qué necesitas conseguir? *
          </span>
          <textarea
            required
            rows={5}
            value={form.descripcion}
            onChange={(e) => set("descripcion", e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#1e6cff] focus:outline-none"
            placeholder="Describe el producto: marca, modelo, características, cantidad, presupuesto aproximado…"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-zinc-900">
              Presupuesto aproximado
            </span>
            <select
              value={form.presupuesto}
              onChange={(e) => set("presupuesto", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option>Menos de $500.000</option>
              <option>$500.000 - $1.000.000</option>
              <option>$1.000.000 - $3.000.000</option>
              <option>$3.000.000 - $5.000.000</option>
              <option>Más de $5.000.000</option>
              <option>No estoy seguro</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-900">
              Ciudad
            </span>
            <input
              type="text"
              value={form.ciudad}
              onChange={(e) => set("ciudad", e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#1e6cff] focus:outline-none"
              placeholder="Medellín, Bogotá, Cali…"
            />
          </label>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">
            Te contactamos en menos de 24h hábiles.
          </p>
          <button
            type="submit"
            disabled={sending}
            className="rounded-full bg-[#1e6cff] px-8 py-3 text-sm font-bold text-white hover:bg-[#1858d6] disabled:opacity-60 transition"
          >
            {sending ? "Enviando…" : "Enviar solicitud"}
          </button>
        </div>
      </form>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            emoji: "🔍",
            titulo: "Buscamos por ti",
            texto: "Distribuidores nacionales e importadores autorizados.",
          },
          {
            emoji: "💬",
            titulo: "Te avisamos",
            texto: "Por WhatsApp con opciones, precio y tiempo de entrega.",
          },
          {
            emoji: "🛡️",
            titulo: "Compra segura",
            texto: "Pagas solo cuando confirmas. Garantía oficial.",
          },
        ].map((b) => (
          <div
            key={b.titulo}
            className="rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <p className="text-2xl">{b.emoji}</p>
            <p className="mt-2 font-bold text-zinc-900">{b.titulo}</p>
            <p className="mt-1 text-sm text-zinc-600">{b.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
