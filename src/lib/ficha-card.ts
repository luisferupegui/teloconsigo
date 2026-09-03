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
