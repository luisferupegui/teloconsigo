// ─── Specs normalizadas ──────────────────────────────────────────────────────
//
// Convierte lo que dice el proveedor ("SODIMM 8GB BUS DE 2666", "23,8” KA242Y")
// en números comparables: ramGb, storageGb, screenInches…
//
// CADA DATO SE LEE DE SU PROPIO CAMPO. La versión anterior juntaba el nombre y
// TODAS las specs en un solo texto y buscaba ahí la primera cifra en GB — con lo
// que a un equipo de "16GB de RAM / 512GB de disco" le asignaba `storageGb: 16`,
// porque la memoria aparecía antes. Un dato equivocado es peor que ninguno:
// nadie lo revisa, y luego alguien filtra por capacidad y no encuentra el equipo.
//
// El texto completo solo se usa como respaldo, cuando el campo concreto no está.

type Specs = Record<string, string>;

/** Primer campo cuyo nombre empiece por alguno de los dados. */
function campoQueEmpieza(specs: Specs, ...prefijos: string[]): string | undefined {
  for (const p of prefijos) {
    const clave = Object.keys(specs).find((k) => k.startsWith(p));
    if (clave && specs[clave]) return specs[clave];
  }
  return undefined;
}

const capacidadGb = (texto: string): number | undefined => {
  // Sin `\b` delante del número: Compumax escribe la capacidad pegada al tipo
  // ("SSD512GB"), y ahí no hay límite de palabra entre la "D" y el "5".
  const m = texto.toLowerCase().match(/(\d+(?:[.,]\d+)?)\s?(tb|gb)\b/);
  if (!m) return undefined;
  const n = Number(m[1].replace(",", "."));
  return m[2] === "tb" ? Math.round(n * 1000) : n;
};

export function normalizeProduct(nombre: string, specs: Specs = {}): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  const todo = `${nombre} ${Object.values(specs).join(" ")}`.toLowerCase();

  // ── Almacenamiento: de su campo; si no existe, del texto pero exigiendo que
  //    la cifra vaya acompañada de una palabra de disco, para no capturar la RAM.
  const campoDisco = campoQueEmpieza(specs, "almacenamiento", "disco", "storage");
  const textoDisco = campoDisco
    ?? todo.match(/(?:ssd|nvme|hdd|disco)[^|]{0,40}?\d+\s?[gt]b/)?.[0];
  if (textoDisco) {
    const gb = capacidadGb(textoDisco);
    if (gb) {
      out.storageGb = gb;
      const t = textoDisco.toLowerCase();
      out.storageType = /nvme|m\.?2|pcie/.test(t) ? "NVMe" : /ssd|sata/.test(t) ? "SSD" : "HDD";
    }
  }

  // ── Memoria
  const campoRam = campoQueEmpieza(specs, "memoria", "ram");
  const textoRam = campoRam ?? todo.match(/(?:ram|ddr[345])[^|]{0,20}?\d+\s?gb|\d+\s?gb\s?(?:ram|ddr[345])/)?.[0];
  if (textoRam) {
    const gb = capacidadGb(textoRam);
    if (gb) out.ramGb = gb;
    const ddr = textoRam.toLowerCase().match(/ddr[345]/)?.[0];
    if (ddr) out.ramType = ddr.toUpperCase();
  }

  // ── Pantalla (admite la comilla tipográfica de los PDF: 23,8”)
  const campoPantalla = campoQueEmpieza(specs, "monitor", "pantalla", "screen");
  const pulgadas = (campoPantalla ?? todo).match(/\b(\d{2}(?:[.,]\d)?)\s?(?:["”]|pulg(?:adas)?|inch)/);
  if (pulgadas) out.screenInches = Number(pulgadas[1].replace(",", "."));

  const hz = (campoPantalla ?? todo).match(/\b(\d{2,3})\s?hz\b/i);
  if (hz) out.refreshRateHz = Number(hz[1]);

  const cpu = campoQueEmpieza(specs, "procesador", "cpu");
  if (cpu) out.processor = cpu.replace(/\s+/g, " ").trim().slice(0, 60);

  return out;
}
