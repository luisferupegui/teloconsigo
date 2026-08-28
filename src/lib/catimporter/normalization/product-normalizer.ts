export function normalizeProduct(nombre: string, specs: Record<string, string> = {}): Record<string, string | number> {
  const text = `${nombre} ${Object.values(specs).join(" ")}`.toLowerCase();
  const out: Record<string, string | number> = {};
  const storage = text.match(/\b(\d+(?:[.,]\d+)?)\s?(tb|gb)\b/);
  if (storage && /(ssd|nvme|hdd|disco)/.test(text)) {
    out.storageGb = storage[2] === "tb" ? Math.round(Number(storage[1].replace(",", ".")) * 1000) : Number(storage[1]);
    out.storageType = /nvme/.test(text) ? "NVMe" : /ssd/.test(text) ? "SSD" : "HDD";
  }
  const ram = text.match(/(?:ram|ddr[345])[^\d]{0,12}(\d+)\s?gb|\b(\d+)\s?gb\s?(?:ram|ddr[345])/);
  if (ram) out.ramGb = Number(ram[1] ?? ram[2]);
  const screen = text.match(/\b(\d{2}(?:[.,]\d+)?)\s?(?:\"|pulg(?:adas)?|inch)\b/);
  if (screen) out.screenInches = Number(screen[1].replace(",", "."));
  const hz = text.match(/\b(\d{2,3})\s?hz\b/);
  if (hz) out.refreshRateHz = Number(hz[1]);
  return out;
}
