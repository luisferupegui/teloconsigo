import { NextRequest, NextResponse } from "next/server";
import { loadLists, saveLists } from "@/lib/supplier-catalog";
import { contarIncompletos, proponer, aplicar, type Propuesta } from "@/lib/completar-fichas";
import { getDeepseekApiKey, getSerperApiKey } from "@/lib/settings";
import { DeepSeek } from "@/lib/deepseek";

export const dynamic = "force-dynamic";
// Consultar 40 modelos en serie lleva su tiempo: se le da margen para terminar.
export const maxDuration = 300;

// GET — cuántas fichas están incompletas. NO consulta internet: es gratis.
export async function GET() {
  return NextResponse.json({ incompletos: contarIncompletos(loadLists()) });
}

// POST — sin cuerpo: consulta internet y devuelve lo encontrado SIN guardar.
//        con { propuestas }: guarda esas propuestas ya confirmadas.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { propuestas?: Propuesta[] };

    if (Array.isArray(body.propuestas)) {
      const { listas, aplicadas } = aplicar(loadLists(), body.propuestas);
      saveLists(listas);
      console.warn(`[fichas] ${aplicadas} ficha(s) completada(s)`);
      return NextResponse.json({ ok: true, aplicadas });
    }

    const serperKey = getSerperApiKey();
    if (!serperKey) {
      return NextResponse.json({ error: "Falta la clave de Serper: sin ella no se puede consultar internet." }, { status: 400 });
    }
    const deepseekKey = getDeepseekApiKey();
    if (!deepseekKey) {
      return NextResponse.json({ error: "Falta la clave de DeepSeek: sin ella no se pueden leer los resultados." }, { status: 400 });
    }

    const ds = new DeepSeek({ apiKey: deepseekKey, maxRetries: 2 });
    const r = await proponer(ds, loadLists(), serperKey);
    console.warn(`[fichas] ${r.consultados} consultado(s) → ${r.propuestas.length} con datos, ${r.pendientes} pendiente(s)`);
    return NextResponse.json(r);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `No se pudieron completar las fichas: ${msg}` }, { status: 500 });
  }
}
