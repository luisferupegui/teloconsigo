import { NextRequest } from "next/server";

const BRAND_COLORS: Record<string, string> = {
  intel: "#0071C5",
  amd: "#ED1C24",
  nvidia: "#76B900",
  asus: "#00A2E8",
  rog: "#FF0033",
  msi: "#FF0000",
  gigabyte: "#B4096B",
  asrock: "#003D7A",
  lenovo: "#E2231A",
  hp: "#0096D6",
  acer: "#83B81A",
  dell: "#007DB8",
  microsoft: "#737373",
  apple: "#1D1D1F",
  kingston: "#C8202F",
  adata: "#D71920",
  corsair: "#F5C518",
  xpg: "#B83227",
  thermaltake: "#E60012",
  "cooler master": "#7B25BA",
  coolermaster: "#7B25BA",
  seasonic: "#003F8C",
  viewsonic: "#C8102E",
  aoc: "#D70022",
  lg: "#A50034",
  samsung: "#1428A0",
  artic: "#0099D8",
  arctic: "#0099D8",
  deepcool: "#1B75BB",
  alienware: "#1F1F1F",
  "tp-link": "#4ACBD6",
  tplink: "#4ACBD6",
  netgear: "#000000",
  linksys: "#000000",
  "d-link": "#003DA6",
  dlink: "#003DA6",
  logitech: "#00B8FC",
  genius: "#E60000",
  sennheiser: "#003C71",
  jbl: "#FF6600",
  "audio-technica": "#1B1B1B",
  audiotechnica: "#1B1B1B",
  bose: "#000000",
  sonos: "#000000",
  shure: "#0072CE",
  elgato: "#0096D7",
  rode: "#E30613",
  razer: "#00FF00",
  redragon: "#E60012",
  wd: "#0046AD",
  seagate: "#7AB800",
  sandisk: "#E30613",
  apc: "#3DAE2B",
  targus: "#000000",
  ergo: "#3B82F6",
  anker: "#00A0E9",
  belkin: "#00529C",
  epson: "#003399",
  canon: "#BC0024",
  brother: "#0096D7",
  kyocera: "#DA1F26",
};

const CAT_ACCENTS: Record<string, string> = {
  procesadores: "#1e6cff",
  portatiles: "#7e4dff",
  motherboards: "#06b6d4",
  "memoria-ram": "#10b981",
  "tarjetas-graficas": "#22c55e",
  "fuentes-de-poder": "#f59e0b",
  monitores: "#3b82f6",
  refrigeracion: "#0ea5e9",
  "equipos-escritorio": "#8b5cf6",
  redes: "#14b8a6",
  "mouse-pad": "#ec4899",
  "auriculares-audio": "#f43f5e",
  "kits-streaming": "#a855f7",
  almacenamiento: "#0891b2",
  proteccion: "#eab308",
  accesorios: "#f59e0b",
  teclados: "#6366f1",
  impresoras: "#ef4444",
};

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!),
  );
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length <= maxChars) {
      cur = (cur + " " + w).trim();
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const brand = searchParams.get("brand") ?? "Brand";
  const model = searchParams.get("model") ?? "Product";
  const cat = searchParams.get("cat") ?? "";

  const brandKey = brand.toLowerCase().trim();
  const brandColor = BRAND_COLORS[brandKey] ?? "#1e6cff";
  const accent = CAT_ACCENTS[cat] ?? "#1e6cff";

  const lines = wrapText(model, 18);
  const lineH = 58;
  const startY = 440 - ((lines.length - 1) * lineH) / 2;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fafbfc"/>
      <stop offset="100%" stop-color="#eef2f8"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="${accent}" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="800" height="800" fill="url(#bg)"/>
  <rect width="800" height="800" fill="url(#grid)"/>
  <rect width="800" height="800" fill="url(#glow)"/>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="800" height="6" fill="${accent}"/>

  <!-- Brand pill -->
  <rect x="60" y="80" rx="28" ry="28" width="${brand.length * 22 + 80}" height="56"
        fill="${brandColor}" fill-opacity="0.10" stroke="${brandColor}" stroke-opacity="0.25" stroke-width="1.5"/>
  <text x="${60 + (brand.length * 22 + 80) / 2}" y="116"
        text-anchor="middle" font-family="system-ui, -apple-system, sans-serif"
        font-size="26" font-weight="800" fill="${brandColor}" letter-spacing="2">
    ${escapeXml(brand.toUpperCase())}
  </text>

  <!-- Model -->
  ${lines
    .map(
      (l, i) =>
        `<text x="400" y="${startY + i * lineH}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="46" font-weight="700" fill="#0d1e3a">${escapeXml(l)}</text>`,
    )
    .join("\n  ")}

  <!-- Decorative geometric shape (bottom right) -->
  <g opacity="0.08" transform="translate(620,620)">
    <circle r="120" fill="${accent}"/>
    <circle r="80" fill="none" stroke="${accent}" stroke-width="2"/>
    <circle r="40" fill="${accent}"/>
  </g>

  <!-- Bottom watermark -->
  <text x="400" y="740" text-anchor="middle" font-family="system-ui, sans-serif"
        font-size="20" font-weight="600" fill="#94a3b8" letter-spacing="6">
    TE LO CONSIGO
  </text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
