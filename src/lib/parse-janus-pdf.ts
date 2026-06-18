import type { SupplierProduct } from "./supplier-catalog";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

interface PdfItem {
  t: string;
  x: number;
  y: number;
}

// ── Column boundaries (empirical, from Janus PDF layout analysis) ────────────
const X_LABEL_MAX      = 160; // labels (CATEGORIA, PROCESADOR…) end here
const X_LEFTVAL_MAX    = 268; // left column values end here
const X_RIGHTCOL_START = 265; // right column (monitor description) starts here
const X_EFECTIVO_START = 400; // EFECTIVO price column (≈ x 400–445)
const X_CREDITO_START  = 455; // CREDITO price column (≈ x 455–510) — ignored

// Prices above this threshold are quoted WITHOUT IVA — we must add it.
const IVA_UMBRAL = 2_618_000;
const IVA_FACTOR = 1.19;

// ── String helpers ───────────────────────────────────────────────────────────

function cleanStr(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function parsePrice(s: string): number | null {
  const digits = s.replace(/[$.,\s]/g, "").replace(/[^\d]/g, "");
  const n = parseInt(digits, 10);
  return Number.isFinite(n) && n >= 50_000 && n < 100_000_000 ? n : null;
}

function cpuShort(text: string): string {
  const u = text.toUpperCase();
  let m = u.match(/CORE\s+ULTRA\s*(\d+)\s*(\d{3}[A-Z]?)/);
  if (m) return `Core Ultra ${m[1]} ${m[2]}`;
  m = u.match(/(?:INTEL\s+)?CORE[\s-]+(I[3579])[\s-]?(\d{4,5}[A-Z]?)/);
  if (m) return `Core ${m[1].toLowerCase()}-${m[2]}`;
  m = u.match(/PENTIUM\s+GOLD\s+(\w+)/);
  if (m) return `Pentium Gold ${m[1]}`;
  m = u.match(/PENTIUM\s+(G?\d+)/);
  if (m) return `Pentium ${m[1]}`;
  m = u.match(/CELERON\s+(\w+)/);
  if (m) return `Celeron ${m[1]}`;
  m = u.match(/RYZEN[\s-]*(\d)[\s-]+(\d{4}[A-Z]{0,3})/);
  if (m) return `Ryzen ${m[1]} ${m[2]}`;
  return cleanStr(text).split(/[–\-,]/)[0].trim().slice(0, 35);
}

function ramShort(text: string): string {
  const m = text.match(/(\d+)\s*GB/i);
  const tipo = text.match(/DDR[45X]?/i)?.[0]?.toUpperCase() ?? "DDR4";
  return m ? `${m[1]}GB ${tipo}` : cleanStr(text).slice(0, 12);
}

function storageShort(text: string): string {
  const u = text.toUpperCase();
  const m = u.match(/(\d+(?:\.\d+)?)\s*(TB|GB)\b/);
  if (!m) return cleanStr(text).split(/[,–]/)[0].trim().slice(0, 18);
  const iface = /NVME|M[,.]?2|PCIE|M2/.test(u) ? "M.2" : "SATA";
  return `SSD ${m[1]}${m[2]} ${iface}`;
}

function monitorSize(text: string): string {
  const m = text.match(/(\d{2}(?:[.,]\d)?)\s*["'"]/);
  return m ? m[1].replace(",", ".") + '"' : "";
}

function gpuShort(text: string): string | null {
  const u = text.toUpperCase();
  let m = u.match(/RTX\s*(\d{4}\s*(?:TI|SUPER)?)\s*(?:(\d+)\s*GB)?/);
  if (m) return `RTX ${m[1].trim()}${m[2] ? " " + m[2] + "GB" : ""}`.trim();
  m = u.match(/GTX\s*(\d{4}\s*(?:TI|SUPER)?)\s*(?:(\d+)\s*GB)?/);
  if (m) return `GTX ${m[1].trim()}${m[2] ? " " + m[2] + "GB" : ""}`.trim();
  m = u.match(/RX\s*(\d{4}[A-Z]?(?:\s*XT)?)\s*(?:CL\s*)?(?:(\d+)\s*GB)?/);
  if (m) return `RX ${m[1].trim()}${m[2] ? " " + m[2] + "GB" : ""}`.trim();
  return null;
}

function categoriaFromContext(janusCategory: string, hasGpu: boolean): string {
  if (hasGpu) return "escritorio-alto-rendimiento";
  if (/WORKSTATION|CREACION|CREATIVO|\bIA\b/i.test(janusCategory)) return "escritorio-alto-rendimiento";
  return "escritorio";
}

// ── Public types ─────────────────────────────────────────────────────────────

export type ParsedJanusProduct = Omit<SupplierProduct, "id" | "importedAt" | "proveedor">;

// ── Main entry point ─────────────────────────────────────────────────────────

export async function parseJanusPdf(
  buffer: Buffer,
  options?: { aplicarIva?: boolean },
): Promise<ParsedJanusProduct[]> {
  const aplicarIva = options?.aplicarIva ?? false;
  const pagesItems: PdfItem[][] = [];

  await pdfParse(buffer, {
    pagerender: (pageData: {
      getTextContent(): Promise<{
        items: Array<{ str: string; transform: number[] }>;
      }>;
    }) =>
      pageData.getTextContent().then((tc) => {
        const items: PdfItem[] = tc.items
          .map((i) => ({
            t: i.str.trim(),
            x: Math.round(i.transform[4]),
            y: Math.round(i.transform[5]),
          }))
          .filter((i) => i.t.length > 0);
        pagesItems.push(items);
        return "";
      }),
  });

  const results: ParsedJanusProduct[] = [];
  const seen = new Set<string>();

  for (const items of pagesItems) {
    // Only process pages that contain desktop config blocks (have CATEGORIA label)
    if (!items.some((i) => i.t === "CATEGORIA" && i.x < X_LABEL_MAX)) continue;
    parsePage(items, results, seen, aplicarIva);
  }

  return results;
}

// ── Per-page parser ──────────────────────────────────────────────────────────

function parsePage(
  items: PdfItem[],
  out: ParsedJanusProduct[],
  seen: Set<string>,
  aplicarIva: boolean,
): void {
  // Locate CATEGORIA markers; sort top → bottom (higher Y = higher on page)
  const catMarkers = items
    .filter((i) => i.t === "CATEGORIA" && i.x < X_LABEL_MAX)
    .sort((a, b) => b.y - a.y);

  if (catMarkers.length === 0) return;

  // Build config blocks: each block spans from its CATEGORIA Y down to the next one
  const blocks = catMarkers.map((cat, idx) => {
    const nextCat = catMarkers[idx + 1];
    const catValue = cleanStr(
      items
        .filter(
          (i) =>
            i.x >= X_LABEL_MAX &&
            i.x < X_LEFTVAL_MAX &&
            Math.abs(i.y - cat.y) <= 4,
        )
        .sort((a, b) => a.x - b.x)
        .map((i) => i.t)
        .join(" "),
    );
    return { topY: cat.y, botY: nextCat ? nextCat.y : 0, catName: catValue };
  });

  for (const block of blocks) {
    const blockItems = items.filter(
      (i) => i.y <= block.topY && i.y > block.botY,
    );

    // Extract a single-line left-column spec value by label
    function specVal(labelRe: RegExp): string {
      const label = blockItems.find(
        (i) => labelRe.test(i.t) && i.x < X_LABEL_MAX,
      );
      if (!label) return "";
      return cleanStr(
        blockItems
          .filter(
            (i) =>
              i.x >= X_LABEL_MAX &&
              i.x < X_LEFTVAL_MAX &&
              i.y >= label.y - 2 &&
              i.y <= label.y + 4 &&
              !labelRe.test(i.t),
          )
          .sort((a, b) => b.y - a.y || a.x - b.x)
          .map((i) => i.t)
          .join(" "),
      );
    }

    const cpuRaw   = specVal(/^PROCESADOR$/i);
    const ramRaw   = specVal(/^MEMORIAS?\s*RAM$/i);
    const storeRaw = specVal(/^ALMACENAMIENTO$/i);

    if (!cpuRaw) continue; // incomplete block — skip

    // Find all EFECTIVO prices in this block (x in EFECTIVO range, not CREDITO)
    const blockPrices = blockItems
      .filter(
        (i) =>
          i.x >= X_EFECTIVO_START &&
          i.x < X_CREDITO_START &&
          i.t.includes("$"),
      )
      .map((i) => ({ y: i.y, value: parsePrice(i.t) }))
      .filter((p) => p.value !== null)
      .sort((a, b) => b.y - a.y); // top → bottom

    // For each price option, gather the right-column description
    for (let pi = 0; pi < blockPrices.length; pi++) {
      const { y: pY, value: rawPrice } = blockPrices[pi];
      if (!rawPrice) continue;

      // Upper bound: the previous (higher) price, so we don't bleed into it
      const prevPY = pi > 0 ? blockPrices[pi - 1].y : Infinity;

      const rightItems = blockItems.filter(
        (i) =>
          i.x >= X_RIGHTCOL_START &&
          i.x < X_EFECTIVO_START &&
          i.y >= pY &&
          i.y < Math.min(prevPY, pY + 50),
      );

      const rightText = cleanStr(
        rightItems
          .sort((a, b) => b.y - a.y || a.x - b.x)
          .map((i) => i.t)
          .join(" "),
      );

      if (!rightText) continue;

      const monSz = monitorSize(rightText);
      if (!monSz) continue; // no monitor size → not a complete desktop offer

      // GPU may appear in the right-col description OR in the left-col option value
      // (e.g. "T. VIDEO AMD RADEON RX 9060 CL 8GB OC" at x≈188 for TARJETA DE VIDEO rows)
      const leftOptText = cleanStr(
        blockItems
          .filter(
            (i) =>
              i.x >= X_LABEL_MAX &&
              i.x < X_LEFTVAL_MAX &&
              i.y >= pY - 4 &&
              i.y <= pY + 6,
          )
          .sort((a, b) => a.x - b.x)
          .map((i) => i.t)
          .join(" "),
      );
      const gpu = gpuShort(rightText) ?? gpuShort(leftOptText);
      const cpuS = cpuShort(cpuRaw);
      const ramS = ramShort(ramRaw);
      const stoS = storageShort(storeRaw);

      // Deduplicate by hardware configuration
      const dedupKey = `${block.catName}|${cpuS}|${ramS}|${stoS}|${gpu ?? ""}|${monSz}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const precio_costo =
        aplicarIva && rawPrice > IVA_UMBRAL
          ? Math.round(rawPrice * IVA_FACTOR)
          : rawPrice;

      // Build product name
      const catShort = block.catName.replace(/^JANUS\s*/i, "").replace(/\s*\/\s*/g, "/").trim();
      let nombre = `JANUS ${catShort} ${cpuS} ${ramS} ${stoS}`;
      if (gpu) nombre += ` + GPU ${gpu}`;
      nombre += ` + Monitor Janus ${monSz}`;
      nombre = cleanStr(nombre);

      const specs: Record<string, string> = {
        procesador: cpuS,
        ram: ramS,
        almacenamiento: stoS,
        monitor: `Janus ${monSz}`,
      };
      if (gpu) specs.gpu = gpu;

      out.push({
        nombre,
        marca: "Janus",
        categoria: categoriaFromContext(block.catName, !!gpu),
        precio_costo,
        specs,
      });
    }
  }
}
