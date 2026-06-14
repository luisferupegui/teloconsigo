import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  loadSettings,
  saveSettings,
  getAnthropicApiKey,
  getKeySource,
  getSerperApiKey,
  getSerperKeySource,
  maskKey,
} from "@/lib/settings";
import { validateSerperKey } from "@/lib/serper";

export const dynamic = "force-dynamic";

// Valida la clave con una llamada que NO consume tokens (lista de modelos).
async function validateKey(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const client = new Anthropic({ apiKey: key });
    await client.models.list({ limit: 1 });
    return { valid: true };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { valid: false, error: "La clave fue rechazada por Anthropic (401). Revísala." };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: msg };
  }
}

function status() {
  const key = getAnthropicApiKey();
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

    // ── Key de Anthropic ──
    const incoming = (body.apiKey ?? "").trim();
    const settings = loadSettings();
    if (incoming === "") {
      // Cadena vacía = borrar la clave del panel (volverá a usar la del entorno si existe).
      delete settings.anthropicApiKey;
    } else {
      settings.anthropicApiKey = incoming;
    }
    saveSettings(settings);

    const effective = getAnthropicApiKey();
    if (!effective) {
      return NextResponse.json({ ...status(), ok: true, valid: false, error: "No hay ninguna clave configurada." });
    }

    const { valid, error } = await validateKey(effective);
    return NextResponse.json({ ...status(), ok: true, valid, error });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Error al guardar ajustes: ${msg}` }, { status: 500 });
  }
}
