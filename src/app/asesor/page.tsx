"use client";

import Link from "next/link";
import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const seedQuestions = [
  "Quiero armar un PC gamer 1440p con ~5M",
  "¿Qué fuente necesito para una RTX 4070?",
  "Recomiéndame una memoria DDR5 económica",
  "Comparar Ryzen 7 vs Intel i7 para edición de video",
];

const respuestas: Record<string, string> = {
  default:
    "¡Hola! Soy el Asesor IA de Te lo Consigo. Cuéntame qué necesitas armar o resolver y te recomiendo partes 100% compatibles con base en nuestro catálogo. Recuerda: la compatibilidad la valido con reglas deterministas, no la invento.",
  gamer:
    "Con ~5M para gaming 1440p te recomendaría:\n\n• AMD Ryzen 5 7600 o Ryzen 7 7800X3D\n• RTX 4070 SUPER (12GB)\n• 32 GB DDR5 6000MHz CL30\n• SSD NVMe 1TB Gen4\n• Fuente 750W 80+ Gold\n\n✓ Todas las partes son compatibles entre sí. ¿Quieres que arme el carrito?",
  fuente:
    "Para una RTX 4070 SUPER el consumo es ~220W. Recomendación segura: PSU 750W 80+ Gold. Si planeas overclock o un CPU exigente, sube a 850W. La Corsair RM850x que tenemos cumple con creces.",
  ddr5:
    "Te recomiendo Corsair Vengeance 32GB DDR5 6000MHz CL30. Perfil EXPO/XMP, ideal para plataforma AM5 (Ryzen 7000). Hoy está a $589.000 con 15% de descuento.",
  ryzen:
    "Para edición de video 4K: Ryzen 7 7800X3D gana en producción liviana y gaming; Intel i7-14700K gana en exportación pesada por más núcleos E. Si renderizas mucho, escoge Intel; si combinas edición + gaming, AMD.",
};

function pickAnswer(text: string) {
  const t = text.toLowerCase();
  if (t.includes("gamer") || t.includes("gaming") || t.includes("1440"))
    return respuestas.gamer;
  if (t.includes("fuente") || t.includes("psu") || t.includes("vatios"))
    return respuestas.fuente;
  if (t.includes("ddr5") || t.includes("memoria") || t.includes("ram"))
    return respuestas.ddr5;
  if (t.includes("ryzen") || t.includes("intel") || t.includes("comparar"))
    return respuestas.ryzen;
  return "Anotado. Voy a buscar opciones en nuestro catálogo y a verificar compatibilidades. (Demo) — en producción esta consulta llamará a Claude AI con herramientas deterministas.";
}

export default function AsesorPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: respuestas.default },
  ]);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "user", content: text },
      { role: "assistant", content: pickAnswer(text) },
    ]);
    setInput("");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="text-xs text-zinc-500 mb-3">
        <Link href="/" className="hover:underline">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <span>Asesor IA</span>
      </nav>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1e6cff] text-2xl text-white">
          🤖
        </span>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Asesor IA</h1>
          <p className="text-sm text-zinc-600">
            Compatibilidad determinista + recomendaciones con IA
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-6 min-h-[440px]">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "ml-auto rounded-tr-sm bg-[#1e6cff] text-white"
                  : "mr-auto rounded-tl-sm bg-zinc-100 text-zinc-900"
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-200 p-3">
          <div className="mb-2 flex flex-wrap gap-2">
            {seedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs hover:border-[#1e6cff] hover:bg-blue-50"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escríbele al Asesor IA…"
              className="flex-1 rounded-full border border-zinc-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e6cff]"
            />
            <button
              type="submit"
              className="rounded-full bg-[#1e6cff] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#1858d6]"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        ⚠️ Demo. En producción el Asesor llama a Claude AI con búsqueda
        híbrida (full-text + pgvector) y verificación determinista de
        compatibilidad.
      </p>
    </div>
  );
}
