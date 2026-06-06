import "server-only";
import fs from "fs";
import path from "path";

// Ajustes del panel admin. Se guardan en data/settings.json (ignorado por git
// porque contiene la clave API). La clave puede venir del panel o del entorno.

export type Settings = {
  anthropicApiKey?: string;
  // Dominios donde el buscador web tiene permitido buscar (ej: "mercadolibre.com.co").
  webSearchSites?: string[];
};

const SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");

// Marcadores de posición que NO son claves reales (vienen de .env.example).
const PLACEHOLDERS = new Set([
  "PEGA_AQUI_TU_API_KEY",
  "tu-api-key-aqui",
  "sk-ant-xxxxx",
]);

function isRealKey(value: string | undefined | null): value is string {
  const v = value?.trim();
  return !!v && !PLACEHOLDERS.has(v);
}

export function loadSettings(): Settings {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8")) as Settings;
  } catch {
    return {};
  }
}

export function saveSettings(settings: Settings): void {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");
}

/** Clave API efectiva: primero la del panel, si no la del entorno. `null` si
 *  no hay ninguna válida (ignora los marcadores de posición de .env.example). */
export function getAnthropicApiKey(): string | null {
  const fromPanel = loadSettings().anthropicApiKey;
  if (isRealKey(fromPanel)) return fromPanel.trim();

  const fromEnv = process.env.ANTHROPIC_API_KEY;
  if (isRealKey(fromEnv)) return fromEnv.trim();

  return null;
}

/** De dónde proviene la clave activa, para mostrarlo en el panel. */
export function getKeySource(): "panel" | "env" | null {
  if (isRealKey(loadSettings().anthropicApiKey)) return "panel";
  if (isRealKey(process.env.ANTHROPIC_API_KEY)) return "env";
  return null;
}

/** Versión enmascarada para mostrar sin exponer la clave completa. */
export function maskKey(key: string): string {
  const k = key.trim();
  if (k.length <= 12) return "••••••••";
  return `${k.slice(0, 8)}…${k.slice(-4)}`;
}

// ─── Sitios del buscador web ──────────────────────────────────────────────────

export function loadWebSearchSites(): string[] {
  const s = loadSettings().webSearchSites;
  return Array.isArray(s) ? s : [];
}

export function saveWebSearchSites(sites: string[]): void {
  const settings = loadSettings();
  settings.webSearchSites = sites;
  saveSettings(settings);
}
