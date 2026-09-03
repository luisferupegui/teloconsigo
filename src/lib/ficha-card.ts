// ─── La línea que va bajo el nombre en una card ──────────────────────────────
//
// El cliente ve el nombre y tres specs. Lo que el nombre NO le dice es el
// formato: si eso es un portátil o una torre, y de qué tamaño. Esa es la línea
// que va en medio —"Portátil 14"", "Escritorio de alto rendimiento · Monitor
// 23.8""— y por eso no repite la marca, que ya está arriba.
//
// Vive aquí, fuera de `promociones-relleno`, porque la usan los dos lados: el
// panel al publicar (que conoce la categoría de la LISTA) y la card al pintar
// (que sólo conoce la de la TIENDA). Tenerla dos veces era garantía de que se
// dijeran cosas distintas.

/**
 * Las pulgadas, vengan como vengan.
 *
 * Los proveedores escriben 15.6", 15,6”, "16 pulgadas" y, en la columna del
 * monitor, sólo el número: "ACER 23,8 KA242Y". El número suelto vale como
 * pulgadas —pero sólo si va suelto, que si no "KA242Y" pasaría por 42".
 */
export function pulgadasDe(v: string | undefined): string {
  if (!v) return "";
  const conUnidad = v.match(/(\d{1,2}(?:[.,]\d)?)\s*(?:["”″]|''|pulgadas?|\bin\b)/i);
  const suelto = v.match(/(?:^|\s)(\d{2}(?:[.,]\d)?)(?=\s|$)/);
  const bruto = conUnidad?.[1] ?? suelto?.[1];
  if (!bruto) return "";
  const n = Number(bruto.replace(",", "."));
  return n >= 7 && n <= 49 ? String(n) + '"' : "";
}

/**
 * Lo que es, dicho por el nombre.
 *
 * "Equipo de red" no distingue un router de un switch de 24 puertos y
 * "Accesorio" no dice si es una memoria USB o una micro SD. La categoría sirve
 * para ordenar el catálogo; para la card hace falta el sustantivo exacto, y ese
 * está en el nombre. Gana la primera regla que coincida, de lo específico a lo
 * general.
 */
const QUE_ES_POR_NOMBRE: [RegExp, string][] = [
  [/micro\s?sd\b/i, "Memoria Micro SD"],
  [/memoria\susb|pen\s?drive|\busb\b[^,]*\d{2,4}\s?gb/i, "Memoria USB"],
  [/\bssd\b[^,]*extern|extern[^,]*\bssd\b/i, "SSD externo"],
  [/disco[^,]*extern|extern[^,]*disco/i, "Disco externo"],
  [/\b(ssd|nvme)\b/i, "Unidad SSD"],
  [/disco\sduro|\bhdd\b|\bsata\b/i, "Disco duro"],
  [/punto\sde\sacceso|access\s?point/i, "Punto de acceso"],
  [/\brouter\b/i, "Router"],
  [/\bswitch\b/i, "Switch"],
  [/\bantena\b/i, "Antena"],
  [/\brepetidor\b/i, "Repetidor"],
  [/\bhub\b|docking|replicador/i, "Hub de puertos"],
  [/\bdomo\b/i, "Cámara domo"],
  [/vigilancia|c[áa]mara[^,]*seguridad|seguridad[^,]*c[áa]mara/i, "Cámara de seguridad"],
  [/webcam|c[áa]mara[^,]*\bweb\b/i, "Cámara web"],
  [/\bcombo\b[^,]*(teclado|mouse)|teclado[^,]*mouse/i, "Teclado y mouse"],
  [/\bteclado\b/i, "Teclado"],
  [/\bmouse\b|\brat[oó]n\b/i, "Mouse"],
  [/diadema|aud[íi]fono|auricular|headset/i, "Audio"],
  [/parlante|altavoz|cabina|barra\sde\ssonido/i, "Sonido"],
  [/power\s?bank|bater[íi]a\sexterna/i, "Power bank"],
  [/\bups\b|regulador|supresor|multitoma/i, "Protección eléctrica"],
  [/antivirus|\beset\b|kaspersky|norton|mcafee/i, "Licencia de seguridad"],
  [/\boffice\b|microsoft\s365|windows\s\d\d/i, "Licencia de software"],
];

export function sustantivoDeNombre(nombre: string): string | null {
  return QUE_ES_POR_NOMBRE.find(([re]) => re.test(nombre))?.[1] ?? null;
}

/** Categoría de TIENDA → qué es, para cuando el nombre no se pronuncia. */
const QUE_ES_CATALOGO: Record<string, string> = {
  portatil: "Portátil", pc: "Equipo de escritorio", monitor: "Monitor",
  tablet: "Tablet", licencia: "Licencia", accesorio: "Accesorio",
};

/**
 * El subtítulo de una card a partir de lo que guarda el catálogo.
 *
 * Se usa como respaldo: los 63 productos que se publicaron a mano no traen
 * `descripcionUso` y dejaban un hueco en blanco entre el nombre y las specs,
 * justo donde las cards nuevas dicen "Portátil 14"".
 */
export function subtituloDeCatalogo(
  nombre: string,
  categoria: string,
  specs: Record<string, string> = {},
): string {
  const pulg = pulgadasDe(specs.pantalla) || pulgadasDe(nombre);

  if (categoria === "portatil") return pulg ? "Portátil " + pulg : "Portátil";
  if (categoria === "tablet") return pulg ? "Tablet " + pulg : "Tablet";
  if (categoria === "monitor") {
    const panel = specs.panel ? " · " + specs.panel : "";
    return (pulg ? "Monitor " + pulg : "Monitor") + panel;
  }
  if (categoria === "pc") {
    // El catálogo mete torres, todo-en-uno y servidores en "pc". Un ProLiant en
    // rack anunciado como "Equipo de escritorio" desmiente a su propio nombre.
    const rack = nombre.match(/\b(\d)U\b/);
    if (/proliant|poweredge|\bservidor\b|thinksystem|\bxeon\b|\bepyc\b/i.test(nombre))
      return rack ? "Servidor · Rack " + rack[1] + "U" : "Servidor";
    // Un todo-en-uno lleva su pantalla dentro; una torre la lleva al lado, y en
    // las listas eso se distingue por el "+ Monitor" del nombre.
    const conMonitor = /[+]\s*monitor/i.exec(nombre);
    if (conMonitor) {
      const suyo = pulgadasDe(nombre.slice(conMonitor.index));
      return "Equipo de escritorio" + (suyo ? " · Monitor " + suyo : "");
    }
    return pulg ? "Todo en uno " + pulg : "Equipo de escritorio";
  }

  return sustantivoDeNombre(nombre) ?? QUE_ES_CATALOGO[categoria] ?? "";
}

// ─── El icono de la card ─────────────────────────────────────────────────────
//
// La vitrina no tiene fotos. Sin nada que mirar, doce cards seguidas son doce
// bloques de texto y el ojo no encuentra dónde agarrarse: no distingue de un
// vistazo un portátil de un router. Un icono en la línea del subtítulo cuesta
// 16 píxeles y hace ese trabajo.
//
// Devuelve una CLAVE, no un componente: este módulo lo importan el servidor y
// el cliente, y quien pinta decide con qué dibujarla.

const ICONO_POR_NOMBRE: [RegExp, string][] = [
  [/proliant|poweredge|\bservidor\b|thinksystem|\bxeon\b|\bepyc\b/i, "servidor"],
  [/\brouter\b|punto\sde\sacceso|access\s?point|\brepetidor\b|\bantena\b/i, "red"],
  [/\bswitch\b|\bpoe\b|\bsfp\b|inyector/i, "switch"],
  [/c[áa]mara|webcam|\bnvr\b|\bdomo\b/i, "camara"],
  [/micro\s?sd|memoria\susb|pen\s?drive|\busb\b[^,]*\d{2,4}\s?gb/i, "usb"],
  [/\bssd\b|\bnvme\b|\bhdd\b|disco\sduro|\bsata\b|disco/i, "disco"],
  [/\bddr[2345]\b|sodimm|memoria\sram|\bram\b/i, "ram"],
  [/procesador|\bryzen\b|core\s?i[3579]|\bcpu\b/i, "procesador"],
  [/motherboard|\bboard\b|placa\s(base|madre)/i, "board"],
  [/tarjeta\s(de\s)?(video|gr[áa]fica)|\brtx\b|\bgtx\b|geforce|radeon/i, "grafica"],
  [/fuente\sde\s(poder|alimentaci[óo]n)|\bpsu\b|\bups\b|regulador|multitoma/i, "energia"],
  [/refrigeraci[óo]n|disipador|\bcooler\b|ventilador/i, "refrigeracion"],
  [/impresora|multifuncional|t[óo]ner/i, "impresora"],
  [/aud[íi]fono|auricular|diadema|headset|parlante|cabina|micr[óo]fono/i, "audio"],
  [/\bteclado\b|\bcombo\b/i, "teclado"],
  [/\bmouse\b|\brat[óo]n\b/i, "mouse"],
  [/antivirus|\beset\b|kaspersky|licencia|\boffice\b|windows\s\d\d|microsoft\s365/i, "licencia"],
];

const ICONO_POR_CATALOGO: Record<string, string> = {
  portatil: "portatil", pc: "escritorio", monitor: "monitor",
  tablet: "tablet", licencia: "licencia", accesorio: "accesorio",
};

/** La clave del icono que le va a esta card. El nombre manda; la categoría es
 *  el respaldo, igual que en el subtítulo. */
export function iconoDeCard(nombre: string, categoria: string): string {
  // Un equipo completo NOMBRA sus piezas —"+ RTX 5060", "16GB DDR5"— y por el
  // nombre saldría con icono de gráfica o de memoria. Ahí manda la categoría.
  if (categoria === "portatil") return "portatil";
  if (categoria === "monitor") return "monitor";
  if (categoria === "tablet") return "tablet";
  if (categoria === "pc") {
    return /proliant|poweredge|\bservidor\b|thinksystem|\bxeon\b|\bepyc\b/i.test(nombre)
      ? "servidor"
      : "escritorio";
  }
  return ICONO_POR_NOMBRE.find(([re]) => re.test(nombre))?.[1]
    ?? ICONO_POR_CATALOGO[categoria]
    ?? "accesorio";
}

// ─── Que quepa entero ────────────────────────────────────────────────────────
//
// La ficha salía cortada a media palabra —"Intel Core i5-1335U (10C 12…"— y un
// dato cortado no es un dato: el cliente no puede comparar dos equipos si a los
// dos les falta el final. El problema no era el ancho de la card, era que se
// estaba enseñando la cadena entera del proveedor, con su empaquetador, su
// socket y sus paréntesis.
//
// Aquí se queda lo que decide la compra y se tira el resto. "Intel Core
// i5-1335U (10C 12T, hasta 4.6 GHz, 12MB)" es, para elegir, "Core i5 1335U".
//
// Los guiones se cambian por espacios a propósito: "i5-1335U" parte raro y se
// lee peor que "i5 1335U".

const sinParentesis = (v: string) => v.replace(/\s*[(][^)]*[)]/g, " ");
const sinGuiones = (v: string) =>
  v.replace(/([A-Za-z\d])-(?=\d)/g, "$1 ").replace(/(\d)-(?=[A-Za-z])/g, "$1 ");
const limpio = (v: string) =>
  v.replace(/\s+/g, " ").replace(/…+\s*$/, "").replace(/[,;·]+\s*$/, "").trim();

/** "Intel Core i5-1335U (10C 12T, hasta 4.6 GHz, 12MB)" → "Core i5 1335U" */
function cpuBreve(v: string): string {
  let t = limpio(sinParentesis(v));
  t = t.split(/[,;▪|]/)[0];
  t = t.replace(/\b(intel|amd|processors?|procesador|cpu)\b/gi, " ");
  t = t.replace(/\b(lga\d*|socket|am[45]|no\svideo|vpro|box|oem|tray)\b/gi, " ");
  t = t.replace(/\s*\d+\.?\d*\s?(mb|m)\s?cache\b/gi, " ");
  t = t.replace(/\s*\d+(\.\d+)?\s*-\s*\d+(\.\d+)?\s?ghz\b/gi, " ");
  return limpio(sinGuiones(t));
}

/** "16GB DDR5-4800 SODIMM" → "16GB DDR5 4800" */
function ramBreve(v: string): string {
  const t = limpio(sinParentesis(v));
  const cap = t.match(/(\d{1,3})\s?(gb|tb)/i);
  const tipo = t.match(/\bddr\s?([2345])\b/i);
  const mhz = t.match(/(\d{4})\s?(mhz)?\b/i);
  if (!cap) return limpio(sinGuiones(t)).slice(0, 24);
  const partes = [cap[1] + cap[2].toUpperCase()];
  if (tipo) partes.push("DDR" + tipo[1]);
  if (mhz) partes.push(mhz[1] + "MHz");
  return partes.join(" ");
}

/** "512GB SSD M.2 PCIe 4.0 NVMe" → "512GB SSD NVMe" */
function discoBreve(v: string): string {
  const t = limpio(v);
  const cap = t.match(/(\d{1,4})\s?(gb|tb)/i);
  if (!cap) return limpio(sinGuiones(t)).slice(0, 24);
  const gb = Number(cap[1]) * (cap[2].toLowerCase() === "tb" ? 1000 : 1);
  const tamano = gb >= 1000 && gb % 1000 === 0 ? gb / 1000 + "TB" : gb + "GB";
  const partes = [tamano];
  if (/ssd|nvme|\bm\.?2/i.test(t)) partes.push("SSD");
  else if (/hdd|sata|\d\s?rpm|7200|5400/i.test(t)) partes.push("HDD");
  if (/\bnvme\b/i.test(t)) partes.push("NVMe");
  return partes.join(" ");
}

/** "NVIDIA GeForce RTX 3050 6GB GDDR6, Boost Clock 1732MHz" → "RTX 3050 6GB" */
function gpuBreve(v: string): string {
  const t = limpio(sinParentesis(v)).split(/[,;▪|]/)[0];
  const modelo = t.match(/\b(rtx|gtx|rx|arc)\s?(\d{3,4}\s?(ti|xt|super)?)/i);
  const vram = t.match(/(\d{1,2})\s?gb/i);
  if (!modelo) return limpio(sinGuiones(t)).slice(0, 24);
  const nombre = (modelo[1].toUpperCase() + " " + modelo[2].toUpperCase()).replace(/\s+/g, " ").trim();
  return vram ? nombre + " " + vram[1] + "GB" : nombre;
}

/** '15.6" FHD (1920x1080) IPS 300nits Anti-glare, 144Hz' → '15.6" FHD IPS 144Hz' */
function pantallaBreve(v: string): string {
  const t = limpio(sinParentesis(v)).split(/[,;▪|]/)[0];
  const pulg = pulgadasDe(t);
  const res = t.match(/\b(4k|2k|qhd|wqxga|wuxga|fhd|hd+?)\b/i);
  const panel = t.match(/\b(ips|va|tn|oled|lcd)\b/i);
  const hz = t.match(/(\d{2,3})\s?hz\b/i);
  const partes = [pulg, res?.[1].toUpperCase(), panel?.[1].toUpperCase(), hz ? hz[1] + "Hz" : ""];
  const salida = partes.filter(Boolean).join(" ");
  return salida || limpio(sinGuiones(t)).slice(0, 24);
}

const BREVE: Record<string, (v: string) => string> = {
  procesador: cpuBreve, ram: ramBreve, almacenamiento: discoBreve, capacidad: discoBreve,
  gpu: gpuBreve, pantalla: pantallaBreve, monitor: pantallaBreve,
};

/**
 * El valor de una spec tal como cabe en la card.
 *
 * Se aplica al PINTAR, no al publicar: así vale igual para los productos que
 * llenó el panel y para los 63 que se cargaron a mano, que son justo los que
 * traen las cadenas más largas.
 */
export function resumirSpec(clave: string, valor: string): string {
  const breve =
    BREVE[clave]?.(valor) ?? limpio(sinGuiones(sinParentesis(valor.split(/[▪|]/)[0])));
  // Red de seguridad: nada por encima de 26 caracteres cabe en la columna, y
  // cortar por la última palabra entera se lee mejor que cortar por la mitad.
  if (breve.length <= 26) return breve;
  return breve.slice(0, 26).replace(/\s+\S*$/, "");
}

/**
 * La ficha de lo que no es un equipo, sacada del nombre.
 *
 * Medido sobre las listas: de 289 accesorios, 287 no traen NI UNA spec; redes y
 * tablets, ninguna. Esas cards salían con el nombre, el precio y tres renglones
 * en blanco. Pero el nombre sí lo dice —"Router Archer AX53 WiFi AX3000",
 * "Cámara Logitech C920 Pro Full-HD USB"—, así que se lee de ahí.
 *
 * Sólo para lo que NO es un equipo completo: a un portátil se le lee la ficha,
 * que para eso la trae.
 */
export function specsDeNombre(nombre: string): Record<string, string> {
  const out: Record<string, string> = {};
  const n = nombre;

  // AC es Wi-Fi 5, AX es Wi-Fi 6 y BE es Wi-Fi 7: el proveedor escribe el
  // nombre comercial ("AX3000") y el cliente compara por generación.
  const GENERACION: Record<string, string> = { n: "4", ac: "5", ax: "6", be: "7" };
  const wifiGen = n.match(/wi\.?-?fi\s*([4567])\b/i);
  const wifiVel = n.match(/\b(ac|ax|be|n)\s?(\d{3,4})\b/i);
  if (wifiGen) out.estandar = "Wi-Fi " + wifiGen[1];
  else if (wifiVel) {
    const gen = GENERACION[wifiVel[1].toLowerCase()];
    out.estandar = "Wi-Fi " + gen + " " + wifiVel[1].toUpperCase() + wifiVel[2];
  } else if (/wi\.?-?fi|inal[áa]mbric/i.test(n)) out.estandar = "Wi-Fi";

  // Lo que le queda a un equipo de red cuando el nombre no trae número: qué
  // clase de aparato es. Sin esto la card de la antena salía con el nombre, el
  // precio y nada en medio.
  if (/doble\sbanda|dual[\s-]?band/i.test(n)) out.banda = "Doble banda";
  else if (/tri\s?band|triple\sbanda/i.test(n)) out.banda = "Tri banda";

  const grados = n.match(/(\d{2,3})\s?°/);
  if (/omnidireccional/i.test(n)) out.tipo = "Omnidireccional" + (grados ? " " + grados[1] + "°" : "");
  else if (/direccional/i.test(n)) out.tipo = "Direccional" + (grados ? " " + grados[1] + "°" : "");
  else if (/\badministrable\b/i.test(n)) out.tipo = "Administrable";
  else if (/no\sadministrable/i.test(n)) out.tipo = "No administrable";
  else if (/\b(exterior|outdoor)\b/i.test(n)) out.tipo = "Exterior";

  const puertos = n.match(/(\d{1,2})\s*(?:x\s*)?(?:puertos?|sfp)/i);
  if (puertos) out.puertos = puertos[1] + (/sfp/i.test(puertos[0]) ? " SFP" : "");
  if (/\bpoe\b/i.test(n)) out.puertos = (out.puertos ? out.puertos + " " : "") + "PoE";
  if (/\bgigabit\b/i.test(n)) out.velocidad = "Gigabit";
  const vatios = n.match(/(\d{2,4})\s?w\b/i);
  if (vatios) out.potencia = vatios[1] + "W";
  const diez = n.match(/\b(\d{1,2})\s?G\b/i);
  if (diez) out.velocidad = diez[1] + "G";

  const mp = n.match(/\b(\d{1,2})\s?mp\b/i);
  const res = n.match(/\b(4k|2k|1080p?|720p?)\b/i) ?? n.match(/\bfull[-\s]?hd\b/i);
  if (res) {
    out.resolucion = /full/i.test(res[0])
      ? "Full HD"
      : res[1].toUpperCase().replace("P", "p");
  }
  if (mp) out.resolucion = (out.resolucion ? out.resolucion + " · " : "") + mp[1] + "MP";

  const usb = n.match(/usb\s?([23](?:\.\d)?)\b(?!\d)/i);
  if (usb) out.interfaz = "USB " + usb[1];
  else if (/\busb\b/i.test(n)) out.interfaz = "USB";
  if (/\bbluetooth\b|\bbt\b/i.test(n)) out.conexion = "Bluetooth";

  const cap = n.match(/\b(\d{1,4})\s?(gb|tb)\b/i);
  if (cap) out.capacidad = Number(cap[1]) + cap[2].toUpperCase();

  // Una pieza suelta lleva su ficha en el nombre y en ningún otro sitio: un
  // "Intel Core i5-12400F LGA1700 (2.5GHZ)" salía con la card entera en blanco.
  const socket = n.match(/\b(lga\s?\d{3,4}|am[45]|sp[35])\b/i);
  if (socket) out.tipo = socket[1].toUpperCase().replace(/\s+/g, "");
  const ghz = n.match(/(\d(?:\.\d)?)\s?ghz\b/i);
  if (ghz) out.velocidad = ghz[1] + "GHz";

  return out;
}
