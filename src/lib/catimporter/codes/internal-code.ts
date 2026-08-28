export function providerPrefix(provider: string): string {
  const known: Record<string, string> = { ledacom: "LED", infoshop: "INFO", infoshopcorp: "INFO", janus: "JAN" };
  const key = provider.toLowerCase().replace(/[^a-z0-9]/g, "");
  return known[key] ?? (key.slice(0, 4).toUpperCase() || "PROD");
}

export function internalCode(provider: string, sequence: number, date = new Date()): string {
  const md = `${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `${providerPrefix(provider)}${md}${String(sequence).padStart(2, "0")}`;
}
