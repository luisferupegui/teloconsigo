import Link from "next/link";
import { Truck, CreditCard, Shield, RotateCcw, Package, MessageCircle } from "lucide-react";

const CATEGORIAS = [
  {
    icon: Truck,
    label: "Envíos",
    color: "text-amber-500",
    bg: "bg-amber-50",
    preguntas: [
      {
        q: "¿Hacen envíos a todo el país?",
        a: "Sí, despachamos a cualquier municipio de Colombia con las principales transportadoras (Servientrega, Coordinadora, Interrapidísimo, TCC). El costo y tiempo varían según el destino.",
      },
      {
        q: "¿Cuánto tarda mi pedido?",
        a: "Medellín: 1 día hábil. Bogotá, Cali, Barranquilla: 1–3 días hábiles. Otras ciudades: 3–5 días hábiles. Los tiempos corren desde la confirmación del pago.",
      },
      {
        q: "¿Cómo rastreo mi envío?",
        a: "Una vez despachado el pedido te enviamos el número de guía al correo registrado. Puedes rastrearlo en la página de Envíos o directamente en el sitio de la transportadora.",
      },
      {
        q: "¿Cuánto cuesta el envío?",
        a: "El valor del envío depende del peso, dimensiones del paquete y ciudad de destino. Lo verás calculado antes de confirmar tu compra.",
      },
    ],
  },
  {
    icon: CreditCard,
    label: "Pagos",
    color: "text-violet-500",
    bg: "bg-violet-50",
    preguntas: [
      {
        q: "¿Qué métodos de pago aceptan?",
        a: "Aceptamos tarjetas Visa y Mastercard (débito y crédito), PSE, Bancolombia y efectivo en puntos habilitados, todo procesado de forma segura a través de ePayco.",
      },
      {
        q: "¿Puedo pagar en cuotas?",
        a: "Sí, con tarjetas de crédito puedes diferir tu compra en cuotas según las condiciones de tu banco, sin recargo por parte nuestra. El número de cuotas disponibles depende de tu entidad bancaria.",
      },
      {
        q: "¿Es seguro pagar en teloconsigo.co?",
        a: "Sí. Usamos ePayco, plataforma certificada PCI-DSS. Nunca almacenamos datos de tu tarjeta en nuestros servidores.",
      },
      {
        q: "¿Cuándo se hace efectivo el cobro?",
        a: "El cobro se realiza al momento de confirmar la compra. Si el pago es por PSE o efectivo y no se completa en 24 horas, el pedido se cancela automáticamente.",
      },
    ],
  },
  {
    icon: Shield,
    label: "Garantía",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    preguntas: [
      {
        q: "¿Los productos tienen garantía?",
        a: "Sí, todos los productos cuentan con garantía oficial del fabricante. Portátiles y componentes: 12 meses. Periféricos: 6 meses. Accesorios: 3 meses.",
      },
      {
        q: "¿Cómo reclamo la garantía?",
        a: "Ingresa a la sección Garantía, escribe tu número de pedido y contáctanos por WhatsApp o correo a soporte@teloconsigo.co. Nuestro equipo evaluará el caso en 3 días hábiles.",
      },
      {
        q: "¿Qué cubre la garantía?",
        a: "Cubre defectos de fabricación bajo uso normal. No cubre daños por golpes, humedad, mal uso, modificaciones no autorizadas ni desgaste natural.",
      },
      {
        q: "¿El producto tiene garantía de fábrica o de teloconsigo?",
        a: "Ofrecemos garantía oficial del fabricante. En casos donde la marca tenga centro de servicio en Colombia, el trámite puede hacerse directamente o con nuestra asistencia.",
      },
    ],
  },
  {
    icon: RotateCcw,
    label: "Devoluciones",
    color: "text-rose-500",
    bg: "bg-rose-50",
    preguntas: [
      {
        q: "¿Puedo devolver un producto?",
        a: "Sí, dentro de los primeros 15 días hábiles desde la recepción del pedido, siempre que el producto esté en su empaque original y sin uso.",
      },
      {
        q: "¿Cómo tramito una devolución?",
        a: "Ve a la sección Devoluciones, llena el formulario con tu número de pedido y el motivo. Te contactaremos en 24 horas con las instrucciones para enviar el producto.",
      },
      {
        q: "¿Cuánto tarda el reembolso?",
        a: "Una vez recibido e inspeccionado el producto, procesamos el reembolso en 5–10 días hábiles. El tiempo de acreditación depende de tu banco o plataforma de pago.",
      },
      {
        q: "¿Qué productos no tienen devolución?",
        a: "Productos con sellos de seguridad abiertos, software activado, consumibles usados o productos personalizados no aplican para devolución, salvo defecto de fábrica.",
      },
    ],
  },
  {
    icon: Package,
    label: "Productos",
    color: "text-[#1e6cff]",
    bg: "bg-blue-50",
    preguntas: [
      {
        q: "¿Los productos son originales?",
        a: "Sí, 100% originales con garantía de fábrica. Trabajamos únicamente con distribuidores y mayoristas autorizados.",
      },
      {
        q: "¿Puedo pedir un producto que no está en el catálogo?",
        a: "¡Claro! Ese es precisamente nuestro servicio 'Cotiza Ya Mismo'. Dinos qué necesitas y lo conseguimos con las mejores condiciones del mercado.",
      },
      {
        q: "¿Tienen los productos en stock?",
        a: "La mayoría de los productos del catálogo están disponibles de inmediato. Algunos equipos especializados pueden requerir 3–7 días adicionales para gestión. Te informamos al momento de cotizar.",
      },
      {
        q: "¿Puedo comparar productos antes de comprar?",
        a: "Sí, usa el Comparador de productos disponible en el catálogo. También puedes pedirle asesoría personalizada a nuestro asistente IA o escribirnos directamente.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="bg-zinc-50 min-h-screen">

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0d1e3a] via-[#13294b] to-[#1e6cff] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(125,200,255,0.18),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <nav className="text-xs text-zinc-300 mb-3">
            <Link href="/" className="hover:underline">Inicio</Link>
            <span className="mx-2">/</span>
            <span>Preguntas frecuentes</span>
          </nav>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Preguntas frecuentes</h1>
          <p className="mt-3 max-w-xl text-zinc-200">
            Encuentra respuestas rápidas sobre envíos, pagos, garantías y más.
          </p>
        </div>
      </section>

      {/* Categorías nav */}
      <div className="sticky top-0 z-20 bg-white border-b border-zinc-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            {CATEGORIAS.map(({ label, icon: Icon, color }) => (
              <a key={label} href={`#${label.toLowerCase()}`}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Preguntas */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        {CATEGORIAS.map(({ label, icon: Icon, color, bg, preguntas }) => (
          <div key={label} id={label.toLowerCase()}>
            <div className={`inline-flex items-center gap-2 rounded-full ${bg} px-3 py-1 mb-4`}>
              <Icon className={`h-4 w-4 ${color}`} />
              <span className={`text-xs font-bold ${color}`}>{label}</span>
            </div>
            <div className="space-y-3">
              {preguntas.map(({ q, a }) => (
                <details key={q} className="group rounded-xl border border-zinc-200 bg-white shadow-sm open:border-[#1e6cff] open:shadow-md transition-all">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 font-semibold text-zinc-900 text-sm marker:content-none list-none">
                    {q}
                    <span className="ml-auto shrink-0 text-zinc-400 group-open:rotate-180 transition-transform duration-200">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-zinc-600 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="bg-white border-t border-zinc-200">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-xl font-bold text-zinc-900">¿No encontraste tu respuesta?</h2>
          <p className="mt-2 text-sm text-zinc-600">Nuestro equipo te responde en minutos.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a href="https://wa.me/573102878194" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition">
              <MessageCircle className="h-4 w-4" /> Escribir por WhatsApp
            </a>
            <Link href="/contacto"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition">
              Ir a Contacto
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
