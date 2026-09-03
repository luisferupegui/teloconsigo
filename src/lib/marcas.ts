// ─── Marcas que la tienda reconoce ───────────────────────────────────────────
//
// Sirve para una cosa concreta: cuando el cliente NOMBRA una marca, esa marca es
// parte de lo que pidió, no un adorno. El filtro de specs solo retiene los términos
// CON CIFRA, así que "Targus", "Logitech" o "Kingston" no pesaban nada — y a quien
// pedía un morral Targus podían salirle un Totto, un Lugano y un genérico de Oxford.
// Un cliente que nombra la marca ya decidió; ofrecerle otras tres es no escucharlo.
//
// La lista incluye las marcas de los logos de la web, las de las listas de proveedor
// y las de accesorios que se piden por nombre propio.

const MARCAS = [
  // Componentes y equipos
  "intel", "amd", "nvidia", "asus", "rog", "msi", "gigabyte", "asrock", "nzxt",
  "corsair", "gskill", "g.skill", "kingston", "crucial", "teamgroup", "zotac",
  "sapphire", "cooler master", "coolermaster", "evga", "seasonic", "thermaltake",
  "xpg", "adata", "lenovo", "hp", "dell", "acer", "apple", "microsoft", "janus",
  "gateway", "huawei", "toshiba", "compumax", "power group", "powergroup",
  // Monitores y pantallas
  "aoc", "lg", "samsung", "viewsonic", "benq", "philips",
  // Refrigeración
  "arctic", "artic", "deepcool", "alienware", "noctua", "be quiet",
  // Redes
  "tp-link", "tplink", "netgear", "linksys", "d-link", "dlink", "ubiquiti",
  "mikrotik", "cisco", "grandstream", "cudy",
  // Periféricos y audio
  "logitech", "razer", "steelseries", "hyperx", "elgato", "blue", "rode",
  "sennheiser", "genius", "redragon", "jbl", "bose", "sonos", "shure",
  "audio-technica", "audiotechnica", "t-dagger", "tdagger", "creative", "soundcore",
  "xiaomi", "jaltech", "klip xtreme", "klipxtreme", "micronics", "boetec",
  // Almacenamiento
  "wd", "western digital", "seagate", "sandisk", "kingspec", "lexar", "pny",
  "netac", "orico", "aorus", "pulskill",
  // Energía y protección
  "apc", "cyberpower", "tripp lite", "tripplite", "forza", "nicomar", "cdp",
  // Accesorios, morrales y conectividad
  "targus", "belkin", "ugreen", "anker", "totto", "samsonite", "nexstand",
  "ifixit", "meco", "baseus", "hiq", "lekvey",
  // Impresión
  "epson", "canon", "brother", "kyocera", "ricoh", "pantum", "xerox", "lexmark",
  // Software
  "kaspersky", "eset", "norton", "mcafee", "avast", "bitdefender",
];

// Las multipalabra van primero para que "cooler master" gane a "master" suelto, y en
// general para que la coincidencia más larga mande.
const ORDENADAS = [...MARCAS].sort((a, b) => b.length - a.length);

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");

/** Las marcas que el cliente nombró en su consulta. Vacío si no nombró ninguna. */
export function marcasEnConsulta(consulta: string): string[] {
  const q = consulta.toLowerCase();
  const halladas: string[] = [];
  for (const marca of ORDENADAS) {
    // Con límite de palabra a los dos lados: "hp" no debe casar dentro de "hpx".
    if (new RegExp(`(^|[^a-z0-9])${escapar(marca)}([^a-z0-9]|$)`).test(q)) {
      // No se añade una marca que ya está contenida en otra ya hallada
      // ("logitech" dentro de nada, pero "blue" dentro de "bluetooth" sí importa).
      if (!halladas.some((m) => m.includes(marca))) halladas.push(marca);
    }
  }
  return halladas;
}

/** ¿El texto de un producto es de esta marca? */
export function esDeMarca(texto: string, marca: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapar(marca)}([^a-z0-9]|$)`).test(texto.toLowerCase());
}

/** Cómo se escribe una marca de cara al cliente: "tp-link" → "TP-Link". */
const COMO_SE_ESCRIBE: Record<string, string> = {
  hp: "HP", hpe: "HPE", lg: "LG", msi: "MSI", amd: "AMD", aoc: "AOC",
  apc: "APC", cdp: "CDP", wd: "WD", pny: "PNY", jbl: "JBL", benq: "BenQ",
  asus: "ASUS", rog: "ROG", nzxt: "NZXT", xpg: "XPG", adata: "ADATA",
  qnap: "QNAP", eset: "ESET", "g.skill": "G.Skill", gskill: "G.Skill",
  "tp-link": "TP-Link", tplink: "TP-Link", "d-link": "D-Link", dlink: "D-Link",
  "western digital": "Western Digital", "cooler master": "Cooler Master",
  coolermaster: "Cooler Master", "audio-technica": "Audio-Technica",
  "klip xtreme": "Klip Xtreme", klipxtreme: "Klip Xtreme",
  "tripp lite": "Tripp Lite", tripplite: "Tripp Lite", "be quiet": "be quiet!",
  "t-dagger": "T-Dagger", tdagger: "T-Dagger", steelseries: "SteelSeries",
  hyperx: "HyperX",
};

/** Marcas de COMPONENTE. En un equipo completo nombran la pieza, no el equipo. */
const SOLO_COMPONENTE = new Set(["intel", "amd", "nvidia"]);

/** Categorías donde el producto es una máquina, no una pieza. */
const EQUIPO_COMPLETO = new Set([
  "portatil", "escritorio", "escritorio-alto-rendimiento", "all-in-one",
  "todo-en-uno", "mini-pc", "tableta", "celular", "servidor",
]);

const capitalizar = (m: string) =>
  COMO_SE_ESCRIBE[m] ?? m.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

/**
 * La marca que nombra el propio producto. `null` si no nombra ninguna conocida.
 *
 * Existe porque los lectores de listas guardaban en `marca` el nombre del
 * PROVEEDOR, que no es lo mismo: "Combo Genius Inalámbrico KM-8101" es de
 * Genius, no de quien nos lo vende. Andrea lo anteponía al nombre y le decía al
 * cliente a quién le compramos, que es justo lo que no debe saber. Publicarlo
 * habría sido peor: la marca acaba en el `brand` del JSON-LD que indexa Google.
 *
 * Gana la coincidencia más larga, así que "Cooler Master" no se lee como
 * "Master".
 */
export function marcaDeNombre(nombre: string, categoria?: string): string | null {
  const texto = nombre.toLowerCase();
  const halladas = ORDENADAS.filter((m) =>
    new RegExp(`(^|[^a-z0-9])${escapar(m)}([^a-z0-9]|$)`).test(texto),
  );
  if (halladas.length === 0) return null;

  // Quien fabrica el procesador no es quien fabrica la máquina: un "POWER GROUP
  // INTEL CORE ULTRA 5 245K" es un Power Group con CPU Intel, y darle la marca
  // "Intel" es tan falso como darle la del proveedor.
  // Entre varias marcas propias manda la que aparece ANTES en el nombre: en un
  // combo —"Asus TUF Gaming A15 + GamePad SCORPIO T-Dagger T-TGP802"— la del
  // principio es la del equipo y la otra es la del regalo. `ORDENADAS` va de más
  // larga a más corta, así que sin esto ganaba "t-dagger" a "asus".
  const propia = halladas
    .filter((m) => !SOLO_COMPONENTE.has(m))
    .sort((a, b) => texto.indexOf(a) - texto.indexOf(b))[0];
  if (propia) return capitalizar(propia);

  // Solo se nombró un fabricante de componente. En una pieza suelta esa ES la
  // marca ("Procesador Intel Core i5-12400"); en un equipo completo no lo es, y
  // como el documento no dice de quién es, se deja vacía antes que mentir.
  return EQUIPO_COMPLETO.has((categoria ?? "").toLowerCase())
    ? null
    : capitalizar(halladas[0]);
}
