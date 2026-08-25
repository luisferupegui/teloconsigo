// ─── Armador de PC — plataforma y placas madre ────────────────────────────────
//
// La compatibilidad de hardware es DETERMINISTA: o el socket coincide o no. Aquí vive
// esa parte del armador, como funciones puras sobre datos — nunca la decide un modelo.
//
// Regla de negocio: el cliente NUNCA sabe si algo está o no en stock. Lo único que
// cambia es el tiempo de entrega: lo que hay en las listas de proveedor llega en 1 a 3
// días; lo demás se consigue y llega en 6 a 10. Por eso `entrega` acompaña a cada opción.

export type Plataforma = "amd" | "intel";
export type Entrega = "rapida" | "encargo";

export const PLATAFORMAS: { id: Plataforma; label: string; nota: string }[] = [
  { id: "amd",   label: "AMD",   nota: "Ryzen — gran rendimiento por precio, especialmente en juegos" },
  { id: "intel", label: "Intel", nota: "Core — muy sólido en oficina, diseño y edición" },
];

export const ENTREGA_LABEL: Record<Entrega, string> = {
  rapida:  "1 a 3 días hábiles",
  encargo: "6 a 10 días hábiles",
};

// Chipset → plataforma. Es la regla que impide armar un imposible: un B650 es AM5 (AMD)
// y un B760 es LGA1700 (Intel); ofrecer uno con el procesador del otro sería una máquina
// que no existe.
// Lista EXPLÍCITA en vez de patrones: los chipsets "B" se parecen demasiado entre marcas
// (B450 y B550 son AMD, B460 y B560 son Intel) y cualquier regla ingeniosa acaba fallando
// en algún modelo. Una lista se lee de un vistazo y se amplía sin miedo.
const AMD = new Set([
  "A320", "A520", "A620", "B350", "B450", "B550", "B650", "B650E", "B840", "B850",
  "X370", "X470", "X570", "X670", "X670E", "X870", "X870E", "TRX40", "TRX50", "WRX80", "WRX90",
]);
const INTEL = new Set([
  "H310", "H410", "H470", "H510", "H570", "H610", "H670", "H770",
  "B360", "B365", "B460", "B560", "B660", "B760", "B860",
  "Q470", "Q670", "Z390", "Z490", "Z590", "Z690", "Z790", "Z890", "W680", "W790",
]);

export type Socket = "AM4" | "AM5" | "sTR5" | "LGA1151" | "LGA1200" | "LGA1700" | "LGA1851" | "LGA4677";

// Chipset -> socket. La plataforma sola no decide compatibilidad: un Ryzen 5 5600G y un
// Ryzen 5 7600 son los dos AMD y no entran en la misma placa. Lo que manda es el socket.
const SOCKET_CHIPSET: Record<string, Socket> = {
  A320: "AM4", B350: "AM4", X370: "AM4", B450: "AM4", X470: "AM4",
  A520: "AM4", B550: "AM4", X570: "AM4",
  A620: "AM5", B650: "AM5", B650E: "AM5", X670: "AM5", X670E: "AM5",
  B840: "AM5", B850: "AM5", X870: "AM5", X870E: "AM5",
  TRX40: "sTR5", TRX50: "sTR5", WRX80: "sTR5", WRX90: "sTR5",
  H310: "LGA1151", B360: "LGA1151", B365: "LGA1151", Z390: "LGA1151",
  H410: "LGA1200", B460: "LGA1200", H470: "LGA1200", Z490: "LGA1200",
  H510: "LGA1200", B560: "LGA1200", H570: "LGA1200", Z590: "LGA1200", Q470: "LGA1200",
  H610: "LGA1700", B660: "LGA1700", H670: "LGA1700", Z690: "LGA1700", Q670: "LGA1700",
  B760: "LGA1700", H770: "LGA1700", Z790: "LGA1700", W680: "LGA1700",
  B860: "LGA1851", Z890: "LGA1851",
  W790: "LGA4677",
};

/** Socket de un chipset. `null` si no se reconoce: dato faltante NUNCA es compatible. */
export function socketDeChipset(chipset: string): Socket | null {
  const c = chipset.trim().toUpperCase();
  return SOCKET_CHIPSET[c] ?? SOCKET_CHIPSET[c.slice(0, 4)] ?? null;
}

/** Socket de un procesador a partir de su nombre comercial, que es lo unico que el
 *  armador maneja ("Ryzen 5 7600", "Core i5-13400F"). Se lee el numero de modelo: la
 *  generacion determina el socket sin ambiguedad. */
export function socketDeCpu(cpu: string): Socket | null {
  const n = cpu.trim().toUpperCase();
  if (n.includes("THREADRIPPER")) return "sTR5";
  if (n.includes("XEON")) return "LGA4677";

  if (n.includes("RYZEN")) {
    const modelo = n.match(/\b(\d{4})[A-Z0-9]*\b/)?.[1];
    if (!modelo) return null;
    // Series 1000-5000 (incluidas las APU 4000G/5000G) son AM4; de 7000 en adelante, AM5.
    return Number(modelo[0]) <= 5 ? "AM4" : "AM5";
  }

  if (n.includes("CORE ULTRA")) return "LGA1851";
  if (n.includes("CORE")) {
    const modelo = n.match(/I[3579][- ](\d{4,5})/)?.[1];
    if (!modelo) return null;
    const gen = modelo.length === 5 ? Number(modelo.slice(0, 2)) : Number(modelo[0]);
    if (gen >= 12 && gen <= 14) return "LGA1700";
    if (gen >= 10 && gen <= 11) return "LGA1200";
    if (gen >= 8 && gen <= 9) return "LGA1151";
    return null;
  }
  return null;
}

// Socket -> generación de memoria. DDR4 y DDR5 no son intercambiables: ni siquiera
// entran físicamente en la ranura. AM5 es DDR5 y AM4 es DDR4, sin excepción; en
// LGA1700 conviven las dos y para un equipo nuevo se arma en DDR5.
const MEMORIA_SOCKET: Record<Socket, "DDR4" | "DDR5"> = {
  AM4: "DDR4",
  AM5: "DDR5",
  sTR5: "DDR5",
  LGA1151: "DDR4",
  LGA1200: "DDR4",
  LGA1700: "DDR5",
  LGA1851: "DDR5",
  LGA4677: "DDR5",
};

/** Generación de memoria que le corresponde a un procesador. */
export function memoriaDeCpu(cpu: string): "DDR4" | "DDR5" | null {
  const socket = socketDeCpu(cpu);
  return socket ? MEMORIA_SOCKET[socket] : null;
}

/** Plataforma de un chipset. `null` si no se reconoce: dato faltante NUNCA es compatible. */
export function plataformaDeChipset(chipset: string): Plataforma | null {
  const c = chipset.trim().toUpperCase();
  if (AMD.has(c)) return "amd";
  if (INTEL.has(c)) return "intel";
  // Variantes con sufijo ("B650M", "X670E-PLUS"): se prueba el núcleo de 4 caracteres.
  const base = c.slice(0, 4);
  if (AMD.has(base)) return "amd";
  if (INTEL.has(base)) return "intel";
  return null;
}

// Líneas de producto por marca, tal como las nombra cada fabricante.
const LINEAS = [
  "ROG STRIX", "ROG", "TUF GAMING", "PROART", "PRIME", "EXPEDITION",       // ASUS
  "AORUS", "EAGLE", "AERO", "GAMING X", "UD", "DS3H",                      // Gigabyte
  "MPG", "MAG", "PRO",                                                      // MSI
  "TAICHI", "STEEL LEGEND", "PHANTOM GAMING", "PRO RS", "HDV",              // ASRock
  "PRO WS",                                                                 // estación de trabajo
];
const MARCAS = ["ASUS", "GIGABYTE", "MSI", "ASROCK", "BIOSTAR", "FOXCONN"];

export type PlacaOpcion = {
  /** Lo que ve el cliente y viaja a Andrea: "ASUS PRIME B650M-A". */
  label: string;
  marca: string;
  linea: string;
  chipset: string;
  plataforma: Plataforma;
  /** Socket real de la placa. Es lo que se compara para decidir compatibilidad. */
  socket: Socket | null;
  entrega: Entrega;
};

type ProductoLista = { nombre: string; categoria?: string };

function extraer(nombre: string): { marca: string; linea: string; chipset: string } | null {
  const n = nombre.toUpperCase();
  const marca = MARCAS.find((m) => n.includes(m));
  const linea = LINEAS.find((l) => n.includes(l));
  const chipset = n.match(/\b([ABXZHQW]\d{3}[A-Z]?)\b/)?.[1] ?? "";
  if (!marca || !chipset) return null;
  return { marca, linea: linea ?? "", chipset };
}

/** Placas REALES de las listas, para una plataforma. Se deduplican por marca+línea+chipset
 *  y se ordenan por marca para que el cliente vea un abanico ordenado. */
export function placasDeInventario(productos: ProductoLista[], plataforma: Plataforma): PlacaOpcion[] {
  const vistas = new Map<string, PlacaOpcion>();
  for (const p of productos) {
    if (p.categoria !== "motherboard") continue;
    const d = extraer(p.nombre);
    if (!d) continue;
    if (plataformaDeChipset(d.chipset) !== plataforma) continue;
    const label = [d.marca, d.linea, d.chipset].filter(Boolean).join(" ");
    if (!vistas.has(label)) {
      vistas.set(label, { label, ...d, plataforma, socket: socketDeChipset(d.chipset), entrega: "rapida" });
    }
  }
  return [...vistas.values()].sort((a, b) => a.marca.localeCompare(b.marca) || a.chipset.localeCompare(b.chipset));
}

// Líneas de gama alta que se consiguen por encargo. El cliente no ve "no hay stock":
// solo un tiempo de entrega mayor.
const POR_ENCARGO: Record<string, { marca: string; linea: string; chipset: string }[]> = {
  AM4: [
    { marca: "ASUS",     linea: "TUF GAMING", chipset: "B550" },
    { marca: "ASUS",     linea: "ROG STRIX",  chipset: "B550" },
    { marca: "GIGABYTE", linea: "AORUS",      chipset: "B550" },
    { marca: "MSI",      linea: "MAG",        chipset: "B550" },
  ],
  AM5: [
    { marca: "ASUS",     linea: "TUF GAMING", chipset: "B650" },
    { marca: "ASUS",     linea: "ROG STRIX",  chipset: "X670E" },
    { marca: "ASUS",     linea: "PROART",     chipset: "X670E" },
    { marca: "GIGABYTE", linea: "EAGLE",      chipset: "B650" },
    { marca: "GIGABYTE", linea: "AORUS",      chipset: "X870E" },
  ],
  LGA1700: [
    { marca: "ASUS",     linea: "TUF GAMING", chipset: "B760" },
    { marca: "ASUS",     linea: "ROG STRIX",  chipset: "Z790" },
    { marca: "ASUS",     linea: "PROART",     chipset: "Z790" },
    { marca: "GIGABYTE", linea: "EAGLE",      chipset: "B760" },
    { marca: "GIGABYTE", linea: "AORUS",      chipset: "Z790" },
  ],
  LGA1851: [
    { marca: "ASUS",     linea: "TUF GAMING", chipset: "B860" },
    { marca: "ASUS",     linea: "ROG STRIX",  chipset: "Z890" },
    { marca: "ASUS",     linea: "PROART",     chipset: "Z890" },
    { marca: "GIGABYTE", linea: "EAGLE",      chipset: "B860" },
    { marca: "GIGABYTE", linea: "AORUS",      chipset: "Z890" },
  ],
  // Estación de trabajo: no se venden en volumen, siempre van por encargo.
  sTR5: [
    { marca: "ASUS",     linea: "PRO WS",     chipset: "TRX50" },
    { marca: "GIGABYTE", linea: "AERO",       chipset: "TRX50" },
  ],
  LGA4677: [
    { marca: "ASUS",     linea: "PRO WS",     chipset: "W790" },
    { marca: "GIGABYTE", linea: "AERO",       chipset: "W790" },
  ],
};

/** Catálogo de placas para el armador: primero las de entrega rápida, después las de
 *  encargo que no repitan una línea ya cubierta EN ESE MISMO SOCKET (una TUF B550 y una
 *  TUF B650 son placas distintas, para equipos distintos). */
export function opcionesDePlaca(productos: ProductoLista[], plataforma: Plataforma): PlacaOpcion[] {
  const enStock = placasDeInventario(productos, plataforma);
  const cubiertas = new Set(enStock.map((p) => `${p.socket}|${p.marca}|${p.linea}`));
  const sockets = plataforma === "amd" ? ["AM4", "AM5", "sTR5"] : ["LGA1700", "LGA1851", "LGA4677"];
  const encargo: PlacaOpcion[] = sockets.flatMap((sock) =>
    (POR_ENCARGO[sock] ?? [])
      .filter((e) => !cubiertas.has(`${sock}|${e.marca}|${e.linea}`))
      .map((e) => ({
        label: `${e.marca} ${e.linea} ${e.chipset}`,
        ...e,
        plataforma,
        socket: socketDeChipset(e.chipset),
        entrega: "encargo" as const,
      })),
  );
  return [...enStock, ...encargo];
}

// ─── Verificación de compatibilidad ──────────────────────────────────────────

export type Veredicto = {
  compatible: boolean;
  razones: string[];
  nivel: "ok" | "advertencia" | "incompatible";
};

/** ¿El procesador elegido va con la placa elegida? Se compara por PLATAFORMA, que es lo
 *  que el armador conoce (el socket exacto lo valida el proveedor al ensamblar). */
export function verificarCpuPlaca(cpu: string, placa: PlacaOpcion | null, plataforma: Plataforma): Veredicto {
  if (!placa) {
    return { compatible: false, nivel: "advertencia", razones: ["Falta elegir la placa madre."] };
  }
  if (placa.plataforma !== plataforma) {
    return {
      compatible: false,
      nivel: "incompatible",
      razones: [`La placa ${placa.label} es de plataforma ${placa.plataforma.toUpperCase()} y el procesador elegido es ${plataforma.toUpperCase()}.`],
    };
  }
  const socketCpu = socketDeCpu(cpu);
  // Dato faltante NUNCA es compatible: se avisa, en vez de darlo por bueno.
  if (!socketCpu || !placa.socket) {
    return {
      compatible: false,
      nivel: "advertencia",
      razones: [`No pudimos verificar el socket de ${!socketCpu ? cpu : placa.label}: lo confirmamos antes de ensamblar.`],
    };
  }
  if (socketCpu !== placa.socket) {
    return {
      compatible: false,
      nivel: "incompatible",
      razones: [`${cpu} usa socket ${socketCpu} y ${placa.label} es ${placa.socket}: no encajan.`],
    };
  }
  return {
    compatible: true,
    nivel: "ok",
    razones: [`${cpu} y ${placa.label} comparten socket ${socketCpu}.`],
  };
}

// ─── Gama de placa según el perfil ───────────────────────────────────────────
//
// Un PC Gamer no se arma sobre una A520: el chipset marca cuánto puede crecer el equipo
// (líneas PCIe, VRM, overclock). Sin este filtro el armador recomendaba la placa más
// básica del inventario para cualquier perfil, solo por ser la primera de la lista.

const TIER: Record<string, number> = {
  A320: 1, A520: 1, A620: 2, B350: 1, B450: 2, B550: 3, B650: 4, B650E: 5, B840: 4, B850: 5,
  X370: 3, X470: 4, X570: 5, X670: 6, X670E: 6, X870: 7, X870E: 7, TRX50: 8, WRX90: 8,
  H310: 1, H410: 1, H470: 2, H510: 1, H570: 2, H610: 1, H670: 3, H770: 4,
  B360: 2, B365: 2, B460: 2, B560: 3, B660: 3, B760: 4, B860: 5,
  Q470: 3, Q670: 3, Z390: 4, Z490: 5, Z590: 5, Z690: 5, Z790: 6, Z890: 6, W680: 7, W790: 8,
};

/** Gama de placa por perfil: el mínimo que se le puede ofrecer y si conviene la más
 *  económica que cumpla o la más capaz del inventario.
 *
 *  El mínimo NO se sube de más a propósito. Un 7800X3D corre perfecto sobre una B650, y
 *  exigir X670E dejaría los perfiles premium sin una sola placa de entrega rápida: el
 *  cliente esperaría 6 a 10 días por un requisito que nadie le pidió. Las placas de gama
 *  extrema siguen ahí, al final de la lista, para quien las quiera. */
const GAMA_POR_PERFIL: Record<string, { min: number; preferir: "economica" | "capaz" }> = {
  hogar:           { min: 1, preferir: "economica" },
  oficina:         { min: 2, preferir: "economica" },
  diseno:          { min: 3, preferir: "capaz" },
  desarrollo:      { min: 3, preferir: "capaz" },
  gaming:          { min: 4, preferir: "capaz" },
  "gamer-premium": { min: 4, preferir: "capaz" },
  streaming:       { min: 4, preferir: "capaz" },
  edicion:         { min: 4, preferir: "capaz" },
  ia:              { min: 4, preferir: "capaz" },
};

function tierDe(chipset: string): number {
  const c = chipset.toUpperCase();
  return TIER[c] ?? TIER[c.slice(0, 4)] ?? 0;
}

/** Placas apropiadas para un perfil, de entrega rápida primero y de menor a mayor gama.
 *  Si el filtro dejara la lista vacía se devuelve el catálogo completo: es preferible
 *  ofrecer algo a no ofrecer nada. */
export function placasParaPerfil(
  todas: PlacaOpcion[],
  perfilId: string,
  socketCpu?: Socket | null,
): PlacaOpcion[] {
  const { min } = GAMA_POR_PERFIL[perfilId] ?? { min: 1, preferir: "economica" as const };
  // El socket es innegociable: una placa del socket equivocado NUNCA se ofrece, aunque
  // eso deje la lista corta. La gama sí se relaja cuando hace falta.
  const delSocket = socketCpu ? todas.filter((p) => p.socket === socketCpu) : todas;
  const aptas = delSocket.filter((p) => tierDe(p.chipset) >= min);
  const lista = aptas.length > 0 ? aptas : delSocket;
  return [...lista].sort(
    (a, b) =>
      (a.entrega === b.entrega ? 0 : a.entrega === "rapida" ? -1 : 1) ||
      tierDe(a.chipset) - tierDe(b.chipset) ||
      a.marca.localeCompare(b.marca),
  );
}

/** Placa recomendada para el perfil: siempre de entrega rápida si la hay, porque nadie
 *  debería esperar 6 a 10 días por la opción que le sugerimos nosotros. Dentro de esas,
 *  la más económica o la más capaz según lo que pida el perfil. */
export function placaRecomendada(aptas: PlacaOpcion[], perfilId: string): string {
  if (aptas.length === 0) return "";
  const { preferir } = GAMA_POR_PERFIL[perfilId] ?? { preferir: "economica" as const };
  const candidatas = aptas.filter((p) => p.entrega === "rapida");
  const pool = candidatas.length > 0 ? candidatas : aptas;
  const mejor = pool.reduce((a, b) =>
    preferir === "capaz"
      ? (tierDe(b.chipset) > tierDe(a.chipset) ? b : a)
      : (tierDe(b.chipset) < tierDe(a.chipset) ? b : a),
  );
  return mejor.label;
}
