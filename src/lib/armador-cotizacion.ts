import "server-only";
import { loadActiveProducts, loadMargins, applyMargin } from "./supplier-catalog";

// ─── Cotización del Armador de PC, pieza por pieza ────────────────────────────
//
// Por qué existe este archivo:
//
// El armador produce un equipo A LA MEDIDA, pero antes se cotizaba buscando en las listas
// un PC prefabricado "parecido". Eso es lossy por definición: el cliente elegía Core i7 +
// RTX 4060 + 32GB + monitor de 27", y lo que se encontraba era una torre con otra RAM, sin
// monitor, o directamente sin gráfica dedicada. No es un fallo de relevancia que se arregle
// afinando el buscador — es que la pregunta estaba mal hecha.
//
// Un equipo a la medida se cotiza como lo cotiza un técnico: sumando sus piezas. Cada una
// se busca primero en NUESTRAS listas (entrega rápida) y, si no la tenemos, se consigue
// (entrega larga). El cliente nunca sabe de dónde sale cada pieza: solo ve su equipo, su
// precio y una fecha.

export type Entrega = "local" | "us";

export type PiezaPedida = {
  /** Cómo se llama en el armador: "Procesador", "Tarjeta gráfica"… */
  etiqueta: string;
  /** Lo que eligió el cliente: "Core i7-14700K". */
  valor: string;
  /** Categorías del inventario donde tiene sentido buscarla. */
  categorias: string[];
  /** Cómo se llama esta pieza en el mercado. Es lo que ancla la búsqueda web: sin ello,
   *  "Aire de alto desempeño" + "Refrigeración" devolvía AIRES ACONDICIONADOS de $1.8
   *  millones, y entraban en la cotización del equipo. */
  contexto: string;
  /** Palabras que un resultado debe contener para ser esa pieza y no otra cosa. */
  senales: RegExp;
  /** Sin ella no hay equipo: si no se puede cotizar, no se puede cotizar el conjunto. */
  esencial: boolean;
};

export type PiezaCotizada = PiezaPedida & {
  /** El producto concreto que se cotizó. */
  nombre: string;
  precio: number;
  entrega: Entrega;
  /** Lo que nos cuesta. Es lo que permite saber hasta dónde se puede ajustar el precio
   *  del conjunto sin vender por debajo del costo. */
  costo?: number;
};

// Etiqueta del armador → dónde buscarla y si es imprescindible.
type DefPieza = { categorias: string[]; esencial: boolean; contexto: string; senales: RegExp };

const MAPA: Record<string, DefPieza> = {
  "procesador": {
    categorias: ["procesador"], esencial: true,
    contexto: "procesador", senales: /\b(procesador|cpu|ryzen|core|intel|amd|threadripper|xeon)\b/i,
  },
  "tarjeta gráfica": {
    categorias: ["tarjeta-grafica"], esencial: true,
    contexto: "tarjeta de video", senales: /\b(tarjeta|video|grafica|gpu|rtx|gtx|radeon|geforce|rx)\b/i,
  },
  "memoria ram": {
    categorias: ["memoria-ram"], esencial: true,
    contexto: "memoria ram", senales: /\b(memoria|ram|ddr[45]|dimm)\b/i,
  },
  "almacenamiento": {
    categorias: ["almacenamiento"], esencial: true,
    contexto: "disco duro ssd", senales: /\b(ssd|nvme|disco|hdd|m\.?2|almacenamiento)\b/i,
  },
  "disco adicional": {
    categorias: ["almacenamiento"], esencial: false,
    contexto: "disco duro ssd", senales: /\b(ssd|nvme|disco|hdd|m\.?2|dvd|optic[ao]|quemador)\b/i,
  },
  "motherboard": {
    categorias: ["motherboard"], esencial: true,
    contexto: "board tarjeta madre", senales: /\b(board|motherboard|madre|mainboard|asus|gigabyte|msi|asrock)\b/i,
  },
  "monitor": {
    categorias: ["monitor"], esencial: false,
    contexto: "monitor", senales: /\b(monitor|pantalla|display)\b/i,
  },
  "refrigeración": {
    // "cooler cpu" y no "refrigeración": esa palabra sola trae aires acondicionados.
    categorias: ["refrigeracion"], esencial: false,
    contexto: "cooler cpu disipador", senales: /\b(cooler|disipador|ventilador|refrigeraci[oó]n\s+l[ií]quida|water\s?cooling|aio)\b/i,
  },
  "fuente de poder": {
    categorias: ["fuente-poder"], esencial: true,
    contexto: "fuente de poder", senales: /\b(fuente|psu|power\s?supply|80\s?plus|80\+)\b/i,
  },
  "gabinete": {
    categorias: ["escritorio", "accesorios"], esencial: false,
    contexto: "gabinete torre pc", senales: /\b(gabinete|chasis|case|torre)\b/i,
  },
  "teclado y mouse": {
    categorias: ["teclado", "mouse", "perifericos", "accesorios"], esencial: false,
    contexto: "combo teclado y mouse", senales: /\b(teclado|mouse|combo|keyboard)\b/i,
  },
};

/** Valores que significan "no lleva esta pieza" o "ya va incluida en el ensamble".
 *  El gabinete estándar y el cooler de caja entran aquí: son lo que permite que un
 *  equipo salga en 1 a 3 días, y cobrarlos aparte sería cobrar dos veces. */
const NO_LLEVA = /^(sin\b|no\b|solo torre|gráficos integrados|graficos integrados)|\(inclu[ií]d[oa]\)\s*$/i;

/** Descompone el resumen del armador en piezas cotizables. */
export function piezasDeConfig(config: string): PiezaPedida[] {
  const piezas: PiezaPedida[] = [];
  for (const tramo of config.split("·")) {
    const m = tramo.match(/^\s*([^:]+):\s*(.+?)\s*$/);
    if (!m) continue;
    const etiqueta = m[1].trim();
    const valor = m[2].trim();
    const def = MAPA[etiqueta.toLowerCase()];
    if (!def) continue;                 // "Plataforma", y cualquier cosa que no sea una pieza
    if (NO_LLEVA.test(valor)) continue; // el cliente eligió no llevarla
    piezas.push({ etiqueta, valor, ...def });
  }
  return piezas;
}

// ─── Búsqueda de una pieza en nuestras listas ─────────────────────────────────

const GENERICAS = new Set([
  "de", "con", "para", "y", "el", "la", "los", "las", "gb", "tb", "pulgadas",
  "combo", "adicional", "incluida", "alto", "desempeño", "gamer", "gaming",
]);

function normalizar(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/(\d)\s+(gb|tb|mm|hz|w)\b/g, "$1$2")
    .trim();
}

/** Un token es EXIGIBLE cuando identifica el producto: una capacidad ("1tb", "32gb") o un
 *  número de modelo ("4060", "14700k"). Los adjetivos ("gen4", "ips", "nvme") solo suman
 *  puntos: exigirlos todos dejaba fuera al producto correcto, porque cada lista de
 *  proveedor describe la misma pieza con otras palabras. */
function partirTokens(valor: string): { exigidos: string[]; opcionales: string[] } {
  const tokens = normalizar(valor).split(/\s+/).filter((t) => t.length >= 2 && !GENERICAS.has(t));
  const exigidos: string[] = [];
  const opcionales: string[] = [];
  for (const t of tokens) {
    const esCapacidad = /^\d+(gb|tb)$/.test(t);
    const esModelo = /^[a-z]{0,2}\d{3,5}[a-z]{0,3}$/.test(t) && /\d{3}/.test(t);
    (esCapacidad || esModelo ? exigidos : opcionales).push(t);
  }
  return { exigidos, opcionales };
}

// Un EQUIPO COMPLETO nombra su procesador; una pieza suelta no. Las listas de proveedor
// archivan PCs enteros bajo la categoría de una de sus piezas —un "EQUIPO PC RYZEN 5 /
// ASUS PRIME A520M / SSD 512GB" catalogado como `almacenamiento`— y al cotizar el disco
// de la configuración se elegía ese equipo entero: $2.628.000 por un SSD.
const NOMBRA_CPU = /\b(ryzen|core\s?i[3579]|core\s?ultra|pentium|celeron|athlon|xeon|threadripper|i[3579]-\d{3,4})\b/i;

/** ¿El token aparece como PALABRA en el texto? La comparación por subcadena convertía
 *  "alámbrico" en una coincidencia de "inalámbrico", y el cliente que pedía un combo con
 *  cable recibía uno inalámbrico. Los tokens con cifra ('rtx4060') sí admiten pegado,
 *  porque cada lista escribe los modelos a su manera. */
function contieneToken(texto: string, token: string): boolean {
  if (new RegExp(`(^| )${token}( |$)`).test(texto)) return true;
  return /\d/.test(token) && token.length >= 4 && texto.replace(/ /g, "").includes(token);
}

// Accesorios pequeños: teclados, mouse, combos, cables, memorias USB. Cuando hay
// varios candidatos que sirven igual, aquí se toma el MÁS CARO, no el más barato.
// Es una decisión comercial del negocio: en un artículo de $50.000 la diferencia entre
// el más barato y el mejor es de unos pocos miles de pesos, pero la calidad que llega
// al cliente no es la misma — y una devolución cuesta más que el ahorro.
// En piezas de valor alto (procesador, gráfica, placa) sigue mandando el más económico:
// ahí unos miles de pesos de diferencia son cientos de miles.
const CATEGORIAS_ACCESORIO = new Set([
  "accesorios", "teclado", "mouse", "perifericos", "auriculares", "redes",
]);

export function esAccesorioPequeno(categorias: string[]): boolean {
  return categorias.some((c) => CATEGORIAS_ACCESORIO.has(c));
}

type Candidato = { nombre: string; precio: number; costo: number; puntos: number };

/** La pieza en NUESTRAS listas, al precio que pagaría el cliente. `null` si no la tenemos.
 *  Entre las que cumplen igual de bien, la más económica — salvo en accesorios pequeños,
 *  donde el negocio prefiere la de mayor valor (ver `CATEGORIAS_ACCESORIO`). */
export function cotizarPiezaLocal(pieza: PiezaPedida): PiezaCotizada | null {
  const { exigidos, opcionales } = partirTokens(pieza.valor);
  if (exigidos.length === 0 && opcionales.length === 0) return null;

  const margins = loadMargins();
  const candidatos: Candidato[] = [];

  const buscandoCpu = pieza.categorias.includes("procesador");
  for (const p of loadActiveProducts()) {
    if (!pieza.categorias.includes(p.categoria)) continue;
    // Un equipo entero no es una pieza. Salvo, claro, cuando la pieza ES el procesador.
    if (!buscandoCpu && NOMBRA_CPU.test(p.nombre)) continue;
    const h = normalizar(`${p.nombre} ${Object.values(p.specs ?? {}).join(" ")}`);
    if (!exigidos.every((t) => contieneToken(h, t))) continue;
    // Sin tokens exigibles (un "Combo gamer inalámbrico") hace falta al menos una
    // coincidencia real, o cualquier producto de la categoría valdría.
    const puntos = opcionales.filter((t) => contieneToken(h, t)).length;
    if (exigidos.length === 0 && puntos === 0) continue;
    candidatos.push({ nombre: p.nombre, precio: applyMargin(p.precio_costo, p.categoria, margins), costo: p.precio_costo, puntos });
  }
  if (candidatos.length === 0) return null;

  // La relevancia manda siempre; el precio solo desempata, y en qué dirección lo hace
  // depende del tipo de pieza.
  const caroPrimero = esAccesorioPequeno(pieza.categorias);
  candidatos.sort((a, b) => b.puntos - a.puntos || (caroPrimero ? b.precio - a.precio : a.precio - b.precio));
  const mejor = candidatos[0];
  return { ...pieza, nombre: mejor.nombre, precio: mejor.precio, costo: mejor.costo, entrega: "local" };
}

// ─── Fuente de poder: se elige por CONSUMO, no por gusto ──────────────────────
//
// El armador no le pregunta al cliente por la fuente —no tendría por qué saberlo— pero un
// equipo sin fuente no enciende. La elige el servidor a partir de la gráfica, que es lo que
// manda en el consumo, con holgura para no trabajar la fuente al límite.

const VATIOS_POR_GPU: [RegExp, number][] = [
  [/\b(rtx\s?50[89]0|rtx\s?40[89]0)\b/i, 1000],
  [/\b(rtx\s?5070|rtx\s?4070|rx\s?79\d0)\b/i, 850],
  [/\b(rtx\s?5060|rtx\s?4060|rtx\s?3060|rx\s?9060|rx\s?76\d0)\b/i, 650],
  [/\b(rtx\s?3050|rtx\s?5050|gtx\s?16\d0)\b/i, 550],
];

/** Vatios recomendados para una configuración. Sin gráfica dedicada, una fuente básica. */
export function vatiosRecomendados(config: string): number {
  for (const [re, w] of VATIOS_POR_GPU) if (re.test(config)) return w;
  return 500;
}

/** Fuente de poder de nuestras listas con potencia suficiente, la más económica. */
export function cotizarFuente(vatios: number): PiezaCotizada | null {
  const margins = loadMargins();
  const candidatos: Candidato[] = [];
  for (const p of loadActiveProducts()) {
    if (p.categoria !== "fuente-poder") continue;
    const w = Number(p.nombre.match(/(\d{3,4})\s*w\b/i)?.[1] ?? 0);
    if (w < vatios) continue;
    candidatos.push({ nombre: p.nombre, precio: applyMargin(p.precio_costo, p.categoria, margins), costo: p.precio_costo, puntos: 0 });
  }
  if (candidatos.length === 0) return null;

  // Entre las que dan la potencia, se prefiere una CERTIFICADA (80 PLUS). Sin este filtro
  // se elegía siempre la más barata, y en un equipo con gráfica dedicada de dos millones
  // eso significaba una fuente genérica de $97.000 alimentándolo: es justo la pieza donde
  // ahorrar sale caro, porque cuando falla se lleva por delante lo que tiene conectado.
  const certificadas = candidatos.filter((c) => /80\s*\+|80\s*plus/i.test(c.nombre));
  const elegibles = certificadas.length > 0 ? certificadas : candidatos;
  elegibles.sort((a, b) => a.precio - b.precio);
  const fuente = elegibles[0];
  return {
    etiqueta: "Fuente de poder", valor: `${vatios}W`, categorias: ["fuente-poder"], esencial: true,
    contexto: "fuente de poder", senales: /\b(fuente|psu|power\s?supply|80\s?plus)\b/i,
    nombre: fuente.nombre, precio: fuente.precio, costo: fuente.costo, entrega: "local",
  };
}

/** Gabinete, cableado y mano de obra del ensamble. Es una línea fija porque no depende de
 *  la configuración: armar, probar y entregar cuesta lo mismo en cualquier equipo. */
export const ENSAMBLE_COP = 350_000;

// ─── Total y ficha ────────────────────────────────────────────────────────────

/** La entrega del conjunto la marca la pieza más lenta: de nada sirve tener nueve piezas
 *  hoy si la décima llega en ocho días. */
export function entregaDelConjunto(piezas: PiezaCotizada[]): Entrega {
  return piezas.some((p) => p.entrega === "us") ? "us" : "local";
}

/** Precio mínimo al que se puede entregar el equipo: el costo de sus piezas más un
 *  margen mínimo de operación. Ningún ajuste de mercado puede bajar de aquí.
 *  `null` si alguna pieza no tiene costo conocido: sin saber lo que cuesta el conjunto
 *  no se puede afirmar dónde está el suelo, y bajar a ciegas es peor que no ajustar. */
export const MARGEN_MINIMO = 0.12;

export function pisoDeConfiguracion(piezas: PiezaCotizada[]): number | null {
  if (piezas.some((p) => p.costo == null)) return null;
  const costo = piezas.reduce((t, p) => t + (p.costo ?? 0), 0) + ENSAMBLE_COP;
  return Math.round((costo * (1 + MARGEN_MINIMO)) / 1000) * 1000;
}

export function totalDeConfiguracion(piezas: PiezaCotizada[]): number {
  const suma = piezas.reduce((t, p) => t + p.precio, 0) + ENSAMBLE_COP;
  return Math.round(suma / 1000) * 1000;
}
