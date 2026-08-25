import { NextRequest, NextResponse } from "next/server";
import {
  loadSettings,
  saveSettings,
  getDeepseekApiKey,
  getKeySource,
  getSerperApiKey,
  getSerperKeySource,
  maskKey,
} from "@/lib/settings";
import { validateDeepseekKey } from "@/lib/deepseek";
import { validateSerperKey } from "@/lib/serper";

export const dynamic = "force-dynamic";

function status() {
  const key = getDeepseekApiKey();
  const serper = getSerperApiKey();
  return {
    hasKey: !!key,
    masked: key ? maskKey(key) : null,
    source: getKeySource(),
    hasSerperKey: !!serper,
    serperMasked: serper ? maskKey(serper) : null,
    serperSource: getSerperKeySource(),
  };
}

export async function GET() {
  return NextResponse.json(status());
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { apiKey?: string; serperApiKey?: string };

    // ── Key de Serper ──
    if (body.serperApiKey !== undefined) {
      const incoming = body.serperApiKey.trim();
      const settings = loadSettings();
      if (incoming === "") delete settings.serperApiKey;
      else settings.serperApiKey = incoming;
      saveSettings(settings);

      const effective = getSerperApiKey();
      if (!effective) {
        return NextResponse.json({ ...status(), ok: true, valid: false, error: "No hay key de Serper configurada." });
      }
      const { valid, error } = await validateSerperKey(effective);
      return NextResponse.json({ ...status(), ok: true, valid, error });
    }

    // ── Key de DeepSeek (cerebro de Andrea) ──
    const incoming = (body.apiKey ?? "").trim();
    const settings = loadSettings();
    // Migración: la clave de Anthropic ya no se usa en ningún flujo → se descarta.
    delete settings.anthropicApiKey;
    if (incoming === "") {
      // Cadena vacía = borrar la clave del panel (volverá a usar la del entorno si existe).
      delete settings.deepseekApiKey;
    } else {
      settings.deepseekApiKey = incoming;
    }
    saveSettings(settings);

    const effective = getDeepseekApiKey();
    if (!effective) {
      return NextResponse.json({ ...status(), ok: true, valid: false, error: "No hay ninguna clave configurada." });
    }

    const { valid, error } = await validateDeepseekKey(effective);
    return NextResponse.json({ ...status(), ok: true, valid, error });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Error al guardar ajustes: ${msg}` }, { status: 500 });
  }
}
