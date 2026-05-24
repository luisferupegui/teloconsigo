import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/product-card";
import { BrandSlider } from "@/components/brand-slider";
import { Reveal } from "@/components/reveal";
import { StatsSection } from "@/components/counter";
import { categories } from "@/lib/categories";
import { getFeaturedProducts, getAllProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

// Imagen de Unsplash con look gaming PC RGB azul/púrpura.
// Para usar la imagen que enviaste:
//  1. Guarda la imagen como /public/hero.jpg
//  2. Cambia HERO_IMAGE a "/hero.jpg"
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=2400&q=85";

export default function Home() {
  const featured = getFeaturedProducts();
  const ofertas = getAllProducts()
    .filter((p) => p.precioAnterior)
    .slice(0, 4);

  return (
    <div className="flex flex-col">
      {/* Hero con imagen real */}
      <section className="relative overflow-hidden text-white">
        <Image
          src={HERO_IMAGE}
          alt="Setup gaming completo: gabinete, GPU, monitor, periféricos"
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
        {/* Overlay azul/navy para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1530]/95 via-[#0d1e3a]/80 to-[#0d1e3a]/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(30,108,255,0.25),transparent_60%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              ✨ Tecnología con atención personalizada
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Todo el hardware <br />
              que necesitas, <br />
              <span className="bg-gradient-to-r from-[#4d8dff] via-[#1e6cff] to-[#7e4dff] bg-clip-text text-transparent">
                te lo consigo.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-zinc-200">
              Componentes y accesorios para computadoras domésticas y
              corporativas. Si no lo encuentras, te lo conseguimos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/catalogo"
                className="group relative overflow-hidden rounded-md bg-[#1e6cff] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#1e6cff]/40 transition hover:bg-[#1858d6] hover:shadow-xl hover:shadow-[#1e6cff]/60 hover:-translate-y-0.5 animate-pulse-glow"
              >
                <span className="relative z-10">Ver productos →</span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </Link>
              <Link
                href="/ofertas"
                className="rounded-md border border-white/30 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15 hover:border-white/60 hover:-translate-y-0.5"
              >
                Ofertas del día
              </Link>
            </div>

            {/* Features bar (estilo referencia) */}
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-white/10 pt-6">
              {[
                { i: "⚙️", t: "Tecnología", s: "de última generación" },
                { i: "📈", t: "Máximo", s: "rendimiento" },
                { i: "🛡️", t: "Calidad y", s: "confianza" },
                { i: "🎧", t: "Soporte", s: "especializado" },
              ].map((f) => (
                <div key={f.t} className="flex items-start gap-2">
                  <span className="text-xl">{f.i}</span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white">
                      {f.t}
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-zinc-300">
                      {f.s}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Strip de categorías */}
        <div className="relative pb-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-gradient-to-br from-white via-[#f8faff] to-[#eef2f7] p-5 shadow-[0_25px_60px_-15px_rgba(13,30,58,0.45)] ring-1 ring-[#1e6cff]/20">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-10">
                {categories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/categoria/${cat.slug}`}
                    className="group flex flex-col items-center rounded-lg p-2 text-center hover:bg-blue-50 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="relative h-14 w-14 overflow-hidden rounded-full border border-zinc-200 bg-zinc-50 ring-0 ring-[#1e6cff]/30 transition group-hover:ring-4">
                      <Image
                        src={cat.imagen}
                        alt={cat.nombre}
                        fill
                        sizes="56px"
                        className="object-cover transition duration-500 group-hover:scale-125"
                      />
                    </div>
                    <span className="mt-2 text-[11px] font-medium text-zinc-700 group-hover:text-[#1e6cff] group-hover:font-bold transition">
                      {cat.nombre}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marcas */}
      <BrandSlider />

      {/* Stats animadas */}
      <StatsSection />

      {/* Productos destacados */}
      <section className="relative bg-gradient-to-b from-[#dde4ee] via-[#e8edf5] to-[#dde4ee] bg-tech-grid">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 relative">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <span className="inline-block rounded-full bg-[#1e6cff]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1e6cff]">
                ★ Lo más vendido
              </span>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-zinc-900">
                Productos destacados
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Los favoritos de nuestros clientes
              </p>
            </div>
            <Link
              href="/catalogo"
              className="text-sm font-semibold text-[#1e6cff] hover:underline"
            >
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {featured.slice(0, 6).map((p, i) => (
              <Reveal key={p.id} delay={i * 80}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Banner CTA Asesor IA */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d1e3a] via-[#13294b] to-[#1e6cff] p-8 text-white">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                🤖 Powered by Claude AI
              </span>
              <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
                Asesor IA para armar tu PC
              </h2>
              <p className="mt-2 max-w-xl text-zinc-200">
                Dile qué quieres armar y te recomendamos partes 100% compatibles
                con tu presupuesto. Verificación determinista, cero
                alucinaciones.
              </p>
            </div>
            <Link
              href="/asesor"
              className="self-center rounded-md bg-white px-6 py-3 text-sm font-bold text-[#1e6cff] hover:scale-105 transition"
            >
              Probar el Asesor IA →
            </Link>
          </div>
        </div>
      </section>

      {/* Ofertas */}
      {ofertas.length > 0 && (
        <section className="bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 border-y border-orange-100">
          <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <span className="inline-block rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-700">
                  🔥 Solo esta semana
                </span>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-zinc-900">
                  Ofertas de la semana
                </h2>
                <p className="text-sm text-zinc-600">
                  Descuentos por tiempo limitado
                </p>
              </div>
              <Link
                href="/ofertas"
                className="text-sm font-semibold text-orange-600 hover:underline"
              >
                Ver todas →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {ofertas.map((p, i) => (
                <Reveal key={p.id} delay={i * 80}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Servicios */}
      <section className="relative bg-[#0a1530] text-white bg-tech-grid-dark overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,108,255,0.15),transparent_70%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                emoji: "🚚",
                titulo: "Envíos a todo Colombia",
                texto: "Despachamos a cualquier ciudad del país.",
              },
              {
                emoji: "🛡️",
                titulo: "Garantía oficial",
                texto: "Productos originales con respaldo del fabricante.",
              },
              {
                emoji: "💳",
                titulo: "Pago seguro",
                texto: "Visa, Mastercard, PSE y ePayco.",
              },
              {
                emoji: "💬",
                titulo: "Atención humana",
                texto: "Te ayudamos antes, durante y después de la compra.",
              },
            ].map((s) => (
              <div
                key={s.titulo}
                className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur"
              >
                <p className="text-3xl">{s.emoji}</p>
                <p className="mt-2 font-display font-bold text-white">
                  {s.titulo}
                </p>
                <p className="mt-1 text-sm text-zinc-300">{s.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Te lo conseguimos */}
      <section className="relative bg-gradient-to-b from-[#dde4ee] to-[#e8edf5] bg-dots">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 relative">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-white via-[#f8faff] to-blue-50 border-2 border-[#1e6cff] px-8 py-12 text-center sm:px-16 shadow-2xl shadow-[#1e6cff]/15">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#1e6cff]">
            ✨ Nuestro diferencial
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold text-zinc-900 sm:text-4xl">
            ¿No lo encuentras?{" "}
            <span className="text-[#1e6cff]">Te lo conseguimos.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-600">
            Dinos qué necesitas — un componente raro, una marca específica, un
            equipo industrial. Nuestro equipo lo busca por ti.
          </p>
          <Link
            href="/conseguir"
            className="mt-6 inline-flex rounded-md bg-[#1e6cff] px-8 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#1858d6]"
          >
            Hacer una solicitud →
          </Link>
        </div>
        </div>
      </section>
    </div>
  );
}
