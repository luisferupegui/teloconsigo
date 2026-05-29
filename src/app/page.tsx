import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { CategoryCarousel } from "@/components/category-carousel";
import { HeroSlider } from "@/components/hero-slider";
import { BrandMarquee } from "@/components/brand-marquee";
import { StatsSection } from "@/components/counter";
import { getFeaturedProducts, getAllProducts } from "@/lib/products";
import {
  ChevronRight,
  ChevronDown,
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
  Battery,
  Sparkles,
  Thermometer,
  HardDrive,
  XCircle,
  CheckCircle2,
  Laptop,
  Smartphone,
  Watch,
} from "lucide-react";

export const dynamic = "force-dynamic";


export default function Home() {
  // Curado: mezclamos categorías para variedad visual en lugar de mostrar
  // varios items del mismo tipo seguidos.
  const allFeatured = getFeaturedProducts();
  const seenCats = new Set<string>();
  const featured: typeof allFeatured = [];
  for (const p of allFeatured) {
    if (!seenCats.has(p.categoria)) {
      featured.push(p);
      seenCats.add(p.categoria);
      if (featured.length === 8) break;
    }
  }
  // Si no llegamos a 8 con la regla anti-duplicados, completamos con el resto.
  if (featured.length < 8) {
    for (const p of allFeatured) {
      if (!featured.includes(p)) {
        featured.push(p);
        if (featured.length === 8) break;
      }
    }
  }

  const ofertas = getAllProducts()
    .filter((p) => p.precioAnterior)
    .slice(0, 8);

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

          {/* Grid — 8 productos curados (1 por categoría para variedad) */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p, i) => (
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
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
          6. TELOCONSIGO ECOSYSTEM
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
          8. CONSEJOS TECNOLÓGICOS
      ══════════════════════════════════════════ */}
      <section className="overflow-hidden">

        {/* ── Hero ─────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-[#04091a] via-[#070f1e] to-[#04091a] py-16 overflow-hidden">
          <div className="absolute inset-0 bg-tech-grid-dark opacity-20 pointer-events-none" />
          <div className="absolute -top-32 right-0 w-[500px] h-[500px] bg-[#1e6cff]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#4d8dff]/8 rounded-full blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[#4d8dff] mb-4">
              — Consejos Tecnológicos
            </p>
            <h2 className="font-display text-4xl sm:text-6xl font-black text-white leading-tight mb-5">
              Cuida tu tecnología,{" "}
              <span className="text-[#4d8dff]">disfrútala más tiempo</span>
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
              Descubre recomendaciones prácticas para proteger y conservar
              tus dispositivos en óptimas condiciones.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              <a href="#cuidado-tips"
                 className="inline-flex items-center gap-2 rounded-full bg-[#1e6cff] px-6 py-3
                            text-sm font-semibold text-white hover:bg-[#1e6cff]/85 transition">
                Ver recomendaciones <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/catalogo"
                    className="inline-flex items-center gap-2 rounded-full border border-white/20
                               px-6 py-3 text-sm font-semibold text-white
                               hover:border-white/40 hover:bg-white/5 transition">
                Explorar productos
              </Link>
            </div>
            <div className="flex justify-center gap-12 pt-8 border-t border-white/8">
              {[
                { stat: "+5 años", label: "de vida útil cuidando bien" },
                { stat: "6 tips",  label: "esenciales de cuidado" },
                { stat: "4 tipos", label: "de dispositivos cubiertos" },
              ].map(({ stat, label }) => (
                <div key={stat} className="text-center">
                  <p className="text-2xl font-black text-white">{stat}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 6 Cards recomendaciones ──────────────── */}
        <div id="cuidado-tips" className="bg-[#060d1a] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
              <p className="font-mono text-xs uppercase tracking-widest text-[#4d8dff] mb-2">— Tips esenciales</p>
              <h3 className="font-display text-2xl font-black text-white">Recomendaciones esenciales</h3>
              <p className="text-zinc-400 text-sm mt-1.5">Hábitos simples que marcan una gran diferencia</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { Icon: Battery,     title: "Cuida la batería",
                  desc: "Evita el sobrecalentamiento y usa cargadores certificados para prolongar su vida útil.",
                  color: "#4d8dff", bg: "from-[#1e6cff]/10" },
                { Icon: Sparkles,    title: "Mantén tus equipos limpios",
                  desc: "El polvo y la humedad reducen el rendimiento y la vida útil de tus dispositivos.",
                  color: "#22d3ee", bg: "from-cyan-500/10" },
                { Icon: Shield,      title: "Protege tu información",
                  desc: "Usa contraseñas seguras y mantén tus dispositivos siempre actualizados.",
                  color: "#a78bfa", bg: "from-purple-500/10" },
                { Icon: Thermometer, title: "Evita temperaturas extremas",
                  desc: "El calor excesivo puede dañar la batería y los componentes internos.",
                  color: "#f97316", bg: "from-orange-500/10" },
                { Icon: HardDrive,   title: "Mantén espacio disponible",
                  desc: "Un almacenamiento saturado vuelve lento tu dispositivo y afecta su rendimiento.",
                  color: "#34d399", bg: "from-emerald-500/10" },
                { Icon: Zap,         title: "Usa accesorios de calidad",
                  desc: "Cables y cargadores certificados protegen tus equipos de daños eléctricos.",
                  color: "#fbbf24", bg: "from-yellow-500/10" },
              ].map(({ Icon, title, desc, color, bg }) => (
                <div key={title}
                     className={`bg-gradient-to-br ${bg} to-transparent border border-white/8
                                 rounded-2xl p-6 hover:border-white/15 transition-colors`}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                       style={{ backgroundColor: `${color}1a` }}>
                    <Icon style={{ color }} className="h-6 w-6" />
                  </div>
                  <h4 className="font-display font-bold text-white text-base mb-2">{title}</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Errores + Dispositivos (lado a lado) ─── */}
        <div className="bg-[#0a0f1c] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12">

              {/* Errores comunes */}
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-red-400 mb-2">— Malos hábitos</p>
                <h3 className="font-display text-2xl font-black text-white mb-1">
                  Errores que debes <span className="text-red-400">evitar</span>
                </h3>
                <p className="text-zinc-400 text-sm mb-6">Pequeños descuidos que acortan la vida de tus equipos</p>
                <div className="space-y-3">
                  {[
                    "Usar cargadores genéricos no certificados",
                    "Bloquear las ventilaciones del portátil",
                    "Exponer dispositivos al sol directo",
                    "Instalar apps de fuentes desconocidas",
                    "Nunca reiniciar ni actualizar el equipo",
                    "Usar el celular mientras carga y se sobrecalienta",
                  ].map((error) => (
                    <div key={error}
                         className="flex items-center gap-3 bg-red-500/5 border border-red-500/15
                                    rounded-xl px-4 py-3">
                      <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                      <p className="text-sm text-zinc-300">{error}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Por tipo de dispositivo */}
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-[#4d8dff] mb-2">— Por dispositivo</p>
                <h3 className="font-display text-2xl font-black text-white mb-1">
                  Cuida cada tipo de dispositivo
                </h3>
                <p className="text-zinc-400 text-sm mb-6">Consejos específicos para cada equipo que tienes</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { Icon: Laptop,     label: "Laptops",      color: "#4d8dff",
                      tips: ["No usar sobre superficies blandas", "Transportar siempre en funda", "Mantener ventilación libre"] },
                    { Icon: Smartphone, label: "Smartphones",  color: "#22d3ee",
                      tips: ["Evitar carga al 100% constante", "Proteger pantalla y cámara", "Actualizar el sistema operativo"] },
                    { Icon: Headphones, label: "Accesorios",   color: "#a78bfa",
                      tips: ["Guardar los cables correctamente", "Evitar enrollarlos excesivamente", "Limpiar audífonos periódicamente"] },
                    { Icon: Watch,      label: "Smartwatches", color: "#34d399",
                      tips: ["Evitar humedad si no son resistentes", "Mantener los sensores limpios", "Cargar antes de llegar a 0%"] },
                  ].map(({ Icon, label, color, tips }) => (
                    <div key={label}
                         className="bg-[#0d1a2e] border border-white/8 rounded-2xl p-4
                                    hover:border-white/15 transition-colors">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                             style={{ backgroundColor: `${color}1a` }}>
                          <Icon style={{ color }} className="h-4 w-4" />
                        </div>
                        <span className="font-display font-bold text-white text-sm">{label}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {tips.map((tip) => (
                          <li key={tip} className="flex items-start gap-2 text-xs text-zinc-400">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Checklist + FAQ ──────────────────────── */}
        <div className="bg-[#060d1a] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12">

              {/* Checklist */}
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-emerald-400 mb-2">— Mantenimiento</p>
                <h3 className="font-display text-2xl font-black text-white mb-1">Checklist de cuidado</h3>
                <p className="text-zinc-400 text-sm mb-6">Revisiones periódicas que alargan la vida de tus equipos</p>
                <div className="space-y-2.5">
                  {[
                    "Actualizar el sistema operativo",
                    "Limpiar pantalla y teclado",
                    "Revisar espacio de almacenamiento",
                    "Reiniciar el equipo periódicamente",
                    "Hacer copia de seguridad",
                    "Verificar el estado del cargador",
                  ].map((item) => (
                    <div key={item}
                         className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/15
                                    rounded-xl px-4 py-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <p className="text-sm text-zinc-300">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ */}
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-[#4d8dff] mb-2">— Dudas frecuentes</p>
                <h3 className="font-display text-2xl font-black text-white mb-1">Preguntas frecuentes</h3>
                <p className="text-zinc-400 text-sm mb-6">Respuestas claras a las consultas más comunes</p>
                <div className="space-y-2">
                  {[
                    { q: "¿Es malo dejar cargando el celular toda la noche?",
                      a: "Los dispositivos modernos detienen la carga al llegar al 100%, pero mantenerlo constantemente al máximo puede degradar la batería a largo plazo." },
                    { q: "¿Cómo cuidar la batería de mi laptop?",
                      a: "Evita descargas completas frecuentes. Mantener entre 20% y 80% es lo ideal para prolongar su vida útil." },
                    { q: "¿Cada cuánto debo limpiar mis dispositivos?",
                      a: "Una limpieza superficial semanal y una más profunda mensual es suficiente para la mayoría de dispositivos." },
                    { q: "¿Por qué se calienta mi portátil?",
                      a: "El polvo acumulado en las ventilaciones es la causa más común. Usar el equipo sobre superficies blandas también bloquea la ventilación." },
                    { q: "¿Cómo proteger mis datos personales?",
                      a: "Usa contraseñas únicas, activa la autenticación en dos pasos y mantén siempre actualizado tu sistema operativo." },
                  ].map(({ q, a }) => (
                    <details key={q} className="group border border-white/8 rounded-xl overflow-hidden">
                      <summary className="flex items-center justify-between px-4 py-3.5 cursor-pointer
                                          text-sm font-medium text-zinc-200 hover:text-white
                                          hover:bg-white/4 transition-colors list-none select-none">
                        {q}
                        <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0 ml-3
                                                transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div className="px-4 pt-3 pb-4 text-sm text-zinc-400 leading-relaxed border-t border-white/6">
                        {a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
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
