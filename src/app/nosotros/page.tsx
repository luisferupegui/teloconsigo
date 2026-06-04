import Link from "next/link";
import {
  Target,
  Eye,
  Heart,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
  Package,
  Headphones,
  TrendingUp,
  Award,
  Rocket,
} from "lucide-react";
import { StatsSection } from "@/components/counter";

export const metadata = {
  title: "Sobre nosotros",
  description:
    "Somos Te lo Consigo: el equipo apasionado por la tecnología que conecta a Colombia con el mejor hardware del mundo. Conoce nuestra historia, misión y valores.",
};

const valores = [
  {
    icon: ShieldCheck,
    titulo: "Confianza",
    texto:
      "Solo vendemos productos originales con garantía oficial del fabricante. Tu inversión, protegida.",
    gradient: "from-[#1e6cff] to-[#4d8dff]",
  },
  {
    icon: Heart,
    titulo: "Cercanía",
    texto:
      "Atención humana real. Hablas con personas que aman la tecnología, no con bots vacíos.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Rocket,
    titulo: "Compromiso",
    texto:
      "Si no está en catálogo, lo buscamos por ti. Nuestro slogan no es marketing, es nuestra promesa.",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    icon: Award,
    titulo: "Experiencia",
    texto:
      "Más de una década apasionados por el hardware. Sabemos qué funciona y qué no antes de venderlo.",
    gradient: "from-purple-500 to-fuchsia-500",
  },
  {
    icon: Package,
    titulo: "Eficiencia",
    texto:
      "Despachos rápidos a todo Colombia. Tu equipo armado y listo cuando lo necesitas.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Sparkles,
    titulo: "Innovación",
    texto:
      "Combinamos asesoría humana con IA para que armes tu PC ideal en minutos, sin errores.",
    gradient: "from-cyan-500 to-blue-500",
  },
];

const porQue = [
  {
    icon: Users,
    titulo: "Atención personalizada",
    texto:
      "Cada cliente es único. Te escuchamos antes de recomendarte.",
  },
  {
    icon: Zap,
    titulo: "Compatibilidad verificada",
    texto:
      "Nuestro motor revisa que todo lo que armes funcione en conjunto.",
  },
  {
    icon: TrendingUp,
    titulo: "Mejores precios",
    texto:
      "Trabajamos directo con distribuidores autorizados, sin intermediarios.",
  },
  {
    icon: Headphones,
    titulo: "Soporte post-venta",
    texto:
      "Te acompañamos antes, durante y después de tu compra. Sin abandonar.",
  },
];

export default function NosotrosPage() {
  return (
    <div className="bg-[#e8edf5]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a1530] via-[#13294b] to-[#0d1e3a] text-white">
        <div className="absolute inset-0 bg-tech-grid-dark opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(30,108,255,0.3),transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <nav className="text-xs text-zinc-300 mb-4">
            <Link href="/" className="hover:underline">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <span>Sobre nosotros</span>
          </nav>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            ✨ Nuestra historia
          </span>
          <h1 className="mt-5 font-display text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl max-w-4xl">
            Más que una tienda,{" "}
            <span className="bg-gradient-to-r from-[#4d8dff] via-[#7eb0ff] to-[#a8d0ff] bg-clip-text text-transparent">
              tu aliado tecnológico.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-zinc-300">
            Somos un equipo de apasionados por la tecnología que cree en algo
            simple: cada persona merece encontrar el hardware perfecto sin
            adivinar, sin enredos y con la confianza de que estará respaldada.
          </p>
        </div>
      </section>

      {/* Misión + Visión */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 -mt-12 relative z-10">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="group relative overflow-hidden rounded-3xl bg-white border border-zinc-200 p-8 shadow-xl hover:-translate-y-1 transition">
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-[#1e6cff] to-[#7e4dff] opacity-10 blur-3xl" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e6cff] to-[#4d8dff] text-white shadow-lg shadow-[#1e6cff]/30">
              <Target className="h-7 w-7" strokeWidth={2} />
            </div>
            <p className="mt-5 text-[10px] uppercase tracking-widest text-[#1e6cff] font-bold">
              Misión
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-zinc-900">
              Hacer que encontrar la tecnología ideal sea más fácil, confiable y personalizada.
            </h2>
            <p className="mt-3 text-zinc-600 leading-relaxed">
              Conectamos personas, gamers, profesionales y empresas con equipos y soluciones tecnológicas que realmente se adaptan a sus necesidades, combinando asesoría experta, atención cercana y acceso a un catálogo moderno y especializado.
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-3xl bg-white border border-zinc-200 p-8 shadow-xl hover:-translate-y-1 transition">
            <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-[#7e4dff] to-[#1e6cff] opacity-10 blur-3xl" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/30">
              <Eye className="h-7 w-7" strokeWidth={2} />
            </div>
            <p className="mt-5 text-[10px] uppercase tracking-widest text-purple-600 font-bold">
              Visión
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-zinc-900">
              Convertirnos en la empresa tecnológica más confiable y cercana del País.
            </h2>
            <p className="mt-3 text-zinc-600 leading-relaxed">
              Queremos transformar la forma en que las personas compran tecnología, ofreciendo una experiencia simple, inteligente y personalizada donde encontrar el equipo ideal sea rápido, transparente y seguro.
            </p>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="bg-tech-grid">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block rounded-full bg-[#1e6cff]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1e6cff]">
              💎 Lo que nos define
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold text-zinc-900 sm:text-4xl">
              Nuestros valores
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-zinc-600">
              Seis principios que guían cada decisión, cada recomendación y
              cada empaque que sale por nuestra puerta.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {valores.map((v) => (
              <div
                key={v.titulo}
                className="group relative overflow-hidden rounded-2xl bg-white border border-zinc-200 p-6 hover:-translate-y-1 hover:shadow-xl transition"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${v.gradient} text-white shadow-lg group-hover:scale-110 group-hover:rotate-6 transition`}
                >
                  <v.icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-zinc-900">
                  {v.titulo}
                </h3>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                  {v.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats reutilizado */}
      <StatsSection />

      {/* Por qué elegirnos */}
      <section className="bg-[#0a1530] text-white relative overflow-hidden bg-tech-grid-dark">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,108,255,0.18),transparent_70%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              ⚡ Por qué elegirnos
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
              No vendemos cajas.{" "}
              <span className="text-[#4d8dff]">Resolvemos problemas.</span>
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {porQue.map((p) => (
              <div
                key={p.titulo}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur hover:bg-white/10 hover:-translate-y-1 transition"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e6cff] to-[#4d8dff] text-white shadow-lg shadow-[#1e6cff]/30">
                  <p.icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold">
                  {p.titulo}
                </h3>
                <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
                  {p.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-gradient-to-b from-[#e8edf5] to-white bg-dots">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-4xl font-bold text-zinc-900 sm:text-5xl">
            Listos para conseguirte{" "}
            <span className="bg-gradient-to-r from-[#1e6cff] to-[#7e4dff] bg-clip-text text-transparent">
              lo que necesitas.
            </span>
          </h2>
          <p className="mt-4 text-lg text-zinc-600">
            Cuéntanos qué buscas y déjanos hacer lo que sabemos hacer.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/catalogo"
              className="rounded-full bg-[#1e6cff] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#1e6cff]/30 hover:bg-[#1858d6]"
            >
              Explorar catálogo →
            </Link>
            <Link
              href="/conseguir"
              className="rounded-full border-2 border-[#1e6cff] bg-white px-8 py-3 text-sm font-bold text-[#1e6cff] hover:bg-blue-50"
            >
              ✨ Te lo conseguimos
            </Link>
            <Link
              href="/contacto"
              className="rounded-full border border-zinc-300 bg-white px-8 py-3 text-sm font-bold text-zinc-700 hover:border-[#1e6cff]"
            >
              Contactar al equipo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
