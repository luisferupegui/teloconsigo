"use client";

import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Msg = { role: "user" | "assistant"; content: string };

// ─── Preguntas sugeridas ───────────────────────────────────────────────────────

const SEED_GENERAL = [
  "¿Qué portátil recomiendas para una oficina de 5 personas?",
  "Necesito equipar un consultorio médico",
  "¿Cuáles son las formas de pago disponibles?",
  "¿Cuánto tarda la entrega en Medellín?",
];

const SEED_PRODUCTO = (nombre: string) => [
  `¿Cuál es el precio final de ${nombre}?`,
  "¿Cuánto tarda la entrega?",
  "¿Qué formas de pago aceptan?",
  "¿Tiene garantía? ¿Qué cubre?",
];

// ─── Intro cuando viene desde una card de producto ────────────────────────────

function buildProductoIntro(nombre: string, ref: string, precio: string): string {
  const precioFmt = precio
    ? `$${Number(precio).toLocaleString("es-CO")}`
    : "precio a confirmar";
  return `¡Hola! Veo que te interesa el **${nombre}**${ref ? ` (Ref: ${ref})` : ""}.\n\nEl precio de venta parte desde **${precioFmt}**.\n\nPuedo ayudarte con:\n• ✅ Confirmación de precio final y descuentos por volumen\n• 🚚 Tiempo de entrega según tu ciudad\n• 💳 Formas de pago (PSE, tarjeta, transferencia, crédito empresarial)\n• 📦 Disponibilidad en stock\n• 🛡️ Información de garantía\n\n¿Por dónde empezamos?`;
}

// ─── Motor de respuestas (demo) ───────────────────────────────────────────────

function pickAnswer(text: string, productoCtx?: string): string {
  const t = text.toLowerCase();

  if (t.includes("precio") || t.includes("final") || t.includes("descuento") || t.includes("cotiz")) {
    if (productoCtx) {
      return `El precio mostrado en catálogo ya incluye nuestro margen de servicio. Para **${productoCtx}** puedo solicitar confirmación al mayorista ahora mismo.\n\nSi compras 3 o más unidades aplicamos 3–5% de descuento adicional.\n\n¿Quieres que genere la cotización formal en PDF para tu empresa?`;
    }
    return "Claro, el precio varía según el equipo y la cantidad. Compras de 3+ unidades tienen descuento de 3–5%.\n\n¿Sobre qué producto necesitas la cotización?";
  }

  if (t.includes("entrega") || t.includes("envío") || t.includes("demora") || t.includes("días") || t.includes("tiempo")) {
    return "Tiempos estimados de entrega:\n\n• 📍 **Medellín y Bogotá:** 1–2 días hábiles\n• 📍 **Otras ciudades principales:** 2–3 días hábiles\n• 📍 **Municipios:** 3–5 días hábiles\n\nEquipos bajo pedido pueden tardar 3–5 días adicionales según disponibilidad del mayorista.\n\n¿Cuál es tu ciudad?";
  }

  if (t.includes("pago") || t.includes("cuota") || t.includes("crédito") || t.includes("factura") || t.includes("forma")) {
    return "Formas de pago disponibles:\n\n• 💳 **Tarjeta crédito/débito** (hasta 24 cuotas con algunas entidades)\n• 🏦 **PSE / Transferencia bancaria**\n• 🏢 **Crédito empresarial** (sujeto a aprobación, cupo hasta $50M)\n• 📄 **Factura a 30 días** para empresas con contrato\n\n¿Cuál te conviene más?";
  }

  if (t.includes("garantía") || t.includes("garantia") || t.includes("soporte") || t.includes("falla")) {
    return "Todos los equipos tienen garantía del fabricante (mínimo 1 año). Además:\n\n• 🛡️ **Garantía extendida** hasta 3 años disponible\n• 🔄 **Cambio por defecto de fábrica** en los primeros 30 días\n• 📞 **Soporte postventa** — te acompañamos con el proceso ante el fabricante\n\n¿Tienes una inquietud específica sobre garantía?";
  }

  if (t.includes("stock") || t.includes("disponib") || t.includes("hay") || t.includes("tienen")) {
    return "Trabajamos bajo pedido con múltiples mayoristas, lo que nos permite confirmar disponibilidad en tiempo real. La mayoría de equipos corporativos tienen stock para entrega inmediata.\n\n¿Quieres que verifique disponibilidad del equipo específico que te interesa?";
  }

  if (t.includes("consultorio") || t.includes("clínica") || t.includes("médico") || t.includes("salud")) {
    return "Para consultorio médico te recomendaría:\n\n• 💻 **PC AIO o portátil** — historia clínica y gestión de citas\n• 🖥️ **Monitor 24\"** — lectura de imágenes diagnósticas\n• 🖨️ **Impresora láser** — recetas y reportes\n• 📱 **Tablet** — movilidad dentro del consultorio\n\nSetup básico para 1 médico desde **$4.500.000** aprox.\n\n¿Cuántos puestos necesitas?";
  }

  if (t.includes("oficina") || t.includes("empresa") || t.includes("personas") || t.includes("equip")) {
    return "Para equipar una oficina te recomiendo:\n\n• 💼 **Portátiles corporativos** (Lenovo V14, Dell Pro 15 o similar)\n• 🖥️ **Monitores 24\"** para mayor productividad\n• ⌨️ **Combos teclado + mouse inalámbrico**\n• 🔑 **Licencias Windows 11 Pro + Microsoft 365**\n\nSetup completo desde **~$4.600.000 por puesto** (portátil + monitor + accesorios + licencias).\n\n¿Cuántos puestos necesitas?";
  }

  if (productoCtx) {
    return `Entendido. Para **${productoCtx}** voy a consultar disponibilidad y confirmar el precio exacto con el mayorista.\n\nEn producción, esta respuesta llega en segundos con datos en tiempo real. ¿Necesitas algo más sobre este equipo?`;
  }

  return "Entendido. ¿Puedes darme más detalles? Por ejemplo:\n\n• Tipo de uso (oficina, diseño, ventas en campo…)\n• Presupuesto aproximado\n• Cantidad de equipos\n\nCon eso te armo una propuesta concreta.";
}

// ─── Componente interno con useSearchParams ────────────────────────────────────

function AsesorContent() {
  const searchParams = useSearchParams();
  const producto = searchParams.get("producto") ?? "";
  const ref      = searchParams.get("ref") ?? "";
  const precio   = searchParams.get("precio") ?? "";
  const hasProducto = producto.length > 0;

  const [messages, setMessages] = useState<Msg[]>(() => [
    {
      role: "assistant",
      content: hasProducto
        ? buildProductoIntro(producto, ref, precio)
        : "¡Hola! Soy el Asesor IA de teloconsigo.co.\n\nEstoy aquí para ayudarte a cotizar equipos corporativos, confirmar precios, tiempos de entrega y formas de pago.\n\n¿Qué necesitas hoy?",
    },
  ]);

  const [input, setInput]   = useState("");
  const bottomRef            = useRef<HTMLDivElement>(null);
  const seedQuestions        = hasProducto ? SEED_PRODUCTO(producto) : SEED_GENERAL;

  const send = (text: string) => {
    if (!text.trim()) return;
    const answer = pickAnswer(text, hasProducto ? producto : undefined);
    setMessages((m) => [
      ...m,
      { role: "user",      content: text   },
      { role: "assistant", content: answer },
    ]);
    setInput("");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">

      {/* Breadcrumb */}
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:underline">Inicio</Link>
        <span className="mx-2">/</span>
        {hasProducto && (
          <>
            <Link href="/soluciones" className="hover:underline">
              Soluciones Tecnológicas
            </Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span>Asesor IA</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1e6cff] text-2xl text-white shadow-md shadow-blue-200">
          🤖
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-zinc-900">Asesor IA</h1>
          <p className="text-sm text-zinc-500 truncate">
            {hasProducto
              ? `Cotizando: ${producto}`
              : "Cotizaciones · Precios · Entregas · Formas de pago"}
          </p>
        </div>
        {hasProducto && (
          <Link
            href="/soluciones"
            className="shrink-0 text-xs font-medium text-[#1e6cff] hover:underline"
          >
            ← Ver más productos
          </Link>
        )}
      </div>

      {/* Banner del producto si viene desde una card */}
      {hasProducto && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <span className="text-base mt-0.5">📋</span>
          <div className="text-xs text-blue-800 leading-relaxed">
            <span className="font-semibold">Producto seleccionado: </span>
            {producto}
            {ref   && <span className="text-blue-600 ml-2">· Ref: {ref}</span>}
            {precio && (
              <span className="font-semibold ml-2">
                · Desde ${Number(precio).toLocaleString("es-CO")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Ventana de chat */}
      <div className="flex flex-col rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">

        {/* Mensajes */}
        <div className="flex flex-col gap-3 overflow-y-auto p-6 min-h-[400px] max-h-[480px]">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto rounded-tr-sm bg-[#1e6cff] text-white"
                  : "mr-auto rounded-tl-sm bg-zinc-100 text-zinc-900"
              }`}
            >
              {m.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Sugerencias + campo de texto */}
        <div className="border-t border-zinc-200 p-4 space-y-3 bg-zinc-50/50">
          <div className="flex flex-wrap gap-2">
            {seedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:border-[#1e6cff] hover:bg-blue-50 hover:text-blue-700 transition"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                hasProducto
                  ? `Pregunta sobre ${producto}…`
                  : "¿Qué necesitas cotizar?"
              }
              className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e6cff]"
            />
            <button
              type="submit"
              className="rounded-full bg-[#1e6cff] px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-400 text-center leading-relaxed">
        ⚠️ Demo. En producción el Asesor IA consulta precios y disponibilidad
        en tiempo real con nuestros mayoristas.
      </p>
    </div>
  );
}

// ─── Page — Suspense requerido por useSearchParams ────────────────────────────

export default function AsesorPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-20 text-center text-zinc-400">
          Cargando asesor…
        </div>
      }
    >
      <AsesorContent />
    </Suspense>
  );
}
