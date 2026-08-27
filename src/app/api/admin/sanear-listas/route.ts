import { NextResponse } from "next/server";
import { loadLists, saveLists } from "@/lib/supplier-catalog";
import { diagnosticar, sanear } from "@/lib/sanear-listas";

export const dynamic = "force-dynamic";

// GET — vista previa: qué se corregiría, sin tocar nada.
export async function GET() {
  const { descartados, recategorizados } = diagnosticar(loadLists());
  return NextResponse.json({
    descartados: descartados.length,
    recategorizados: recategorizados.length,
    ejemplos: [...descartados.slice(0, 5), ...recategorizados.slice(0, 5)],
  });
}

// POST — aplica las correcciones. `saveLists` deja copia del estado anterior en
// supplier-lists.json.bak, así que hay marcha atrás desde "Restaurar listas".
export async function POST() {
  try {
    const { listas, diagnostico } = sanear(loadLists());
    const total = diagnostico.descartados.length + diagnostico.recategorizados.length;

    if (total === 0) {
      return NextResponse.json({ ok: true, aplicado: false, descartados: 0, recategorizados: 0 });
    }

    saveLists(listas);
    console.warn(
      `[sanear] ${diagnostico.descartados.length} equipo(s) descartado(s) y ` +
      `${diagnostico.recategorizados.length} producto(s) recategorizado(s)`,
    );

    return NextResponse.json({
      ok: true,
      aplicado: true,
      descartados: diagnostico.descartados.length,
      recategorizados: diagnostico.recategorizados.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `No se pudo sanear: ${msg}` }, { status: 500 });
  }
}
