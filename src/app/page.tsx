import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { CategoryCarousel } from "@/components/category-carousel";
import { HeroSlider } from "@/components/hero-slider";
import { BrandMarquee } from "@/components/brand-marquee";
import { StatsSection } from "@/components/counter";
import { categories } from "@/lib/categories";
import { getFeaturedProducts, getAllProducts } from "@/lib/products";
import {
  ChevronRight,
  Cpu,
  Zap,
  Shield,
  Headphones,
  Bot,
  Wrench,
  Package,
  ArrowRight,
  TrendingUp,
  Monitor,
} from "lucide-react";

export const dynamic = "force-dynamic";

/* ─── Constantes de imagen ─── */
const HERO_BG = "/hero-banner.png";
const PROMO_A =
  "https://images.unsplash.com/photo-1591405351990-4726e331f141?auto=format&fit=crop&w=1200&q=85";
const PROMO_B =
  "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=85";
const CULTURE_A =
  "https://images.unsplash.com/photo-1547119957-637f8679db1e?auto=format&fit=crop&w=800&q=80";
const CULTURE_B =
  "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80";
const CULTURE_C =
  "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80";

export default function Home() {
  const featured = getFeaturedProducts();
  const ofertas = getAllProducts()
    .filter((p) => p.precioAnterior)
    .slice(0, 4);

  return (
    <div className="flex flex-col bg-[#080d14]">

      {/* ══════════════════════════════════════════
          3. HERO SECTION — Slider automático
      ══════════════════════════════════════════ */}
      <HeroSlider />

      {/* ══════════════════════════════════════════
          4. EXPLORA NUESTROS PRODUCTOS — Carrusel
      ══════════════════════════════════════════ */}
      <CategoryCarousel />

      {/* ══════════════════════════════════════════
          5. MARCAS — Marquee de logos en movimiento
      ══════════════════════════════════════════ */}
      <BrandMarquee />

      {/* ══════════════════════════════════════════
          6. ESTADÍSTICAS — Contadores animados
      ══════════════════════════════════════════ */}
      <StatsSection />

      {/* ══════════════════════════════════════════
          7. FEATURED PRODUCTS — Dark, ROG-style
      ══════════════════════════════════════════ */}
      <section className="bg-[#0a0f1a] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[#1e6cff] mb-1">
                — Lo más vendido
              </p>
              <h2 className="font-display text-3xl font-black text-white sm:text-4xl">
                PRODUCTOS DESTACADOS
              </h2>
            </div>
            <Link
              href="/catalogo"
              className="flex items-center gap-1.5 text-sm font-semibold text-zinc-400 hover:text-[#1e6cff] transition"
            >
              Ver todo el catálogo <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {featured.slice(0, 6).map((p, i) => (
              <Reveal key={p.id} delay={i * 60}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>

          {/* Ofertas strip */}
          {ofertas.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-1 bg-orange-500" />
                  <h3 className="font-display text-xl font-black text-white">
                    OFERTAS DE LA SEMANA
                  </h3>
                  <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider animate-pulse">
                    Hot
                  </span>
                </div>
                <Link
                  href="/catalogo"
                  className="flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 transition"
                >
                  Ver todas <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ofertas.map((p, i) => (
                  <Reveal key={p.id} delay={i * 60}>
                    <ProductCard product={p} />
                  </Reveal>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          5. GAMING CATEGORIES — Large cards, ROG-style
      ══════════════════════════════════════════ */}
      <section className="bg-[#080d14] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[#1e6cff] mb-1">
                — Explora por tipo
              </p>
              <h2 className="font-display text-3xl font-black text-white sm:text-4xl">
                CATEGORÍAS
              </h2>
            </div>
          </div>

          {/* Grid asimétrico estilo ROG */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:grid-rows-2">
            {/* Card grande — Tarjetas gráficas */}
            <Link
              href="/categoria/tarjetas-graficas"
              className="group relative col-span-2 row-span-2 overflow-hidden rounded-sm lg:col-span-2"
            >
              <div className="relative h-64 lg:h-full min-h-[320px]">
                <Image
                  src="https://images.unsplash.com/photo-1591405351990-4726e331f141?auto=format&fit=crop&w=800&q=85"
                  alt="Tarjetas gráficas"
                  fill
                  sizes="(max-width:1024px) 50vw, 40vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-[#1e6cff]/0 group-hover:bg-[#1e6cff]/10 transition-colors duration-300" />
                <div className="absolute bottom-0 left-0 p-5">
                  <span className="text-2xl">🎮</span>
                  <h3 className="mt-1 font-display text-2xl font-black text-white">
                    TARJETAS GRÁFICAS
                  </h3>
                  <p className="text-sm text-zinc-300 mt-0.5">RTX 4090 · RX 7900 XTX</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#4d8dff] uppercase tracking-wider group-hover:gap-2 transition-all">
                    Ver GPUs <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>

            {/* Procesadores */}
            <Link
              href="/categoria/procesadores"
              className="group relative overflow-hidden rounded-sm"
            >
              <div className="relative h-40">
                <Image
                  src="https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=600&q=80"
                  alt="Procesadores"
                  fill
                  sizes="20vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 p-3">
                  <span className="text-lg">🧠</span>
                  <h3 className="font-display text-sm font-black text-white leading-tight">
                    PROCESADORES
                  </h3>
                  <p className="text-[11px] text-zinc-400">AM5 · LGA1700</p>
                </div>
              </div>
            </Link>

            {/* Placas madre */}
            <Link
              href="/categoria/placas-madre"
              className="group relative overflow-hidden rounded-sm"
            >
              <div className="relative h-40">
                <Image
                  src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
                  alt="Placas madre"
                  fill
                  sizes="20vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 p-3">
                  <span className="text-lg">🔌</span>
                  <h3 className="font-display text-sm font-black text-white leading-tight">
                    PLACAS MADRE
                  </h3>
                  <p className="text-[11px] text-zinc-400">Z790 · B650 · X670E</p>
                </div>
              </div>
            </Link>

            {/* Monitores */}
            <Link
              href="/categoria/monitores"
              className="group relative overflow-hidden rounded-sm"
            >
              <div className="relative h-40">
                <Image
                  src="https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80"
                  alt="Monitores"
                  fill
                  sizes="20vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 p-3">
                  <span className="text-lg">🖥️</span>
                  <h3 className="font-display text-sm font-black text-white leading-tight">
                    MONITORES
                  </h3>
                  <p className="text-[11px] text-zinc-400">OLED · 240Hz · QD-OLED</p>
                </div>
              </div>
            </Link>

            {/* Memoria RAM */}
            <Link
              href="/categoria/memoria-ram"
              className="group relative overflow-hidden rounded-sm"
            >
              <div className="relative h-40">
                <Image
                  src="https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=600&q=80"
                  alt="Memoria RAM"
                  fill
                  sizes="20vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 p-3">
                  <span className="text-lg">💾</span>
                  <h3 className="font-display text-sm font-black text-white leading-tight">
                    MEMORIA RAM
                  </h3>
                  <p className="text-[11px] text-zinc-400">DDR5 · DDR4</p>
                </div>
              </div>
            </Link>

            {/* Periféricos */}
            <Link
              href="/categoria/perifericos"
              className="group relative overflow-hidden rounded-sm"
            >
              <div className="relative h-40">
                <Image
                  src="https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80"
                  alt="Periféricos"
                  fill
                  sizes="20vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 p-3">
                  <span className="text-lg">⌨️</span>
                  <h3 className="font-display text-sm font-black text-white leading-tight">
                    PERIFÉRICOS
                  </h3>
                  <p className="text-[11px] text-zinc-400">Mouse · Teclados · Headsets</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Fila inferior: todas las demás categorías como pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {categories
              .filter(
                (c) =>
                  !["tarjetas-graficas", "procesadores", "placas-madre", "monitores", "memoria-ram", "perifericos"].includes(c.slug),
              )
              .map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/categoria/${cat.slug}`}
                  className="flex items-center gap-2 rounded-none border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-[#1e6cff] hover:text-white hover:bg-[#1e6cff]/10"
                >
                  <span>{cat.emoji}</span>
                  {cat.nombre}
                </Link>
              ))}
            <Link
              href="/catalogo"
              className="flex items-center gap-2 rounded-none border border-[#1e6cff]/50 bg-[#1e6cff]/10 px-4 py-2.5 text-sm font-semibold text-[#4d8dff] transition hover:bg-[#1e6cff]/20"
            >
              Ver todo el catálogo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          6. PROMOTIONAL BANNERS — Colecciones ROG-style
      ══════════════════════════════════════════ */}
      <section className="bg-[#080d14] pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2">

            {/* Banner A — GPU */}
            <Link
              href="/categoria/tarjetas-graficas"
              className="group relative overflow-hidden rounded-sm"
            >
              <div className="relative h-64 sm:h-80">
                <Image
                  src={PROMO_A}
                  alt="GPUs Gaming"
                  fill
                  sizes="(max-width:640px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
                <div className="absolute inset-0 bg-[#1e6cff]/0 group-hover:bg-[#1e6cff]/10 transition-colors duration-500" />
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-end p-6">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#4d8dff]">
                    Nueva colección
                  </span>
                  <h3 className="mt-1 font-display text-2xl font-black text-white leading-tight">
                    GPUs RTX 40 SUPER
                  </h3>
                  <p className="mt-1 text-sm text-zinc-300">
                    DLSS 3.5 · Frame Generation · Ray Tracing
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider border-b border-white/40 pb-0.5 w-fit group-hover:border-[#1e6cff] group-hover:text-[#4d8dff] transition-colors">
                    Explorar GPUs <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>

            {/* Banner B — CPUs */}
            <Link
              href="/categoria/procesadores"
              className="group relative overflow-hidden rounded-sm"
            >
              <div className="relative h-64 sm:h-80">
                <Image
                  src={PROMO_B}
                  alt="Procesadores AMD Intel"
                  fill
                  sizes="(max-width:640px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
                <div className="absolute inset-0 bg-[#7e4dff]/0 group-hover:bg-[#7e4dff]/10 transition-colors duration-500" />
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-end p-6">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-purple-400">
                    AMD · Intel
                  </span>
                  <h3 className="mt-1 font-display text-2xl font-black text-white leading-tight">
                    PROCESADORES 2024
                  </h3>
                  <p className="mt-1 text-sm text-zinc-300">
                    Ryzen 9 7950X3D · Core i9-14900K · 3D V-Cache
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider border-b border-white/40 pb-0.5 w-fit group-hover:border-purple-400 group-hover:text-purple-300 transition-colors">
                    Ver procesadores <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>

            {/* Banner C — Monitores (ancho completo) */}
            <Link
              href="/categoria/monitores"
              className="group relative overflow-hidden rounded-sm sm:col-span-2"
            >
              <div className="relative h-48 sm:h-56">
                <Image
                  src="https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=2000&q=85"
                  alt="Monitores Gaming"
                  fill
                  sizes="100vw"
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/30" />
                <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors duration-500" />
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-center p-8">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
                    OLED · QD-OLED · 240Hz+
                  </span>
                  <h3 className="mt-1 font-display text-3xl font-black text-white">
                    MONITORES GAMING
                  </h3>
                  <p className="mt-1 text-sm text-zinc-300 max-w-md">
                    Desde 280Hz FHD hasta OLED 4K. El panel correcto para tu
                    estilo de juego.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 rounded-none bg-white px-5 py-2 text-xs font-black text-black uppercase tracking-wider w-fit hover:bg-zinc-200 transition group-hover:gap-3">
                    SHOP NOW <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          7. TELOCONSIGO ECOSYSTEM
      ══════════════════════════════════════════ */}
      <section className="relative bg-[#0a0f1a] py-20 overflow-hidden">
        <div className="absolute inset-0 bg-tech-grid-dark opacity-20 pointer-events-none" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#1e6cff]/8 blur-[150px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-14">
            <p className="font-mono text-xs uppercase tracking-widest text-[#1e6cff] mb-2">
              — Más que una tienda
            </p>
            <h2 className="font-display text-4xl font-black text-white sm:text-5xl">
              EL ECOSISTEMA
              <br />
              <span className="bg-gradient-to-r from-[#4d8dff] to-[#7e4dff] bg-clip-text text-transparent">
                TELOCONSIGO
              </span>
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-zinc-400">
              Herramientas únicas para que siempre tengas el equipo perfecto,
              sin importar tu presupuesto ni tu nivel de conocimiento.
            </p>
          </div>

          {/* 3 tarjetas de servicio */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Asesor IA */}
            <Link
              href="/asesor"
              className="group relative overflow-hidden rounded-sm border border-zinc-800 bg-zinc-900/60 p-8 transition hover:border-[#1e6cff]/60 hover:bg-zinc-900"
            >
              <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[#1e6cff]/5 blur-3xl group-hover:bg-[#1e6cff]/15 transition-colors pointer-events-none" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-none bg-[#1e6cff]/15 border border-[#1e6cff]/30 text-[#4d8dff] mb-5 group-hover:bg-[#1e6cff]/25 transition">
                  <Bot className="h-6 w-6" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Powered by Claude AI
                </span>
                <h3 className="mt-1 font-display text-xl font-black text-white">
                  ASESOR IA
                </h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  Dile tu presupuesto y qué quieres hacer. Te recomendamos
                  partes 100% compatibles y verificadas. Cero alucinaciones.
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-[#4d8dff] uppercase tracking-wider group-hover:gap-2 transition-all">
                  Probar ahora <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>

            {/* Armador de PC */}
            <Link
              href="/armador"
              className="group relative overflow-hidden rounded-sm border border-zinc-800 bg-zinc-900/60 p-8 transition hover:border-purple-500/60 hover:bg-zinc-900"
            >
              <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-purple-500/5 blur-3xl group-hover:bg-purple-500/15 transition-colors pointer-events-none" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-none bg-purple-500/15 border border-purple-500/30 text-purple-400 mb-5 group-hover:bg-purple-500/25 transition">
                  <Wrench className="h-6 w-6" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Paso a paso
                </span>
                <h3 className="mt-1 font-display text-xl font-black text-white">
                  ARMADOR DE PC
                </h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  Arma tu build desde cero con verificación de compatibilidad
                  en tiempo real. Selecciona, compara y agrega todo al carrito.
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-purple-400 uppercase tracking-wider group-hover:gap-2 transition-all">
                  Iniciar build <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>

            {/* Te lo conseguimos */}
            <Link
              href="/conseguir"
              className="group relative overflow-hidden rounded-sm border border-zinc-800 bg-zinc-900/60 p-8 transition hover:border-emerald-500/60 hover:bg-zinc-900"
            >
              <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl group-hover:bg-emerald-500/15 transition-colors pointer-events-none" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-none bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-5 group-hover:bg-emerald-500/25 transition">
                  <Package className="h-6 w-6" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Cualquier cosa
                </span>
                <h3 className="mt-1 font-display text-xl font-black text-white">
                  TE LO CONSEGUIMOS
                </h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  ¿No está en el catálogo? No hay problema. Dinos qué necesitas
                  y lo buscamos por ti: componentes raros, marcas específicas,
                  equipos corporativos.
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-emerald-400 uppercase tracking-wider group-hover:gap-2 transition-all">
                  Hacer solicitud <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          </div>

          {/* Garantías — iconos */}
          <div className="mt-12 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-12 sm:grid-cols-4">
            {[
              { icon: Zap, title: "Despacho rápido", desc: "Express 24h disponible" },
              { icon: Shield, title: "Garantía oficial", desc: "Respaldo del fabricante" },
              { icon: Cpu, title: "Productos originales", desc: "100% auténticos" },
              { icon: Headphones, title: "Soporte real", desc: "Atención humana siempre" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-[#1e6cff] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="text-xs text-zinc-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          8. NEWS / ARTICLES / COMMUNITY
      ══════════════════════════════════════════ */}
      <section className="bg-[#080d14] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-[#1e6cff] mb-1">
                — Tech Tips & Guías
              </p>
              <h2 className="font-display text-3xl font-black text-white">
                CONOCIMIENTO TECH
              </h2>
            </div>
            <Link
              href="/catalogo"
              className="flex items-center gap-1 text-sm font-semibold text-zinc-400 hover:text-white transition"
            >
              Comunidad <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Artículo 1 */}
            <Link
              href="/categoria/tarjetas-graficas"
              className="group relative overflow-hidden rounded-sm"
            >
              <div className="relative h-48">
                <Image
                  src={CULTURE_A}
                  alt="Guía de monitores gaming"
                  fill
                  sizes="33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="rounded-none bg-[#1e6cff] px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    Guía
                  </span>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 border-t-0 p-5 group-hover:border-zinc-700 transition">
                <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                  Monitores · 5 min lectura
                </p>
                <h3 className="font-display text-base font-black text-white leading-snug group-hover:text-[#4d8dff] transition">
                  ¿OLED vs IPS vs VA? Cuál monitor elegir en 2024
                </h3>
                <p className="mt-2 text-xs text-zinc-400 line-clamp-2">
                  Explicamos las diferencias reales en colores, contraste,
                  tiempos de respuesta y precio para que elijas bien.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#4d8dff] group-hover:gap-2 transition-all">
                  Leer guía <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </Link>

            {/* Artículo 2 */}
            <Link
              href="/categoria/procesadores"
              className="group relative overflow-hidden rounded-sm"
            >
              <div className="relative h-48">
                <Image
                  src={CULTURE_B}
                  alt="Teclados mecánicos"
                  fill
                  sizes="33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="rounded-none bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    Comparativa
                  </span>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 border-t-0 p-5 group-hover:border-zinc-700 transition">
                <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                  CPUs · 8 min lectura
                </p>
                <h3 className="font-display text-base font-black text-white leading-snug group-hover:text-[#4d8dff] transition">
                  Ryzen 7 7800X3D vs i9-14900K: ¿cuál comprar?
                </h3>
                <p className="mt-2 text-xs text-zinc-400 line-clamp-2">
                  Benchmarks reales en 20 juegos y cargas de trabajo
                  creativas. El ganador te va a sorprender.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#4d8dff] group-hover:gap-2 transition-all">
                  Ver comparativa <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </Link>

            {/* Artículo 3 */}
            <Link
              href="/categoria/memoria-ram"
              className="group relative overflow-hidden rounded-sm"
            >
              <div className="relative h-48">
                <Image
                  src={CULTURE_C}
                  alt="Gaming mouse"
                  fill
                  sizes="33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="rounded-none bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    Tips
                  </span>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 border-t-0 p-5 group-hover:border-zinc-700 transition">
                <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                  Periféricos · 4 min lectura
                </p>
                <h3 className="font-display text-base font-black text-white leading-snug group-hover:text-[#4d8dff] transition">
                  Mouse gaming: DPI, sensor y peso — lo que realmente importa
                </h3>
                <p className="mt-2 text-xs text-zinc-400 line-clamp-2">
                  Olvida el marketing. Los 3 únicos factores que marcan
                  la diferencia en un mouse de competencia.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#4d8dff] group-hover:gap-2 transition-all">
                  Leer tips <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          9. CTA final
      ══════════════════════════════════════════ */}
      <section className="relative bg-[#0a0f1a] py-16 overflow-hidden">
        <div className="absolute inset-0 bg-tech-grid-dark opacity-15 pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2">

            {/* No lo encuentras */}
            <div className="flex flex-col justify-center rounded-sm border border-[#1e6cff]/30 bg-gradient-to-br from-[#1e6cff]/10 via-[#1e6cff]/5 to-transparent p-8">
              <TrendingUp className="h-8 w-8 text-[#1e6cff] mb-4" />
              <h3 className="font-display text-2xl font-black text-white">
                ¿NO LO
                <br />
                ENCUENTRAS?
              </h3>
              <p className="mt-3 text-sm text-zinc-400">
                Accedemos a distribuidores, importadores y mayoristas para
                conseguirte lo que necesitas a precio justo.
              </p>
              <Link
                href="/conseguir"
                className="mt-6 flex items-center justify-center gap-2 rounded-none bg-[#1e6cff] px-6 py-3.5 text-sm font-black text-white uppercase tracking-wider transition hover:bg-[#1858d6]"
              >
                TE LO CONSEGUIMOS <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Asesor IA */}
            <div className="flex flex-col justify-center rounded-sm border border-zinc-800 bg-zinc-900/60 p-8">
              <div className="flex items-center gap-3 mb-3">
                <Monitor className="h-5 w-5 text-purple-400" />
                <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">
                  Compra inteligente
                </span>
              </div>
              <p className="text-sm font-semibold text-white">
                Usa el Asesor IA para recibir recomendaciones personalizadas
                antes de comprar.
              </p>
              <Link
                href="/asesor"
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 transition"
              >
                Abrir Asesor <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
