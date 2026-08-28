"use client";

import { useEffect } from "react";

// ─── WebMCP: herramientas del sitio para un agente en el navegador ───────────
//
// Cuando el visitante usa un navegador con un agente de IA integrado, este
// componente le entrega las acciones del sitio como herramientas con esquema,
// en vez de obligarlo a adivinar leyendo el HTML.
//
// SOLO LECTURA, a propósito. No se expone nada que gaste dinero o que actúe en
// nombre del negocio: consultar a Andrea consume la cuota de DeepSeek y Serper
// en cada llamada, y el formulario de "te lo conseguimos" manda un correo al
// equipo. Un agente puede consultar el catálogo; pedir y cotizar sigue siendo
// cosa de una persona.
//
// La API es `navigator.modelContext`, todavía en prueba de origen en Chrome. Si
// no existe, este componente no hace absolutamente nada.

type ToolResult = { content: { type: "text"; text: string }[] };
type ModelContext = {
  provideContext: (ctx: {
    tools: {
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
      execute: (args: Record<string, unknown>) => Promise<ToolResult>;
    }[];
  }) => void;
};

type ProductoPublico = {
  nombre: string; marca: string; categoria: string;
  precio: number | null; precioDesde: number | null;
  url?: string; referencia?: string;
};

const cop = (n: number) => "$" + n.toLocaleString("es-CO") + " COP";
const texto = (t: string): ToolResult => ({ content: [{ type: "text", text: t }] });

export function WebMcpTools() {
  useEffect(() => {
    const mc = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!mc?.provideContext) return;

    const fichas = (ps: ProductoPublico[]) =>
      ps.map((p) => {
        const precio = p.precioDesde ?? p.precio;
        return `- ${p.nombre} (${p.marca})${precio ? ` — ${cop(precio)}` : ""}` +
               `${p.url ? `\n  ${new URL(p.url, location.origin).href}` : ""}`;
      }).join("\n");

    try {
      mc.provideContext({
        tools: [
          {
            name: "buscar_productos",
            description:
              "Busca en el catálogo publicado de teloconsigo.co por nombre, marca o tipo de producto. " +
              "Devuelve los productos que coinciden con su precio en pesos colombianos y el enlace a su ficha.",
            inputSchema: {
              type: "object",
              properties: {
                consulta: { type: "string", description: "Qué buscar. Ej: 'portátil lenovo', 'monitor 24', 'morral'." },
                limite: { type: "integer", description: "Máximo de resultados (por defecto 10).", minimum: 1, maximum: 30 },
              },
              required: ["consulta"],
            },
            async execute({ consulta, limite }) {
              const q = String(consulta ?? "").toLowerCase().trim();
              if (!q) return texto("Indica qué producto buscar.");
              const res = await fetch("/api/business-products");
              if (!res.ok) return texto("No se pudo consultar el catálogo en este momento.");
              const todos = (await res.json()) as ProductoPublico[];
              const terminos = q.split(/\s+/);
              const hallados = todos.filter((p) => {
                const h = `${p.nombre} ${p.marca} ${p.categoria}`.toLowerCase();
                return terminos.every((t) => h.includes(t));
              }).slice(0, Math.min(Number(limite) || 10, 30));

              return texto(
                hallados.length === 0
                  ? `No hay nada publicado que coincida con "${consulta}". La tienda consigue productos fuera de catálogo: ${location.origin}/conseguir`
                  : `${hallados.length} producto(s) en teloconsigo.co para "${consulta}":\n\n${fichas(hallados)}`,
              );
            },
          },
          {
            name: "ver_categorias",
            description:
              "Lista las categorías del catálogo de teloconsigo.co con el enlace a cada una. " +
              "Útil para saber qué tipos de tecnología vende la tienda.",
            inputSchema: { type: "object", properties: {} },
            async execute() {
              const res = await fetch("/.well-known/ai-catalog.json");
              if (!res.ok) return texto("No se pudo consultar el catálogo.");
              const md = await fetch("/tienda", { headers: { Accept: "text/markdown" } });
              return texto(md.ok ? await md.text() : "Catálogo disponible en " + location.origin + "/tienda");
            },
          },
        ],
      });
    } catch {
      // Un navegador con la API a medias no debe romper la página.
    }
  }, []);

  return null;
}
