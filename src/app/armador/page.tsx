"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { type Product, formatCOP } from "@/lib/products-types";
import productsData from "../../../data/products.json";
const products = productsData as Product[];
import { SmartImage } from "@/components/smart-image";

const slots = [
  { key: "procesadores", label: "Procesador (CPU)", emoji: "🧠" },
  { key: "placas-madre", label: "Placa madre", emoji: "🔌" },
  { key: "memoria-ram", label: "Memoria RAM", emoji: "💾" },
  { key: "tarjetas-graficas", label: "Tarjeta gráfica (GPU)", emoji: "🎮" },
  { key: "almacenamiento", label: "Almacenamiento", emoji: "💿" },
  { key: "fuentes-de-poder", label: "Fuente (PSU)", emoji: "⚡" },
  { key: "gabinetes", label: "Gabinete", emoji: "📦" },
  { key: "refrigeracion", label: "Refrigeración", emoji: "❄️" },
];

export default function ArmadorPage() {
  const [build, setBuild] = useState<Record<string, Product | null>>({});

  const total = useMemo(
    () =>
      Object.values(build).reduce((acc, p) => acc + (p?.precio ?? 0), 0),
    [build],
  );

  const compatibility = useMemo(() => {
    const cpu = build["procesadores"];
    const mb = build["placas-madre"];
    const ram = build["memoria-ram"];
    const issues: string[] = [];
    const ok: string[] = [];

    if (cpu && mb) {
      if (cpu.specs.socket === mb.specs.socket) {
        ok.push(`CPU y placa madre comparten socket ${cpu.specs.socket}`);
      } else {
        issues.push(
          `CPU socket ${cpu.specs.socket} no coincide con placa ${mb.specs.socket}`,
        );
      }
    }
    if (mb && ram) {
      if (String(mb.specs.tipoRam) === String(ram.specs.tipo)) {
        ok.push(`RAM ${ram.specs.tipo} compatible con la placa`);
      } else {
        issues.push(
          `RAM ${ram.specs.tipo} no es compatible con placa ${mb.specs.tipoRam}`,
        );
      }
    }
    return { ok, issues };
  }, [build]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="text-xs text-zinc-500 mb-3">
        <Link href="/" className="hover:underline">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <span>Armador de PC</span>
      </nav>
      <h1 className="text-3xl font-bold text-zinc-900">
        🛠️ Armador de PC guiado
      </h1>
      <p className="mt-1 text-zinc-600">
        Selecciona cada parte. Verificamos compatibilidad en tiempo real.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {slots.map((slot) => {
            const opciones = products.filter((p) => p.categoria === slot.key);
            const sel = build[slot.key];
            return (
              <div
                key={slot.key}
                className="rounded-2xl border border-zinc-200 bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-bold">
                    <span className="text-2xl">{slot.emoji}</span>
                    {slot.label}
                  </h3>
                  {sel && (
                    <button
                      onClick={() =>
                        setBuild((b) => ({ ...b, [slot.key]: null }))
                      }
                      className="text-xs text-zinc-500 hover:text-red-600"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                {sel ? (
                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-blue-50 p-3">
                    <SmartImage
                      src={sel.imagen}
                      alt={sel.nombre}
                      className="h-12 w-12 rounded"
                      emojiSize="text-3xl"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{sel.nombre}</p>
                      <p className="text-xs text-zinc-500">{sel.marca}</p>
                    </div>
                    <p className="text-sm font-bold">
                      {formatCOP(sel.precio)}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {opciones.length === 0 ? (
                      <p className="text-xs text-zinc-500 col-span-2">
                        No hay opciones en catálogo.{" "}
                        <Link
                          href="/conseguir"
                          className="text-[#1858d6] underline"
                        >
                          Te lo conseguimos →
                        </Link>
                      </p>
                    ) : (
                      opciones.map((p) => (
                        <button
                          key={p.id}
                          onClick={() =>
                            setBuild((b) => ({ ...b, [slot.key]: p }))
                          }
                          className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2 text-left hover:border-[#1e6cff] hover:bg-blue-50"
                        >
                          <SmartImage
                            src={p.imagen}
                            alt={p.nombre}
                            className="h-10 w-10 rounded"
                            emojiSize="text-2xl"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {p.nombre}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {formatCOP(p.precio)}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold">Resumen del build</h3>
            <ul className="mt-3 divide-y divide-zinc-200 text-sm">
              {slots.map((s) => (
                <li
                  key={s.key}
                  className="flex justify-between py-2"
                >
                  <span className="text-zinc-600">{s.label}</span>
                  <span className="font-medium">
                    {build[s.key]
                      ? formatCOP(build[s.key]!.precio)
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-zinc-200 pt-3">
              <span className="font-bold">Total</span>
              <span className="text-xl font-bold text-[#1858d6]">
                {formatCOP(total)}
              </span>
            </div>
            <button
              disabled={total === 0}
              className="mt-4 w-full rounded-full bg-[#1e6cff] px-4 py-3 text-sm font-bold text-white disabled:bg-zinc-300 hover:bg-[#1858d6]"
            >
              Añadir todo al carrito
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h3 className="text-base font-bold">🛡️ Compatibility Guard</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Validación determinista (no usa IA).
            </p>
            <ul className="mt-3 space-y-2 text-xs">
              {compatibility.ok.map((msg, i) => (
                <li
                  key={i}
                  className="flex gap-2 rounded bg-emerald-50 p-2 text-emerald-800"
                >
                  ✓ {msg}
                </li>
              ))}
              {compatibility.issues.map((msg, i) => (
                <li
                  key={i}
                  className="flex gap-2 rounded bg-red-50 p-2 text-red-800"
                >
                  ⚠️ {msg}
                </li>
              ))}
              {compatibility.ok.length === 0 &&
                compatibility.issues.length === 0 && (
                  <li className="text-zinc-500">
                    Selecciona partes para verificar compatibilidad.
                  </li>
                )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
