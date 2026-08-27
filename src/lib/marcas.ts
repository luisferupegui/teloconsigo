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
  "gateway", "huawei", "toshiba", "compumax",
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
