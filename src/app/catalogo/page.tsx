import Link from "next/link";
import Image from "next/image";
import { existsSync } from "fs";
import path from "path";
import {
  ArrowRight, MessageCircle, Users2, LayoutGrid,
  Home, Gamepad2, Briefcase, Laptop, Server, Video, Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const metadata = {
  title: "Soluciones a medida | teloconsigo.co",
  description:
    "Tecnología para cada necesidad: hogar, gaming, productividad, movilidad, redes, creadores y smart home. Encuentra tu solución ideal con atención personalizada.",
};

// ─── Datos de cada solución ───────────────────────────────────────────────────

type Solucion = {
  numero: string;
  titulo: string;
  tagline: string;
  descripcion: string;
  recomendado: readonly string[];
  accesorios: readonly string[];
  idealPara: string;
  foto: string;
  acento: string;
  acentoBg: string;
  tipo: string;
  Icon: LucideIcon;
};

const SOLUCIONES: Solucion[] = [
  {
    numero: "01",
    titulo: "Hogar y Estudio",
    tagline: "Tecnología rápida y sencilla para estudiar, trabajar y disfrutar en casa.",
    descripcion:
      "Equipos ideales para clases virtuales, navegación, entretenimiento, teletrabajo y tareas diarias con excelente rendimiento y bajo consumo energético.",
    recomendado: ["Intel Core i3", "AMD Ryzen 3", "8 GB – 16 GB RAM", "SSD rápido", "Monitores Full HD"],
    accesorios: ["Impresora multifuncional", "Mouse inalámbrico", "Parlantes Bluetooth", "UPS básico"],
    idealPara: "Estudiantes, hogares, teletrabajo y oficina básica.",
    foto: "/soluciones/foto-1.png",
    acento: "#4d8dff",
    acentoBg: "#1e6cff",
    tipo: "hogar-estudio",
    Icon: Home,
  },
  {
    numero: "02",
    titulo: "Gaming y Streaming",
    tagline: "Potencia extrema para jugar, competir y transmitir sin límites.",
    descripcion:
      "Configuraciones diseñadas para gamers competitivos, streamers y usuarios que buscan gráficos avanzados, máxima fluidez y alto rendimiento.",
    recomendado: ["Intel Core i7", "AMD Ryzen 7", "RTX 4060 / RTX 4070", "32 GB RAM DDR5", "SSD NVMe Gen4"],
    accesorios: ["Monitor 144 Hz / 240 Hz", "Teclado mecánico RGB", "Mouse gamer", "Refrigeración líquida", "Headset profesional"],
    idealPara: "Gaming competitivo, streaming, eSports y setups RGB premium.",
    foto: "/soluciones/foto-2.png",
    acento: "#f87171",
    acentoBg: "#ef4444",
    tipo: "gaming-streaming",
    Icon: Gamepad2,
  },
  {
    numero: "03",
    titulo: "Productividad y Oficina",
    tagline: "Equipos confiables para multitarea, videollamadas y trabajo profesional.",
    descripcion:
      "Soluciones rápidas y eficientes para productividad empresarial, trabajo híbrido, Office, CRM, análisis y colaboración diaria.",
    recomendado: ["Intel Core i5", "AMD Ryzen 5", "16 GB RAM DDR5", "SSD NVMe ultrarrápido", "ThinkCentre / EliteDesk"],
    accesorios: ["Docking station USB-C", "Monitores ultrawide", "Mouse inalámbrico", "UPS y reguladores"],
    idealPara: "Ejecutivos, ventas, oficinas, home office y productividad empresarial.",
    foto: "/soluciones/foto-3.png",
    acento: "#22d3ee",
    acentoBg: "#0891b2",
    tipo: "productividad-oficina",
    Icon: Briefcase,
  },
  {
    numero: "04",
    titulo: "Movilidad Premium",
    tagline: "Laptops ultradelgadas y accesorios premium para trabajar desde cualquier lugar.",
    descripcion:
      "Tecnología diseñada para usuarios que necesitan autonomía, velocidad, diseño moderno y máxima movilidad.",
    recomendado: ["Zenbook", "Yoga", "EliteBook", "Tablets premium", "SSD ultrarrápidos"],
    accesorios: ["Docking stations", "Mochilas premium", "Audífonos ANC", "Mouse inalámbrico", "Morral ejecutivo"],
    idealPara: "Viajeros, ejecutivos, trabajo remoto y productividad móvil.",
    foto: "/soluciones/foto-4.png",
    acento: "#c084fc",
    acentoBg: "#9333ea",
    tipo: "movilidad-premium",
    Icon: Laptop,
  },
  {
    numero: "05",
    titulo: "Redes y Servidores",
    tagline: "Infraestructura segura y estable para empresas y conectividad avanzada.",
    descripcion:
      "Soluciones empresariales diseñadas para virtualización, almacenamiento, redes profesionales y operación continua 24/7.",
    recomendado: ["Intel Xeon", "AMD Threadripper", "NAS empresarial", "Redes WiFi 6", "Switches administrables", "UPS de respaldo"],
    accesorios: ["Access Points", "Servidores rack", "Backup automático", "Monitores corporativos", "Networking empresarial"],
    idealPara: "Empresas, coworking, infraestructura TI y servidores corporativos.",
    foto: "/soluciones/foto-5.png",
    acento: "#34d399",
    acentoBg: "#059669",
    tipo: "redes-servidores",
    Icon: Server,
  },
  {
    numero: "06",
    titulo: "Creadores y Producción",
    tagline: "Potencia profesional para edición, render y creación de contenido.",
    descripcion:
      "Equipos de alto rendimiento pensados para producción audiovisual, diseño 3D, streaming, fotografía e inteligencia artificial.",
    recomendado: ["Intel Core i9", "AMD Ryzen 9", "RTX 4070 / RTX 4080", "32 GB – 64 GB RAM DDR5", "SSD NVMe de alta velocidad"],
    accesorios: ["Monitores 2K / 4K IPS", "Audio profesional", "Micrófonos USB", "Kits de streaming", "Almacenamiento NAS"],
    idealPara: "Editores, diseñadores, streamers, arquitectos y creadores digitales.",
    foto: "/soluciones/foto-6.png",
    acento: "#fb923c",
    acentoBg: "#ea580c",
    tipo: "creadores-produccion",
    Icon: Video,
  },
  {
    numero: "07",
    titulo: "Smart Home y Conectividad",
    tagline: "Tecnología inteligente para hogares modernos y conectados.",
    descripcion:
      "Conecta, protege y controla todo tu hogar con soluciones WiFi avanzadas, automatización y entretenimiento inteligente.",
    recomendado: ["Routers WiFi 6", "Mesh WiFi", "Cámaras inteligentes", "IoT", "Asistentes inteligentes", "Streaming devices"],
    accesorios: ["Smart plugs", "Cámaras WiFi", "Repetidores", "Audio inteligente", "UPS para red"],
    idealPara: "Hogares inteligentes, entretenimiento, conectividad y automatización.",
    foto: "/soluciones/foto-7.png",
    acento: "#fbbf24",
    acentoBg: "#d97706",
    tipo: "smart-home",
    Icon: Wifi,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CatalogoPage() {
  // Verificar qué fotos existen en el sistema de archivos
  const soluciones = SOLUCIONES.map((s) => ({
    ...s,
    fotoExiste: existsSync(path.join(process.cwd(), "public", s.foto.slice(1))),
  }));

  return (
    <div className="bg-[#080d14]">

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-tech-grid-dark opacity-[0.15] pointer-events-none" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[350px]
                        rounded-full bg-[#1e6cff]/8 blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="text-xs text-zinc-600 mb-8">
            <Link href="/" className="hover:text-zinc-400 transition">Inicio</Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-400">Productos</span>
          </nav>

          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#4d8dff] mb-4">
            — Soluciones a medida
          </p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.0] mb-6">
            TECNOLOGÍA PARA
            <br />
            <span className="bg-gradient-to-r from-[#4d8dff] via-[#7e4dff] to-[#4d8dff]
                             bg-clip-text text-transparent">
              CADA NECESIDAD
            </span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed max-w-lg mb-10">
            Desde el hogar hasta la empresa, encontramos el equipo exacto para
            lo que necesitas. Sin complicaciones, con atención real.
          </p>

          {/* ── Botón Catálogo completo ── */}
          <Link
            href="/tienda"
            className="group inline-flex items-center gap-4 mb-8
                       rounded-xl border border-white/10 bg-white/[0.03]
                       px-5 py-3.5 transition-all duration-200
                       hover:border-[#1e6cff]/40 hover:bg-[#1e6cff]/5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center
                            rounded-lg border border-[#1e6cff]/30 bg-[#1e6cff]/10
                            group-hover:bg-[#1e6cff]/20 transition">
              <LayoutGrid className="h-4 w-4 text-[#4d8dff]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Catálogo de Componentes</p>
              <p className="text-xs text-zinc-500 leading-tight mt-0.5">
                Procesadores · Memorias · GPUs · Impresoras · Almacenamiento
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-600 ml-auto group-hover:text-[#4d8dff]
                                   group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Navegación rápida — pills */}
          <div className="flex flex-wrap gap-3 mt-6">
            {soluciones.map((s) => (
              <a
                key={s.numero}
                href={`#solucion-${s.numero}`}
                className="inline-flex items-center gap-2 rounded-full
                           bg-[#1e6cff] px-4 py-2 text-xs font-semibold text-white
                           shadow-sm shadow-[#1e6cff]/20
                           hover:bg-[#1858d6] hover:shadow-[#1e6cff]/40
                           transition-all duration-200"
              >
                <s.Icon className="h-3.5 w-3.5 shrink-0" />
                {s.titulo}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          7 SECCIONES
      ══════════════════════════════════════ */}
      {soluciones.map((sol, i) => {
        const invertida = i % 2 !== 0;
        return (
          <section
            key={sol.numero}
            id={`solucion-${sol.numero}`}
            className="relative border-t border-white/[0.05] overflow-hidden scroll-mt-20"
          >
            <div className={`flex flex-col min-h-[580px]
              ${invertida ? "lg:flex-row-reverse" : "lg:flex-row"}`}
            >

              {/* ── Imagen ──────────────────────────────── */}
              <div className="relative lg:w-[54%] h-72 lg:h-auto overflow-hidden shrink-0">
                {sol.fotoExiste ? (
                  <Image
                    src={sol.foto}
                    alt={sol.titulo}
                    fill
                    sizes="(max-width: 1024px) 100vw, 54vw"
                    quality={92}
                    className="object-cover"
                    priority={i < 2}
                    unoptimized
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, ${sol.acentoBg}25 0%, #050a18 100%)`,
                    }}
                  />
                )}

                {/* Degradado de fusión hacia el texto */}
                <div
                  className={`absolute inset-0 hidden lg:block pointer-events-none
                    ${invertida
                      ? "bg-gradient-to-l from-[#080d14] via-[#080d14]/30 to-transparent"
                      : "bg-gradient-to-r from-[#080d14] via-[#080d14]/30 to-transparent"
                    }`}
                />

              </div>

              {/* ── Texto ───────────────────────────────── */}
              <div
                className={`flex flex-col justify-center flex-1
                  px-8 py-14 lg:py-20
                  ${invertida ? "lg:pl-14 lg:pr-12" : "lg:pr-14 lg:pl-12"}
                  `}
              >
                {/* Separador de acento */}
                <div className="h-px w-10 mb-5" style={{ backgroundColor: `${sol.acento}50` }} />

                {/* Título */}
                <h2 className="font-display text-3xl lg:text-4xl font-black text-white leading-tight mb-3">
                  {sol.titulo}
                </h2>

                {/* Tagline */}
                <p className="text-sm font-semibold leading-relaxed mb-4" style={{ color: sol.acento }}>
                  {sol.tagline}
                </p>

                {/* Separador */}
                <div className="w-12 h-0.5 mb-5" style={{ backgroundColor: `${sol.acento}40` }} />

                {/* Descripción */}
                <p className="text-sm text-zinc-400 leading-relaxed mb-8 max-w-prose">
                  {sol.descripcion}
                </p>

                {/* Dos columnas — specs */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600 mb-3">
                      Recomendado para ti
                    </p>
                    <ul className="space-y-2">
                      {sol.recomendado.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-[13px] text-zinc-300">
                          <span
                            className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: sol.acento }}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600 mb-3">
                      Accesorios ideales
                    </p>
                    <ul className="space-y-2">
                      {sol.accesorios.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-[13px] text-zinc-400">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/15 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Ideal para */}
                <div className="flex items-center gap-2 mb-8">
                  <Users2 className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                  <p className="text-xs text-zinc-500 italic">{sol.idealPara}</p>
                </div>

                {/* CTA */}
                <div>
                  <Link
                    href="/asesor"
                    className="group inline-flex items-center gap-2 rounded-none
                               px-7 py-3.5 text-xs font-black uppercase tracking-wider
                               text-white transition-all duration-200
                               hover:gap-3 hover:brightness-110"
                    style={{ backgroundColor: sol.acentoBg }}
                  >
                    Cotiza ya mismo
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ══════════════════════════════════════
          CTA FINAL
      ══════════════════════════════════════ */}
      <section className="relative py-24 bg-[#060c18] border-t border-white/[0.05] overflow-hidden">
        <div className="absolute inset-0 bg-tech-grid-dark opacity-[0.12] pointer-events-none" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[500px] h-[200px] bg-[#1e6cff]/8 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#4d8dff] mb-4">
            — ¿No sabes cuál es la tuya?
          </p>
          <h2 className="font-display text-4xl sm:text-5xl font-black text-white mb-4">
            NOSOTROS TE ASESORAMOS
          </h2>
          <p className="text-zinc-400 max-w-md mx-auto mb-10 text-sm leading-relaxed">
            Cuéntanos tu caso y te recomendamos la solución exacta.
            Sin rodeos, sin tecnicismos, con entrega ágil.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/asesor"
              className="inline-flex items-center gap-2 rounded-full
                         bg-gradient-to-r from-[#128C7E] to-[#25D366]
                         px-8 py-4 text-sm font-bold text-white
                         shadow-lg shadow-[#25D366]/20
                         hover:brightness-110 hover:scale-[1.02] transition-all duration-200"
            >
              <MessageCircle className="h-4 w-4" />
              Habla con un Especialista en Tecnología
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
