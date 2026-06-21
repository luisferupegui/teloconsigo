"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Home, Briefcase, Palette, Terminal, Gamepad2, Trophy, Radio, Clapperboard, BrainCircuit,
  Cpu, Component, MemoryStick, HardDrive, CircuitBoard, Monitor, Snowflake, Keyboard,
  ChevronRight, ChevronLeft, Check, Lightbulb, MessageCircle, Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  PERFILES, getPerfil, buildResumen, type ArmadorPerfil,
} from "@/lib/armador-perfiles";

const ICONS: Record<string, LucideIcon> = {
  Home, Briefcase, Palette, Terminal, Gamepad2, Trophy, Radio, Clapperboard, BrainCircuit,
  Cpu, Component, MemoryStick, HardDrive, CircuitBoard, Monitor, Snowflake, Keyboard,
};

function Icon({ name, className }: { name: string; className?: string }) {
  const C = ICONS[name] ?? Cpu;
  return <C className={className} />;
}

/** Selección inicial = nivel recomendado de cada slot (o el primero). */
function defaultSeleccion(perfil: ArmadorPerfil): Record<string, string> {
  const sel: Record<string, string> = {};
  for (const slot of perfil.slots) {
    if (slot.opciones.length === 0) continue;
    const rec = slot.opciones.find((o) => o.rec) ?? slot.opciones[0];
    sel[slot.key] = rec.label;
  }
  return sel;
}

export default function ArmadorPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [perfilId, setPerfilId] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Record<string, string>>({});

  const perfil = perfilId ? getPerfil(perfilId) : undefined;

  const resumen = useMemo(
    () => (perfil ? buildResumen(perfil, seleccion) : ""),
    [perfil, seleccion],
  );

  function elegirPerfil(id: string) {
    const p = getPerfil(id);
    if (!p) return;
    setPerfilId(id);
    setSeleccion(defaultSeleccion(p));
    setStep(2);
  }

  function cotizar() {
    if (!perfil) return;
    router.push(`/asesor?producto=${encodeURIComponent(resumen)}&ref=armador`);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-3 text-xs text-zinc-400">
        <Link href="/" className="hover:text-zinc-600">Inicio</Link>
        <span className="mx-1.5">/</span>
        <span className="text-zinc-500">Armador de PC</span>
      </nav>

      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1e6cff]/10">
          <Sparkles className="h-6 w-6 text-[#1e6cff]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight text-zinc-900">Armador de PC</h1>
          <p className="text-sm text-zinc-500">
            Arma tu equipo ideal en 3 pasos. Andrea te confirma el precio final y la entrega.
          </p>
        </div>
      </div>

      {/* Indicador de pasos */}
      <Steps step={step} />

      {/* ── Paso 1: perfil ─────────────────────────────────────────────── */}
      {step === 1 && (
        <section className="animate-fade-in-up" style={{ animationDuration: "0.25s" }}>
          <h2 className="mb-1 text-lg font-bold text-zinc-900">¿Qué deseas armar?</h2>
          <p className="mb-5 text-sm text-zinc-500">
            Elige el uso principal y te recomendamos la base ideal para ese perfil.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PERFILES.map((p) => (
              <button
                key={p.id}
                onClick={() => elegirPerfil(p.id)}
                className="group flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#1e6cff]/50 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 transition group-hover:bg-[#1e6cff]/10">
                  <Icon name={p.icon} className="h-6 w-6 text-zinc-600 transition group-hover:text-[#1e6cff]" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 group-hover:text-[#1e6cff]">{p.label}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{p.tagline}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center">
            <Link
              href="/asesor"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600 hover:shadow-emerald-300 hover:scale-[1.02]"
            >
              <MessageCircle className="h-4 w-4" />
              ¿No sabes cuál elegir? Aquí te asesoramos
            </Link>
          </div>
        </section>
      )}

      {/* ── Paso 2: componentes ────────────────────────────────────────── */}
      {step === 2 && perfil && (
        <section className="animate-fade-in-up grid gap-6 lg:grid-cols-[1fr_300px]" style={{ animationDuration: "0.25s" }}>
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e6cff]/10">
                  <Icon name={perfil.icon} className="h-5 w-5 text-[#1e6cff]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-tight text-zinc-900">{perfil.label}</h2>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-[#1e6cff] hover:underline"
                  >
                    Cambiar perfil
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {perfil.slots.map((slot) => (
                <div key={slot.key} className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="mb-2.5 flex items-center gap-2">
                    <Icon name={slot.icon} className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-sm font-semibold text-zinc-800">{slot.label}</h3>
                    {slot.opcional && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">opcional</span>
                    )}
                  </div>

                  {slot.opciones.length === 0 ? (
                    <p className="flex items-center gap-2 text-xs text-zinc-500">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      {slot.nota}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {slot.opciones.map((op) => {
                        const sel = seleccion[slot.key] === op.label;
                        return (
                          <button
                            key={op.label}
                            onClick={() => setSeleccion((s) => ({ ...s, [slot.key]: op.label }))}
                            className={`relative flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                              sel
                                ? "border-[#1e6cff] bg-[#1e6cff]/10 text-[#1858d6]"
                                : "border-zinc-200 bg-white text-zinc-600 hover:border-[#1e6cff]/40 hover:bg-[#1e6cff]/5"
                            }`}
                          >
                            {sel && <Check className="h-3.5 w-3.5" />}
                            {op.label}
                            {op.rec && (
                              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                                sel ? "bg-[#1e6cff] text-white" : "bg-emerald-100 text-emerald-700"
                              }`}>
                                Recomendado
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
              >
                <ChevronLeft className="h-4 w-4" /> Atrás
              </button>
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1e6cff] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1858d6]"
              >
                Revisar configuración <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Consejo del perfil */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-amber-900">Consejo de Andrea</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-amber-800">{perfil.tip}</p>
            </div>
          </aside>
        </section>
      )}

      {/* ── Paso 3: revisar y cotizar ──────────────────────────────────── */}
      {step === 3 && perfil && (
        <section className="animate-fade-in-up mx-auto max-w-2xl" style={{ animationDuration: "0.25s" }}>
          <h2 className="mb-1 text-lg font-bold text-zinc-900">Revisa tu configuración</h2>
          <p className="mb-5 text-sm text-zinc-500">
            Si todo está bien, Andrea te confirma el precio final y la entrega.
          </p>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="flex items-center gap-2.5 border-b border-zinc-100 bg-zinc-50 px-5 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e6cff]/10">
                <Icon name={perfil.icon} className="h-4.5 w-4.5 text-[#1e6cff]" />
              </div>
              <p className="font-bold text-zinc-900">{perfil.label}</p>
            </div>
            <ul className="divide-y divide-zinc-100">
              {perfil.slots.map((slot) => (
                <li key={slot.key} className="flex items-center justify-between px-5 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-zinc-500">
                    <Icon name={slot.icon} className="h-4 w-4 text-zinc-400" />
                    {slot.label}
                  </span>
                  <span className="text-sm font-semibold text-zinc-800">
                    {slot.opciones.length === 0 ? "Gráficos integrados" : seleccion[slot.key]}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              <ChevronLeft className="h-4 w-4" /> Ajustar
            </button>
            <button
              onClick={cotizar}
              className="inline-flex items-center gap-2 rounded-full bg-[#1e6cff] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1858d6]"
            >
              <MessageCircle className="h-4.5 w-4.5" />
              Cotizar con Andrea
            </button>
          </div>

          <p className="mt-3 text-center text-[11px] text-zinc-400">
            Te llevamos al chat con tu configuración lista. Sin compromiso.
          </p>
        </section>
      )}
    </div>
  );
}

function Steps({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["Perfil", "Componentes", "Cotizar"];
  return (
    <div className="my-6 flex items-center gap-2">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
              done ? "bg-emerald-500 text-white" :
              active ? "bg-[#1e6cff] text-white" :
              "bg-zinc-100 text-zinc-400"
            }`}>
              {done ? <Check className="h-4 w-4" /> : n}
            </div>
            <span className={`hidden text-xs font-medium sm:block ${active || done ? "text-zinc-800" : "text-zinc-400"}`}>
              {label}
            </span>
            {i < labels.length - 1 && (
              <div className={`h-0.5 flex-1 rounded-full ${done ? "bg-emerald-500" : "bg-zinc-100"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
