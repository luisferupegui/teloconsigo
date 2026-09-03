import "server-only";
import { loadBusinessProducts, saveBusinessProducts } from "@/lib/products";
import { loadActiveProducts, loadMargins, applyMargin, type ActiveProduct } from "@/lib/supplier-catalog";
import { ramYDisco, sinVram, pantallaDesdeNombre } from "@/lib/specs-nombre";
import { categoriaPorNombre } from "@/lib/catimporter/parsers/categorias";
import { marcaDeNombre } from "@/lib/marcas";
import { pulgadasDe, sustantivoDeNombre, specsDeNombre } from "@/lib/ficha-card";

// ─── Llenar la vitrina con lo mejor de las listas del mes ────────────────────
//
// Las doce secciones de /soluciones se llenaron a mano una vez. Hoy hay
// secciones con UNA sola card —Gaming, Creadores, Componentes— y una card suelta
// no parece una promoción: parece una tienda vacía.
//
// Esto propone hasta 8 por sección tomándolas de las listas vigentes. No
// publica: propone, y quien mira decide. Es el escaparate, no una lista interna.

// ─── Cuántas cards quiere cada sección ───────────────────────────────────────
//
// Una escalera de tres peldaños, y el peldaño ES la importancia de la sección:
//
//    4  el mínimo para que parezca una tienda. Por debajo se ve rota, no
//       surtida, y la pantalla lo avisa en vez de dejar dos cards huérfanas.
//    8  lo normal. Llena una rejilla de 4×2 sin huecos.
//   12  las que mandan. Accesorios es la primera: es lo que más busca la gente
//       y donde más rota el surtido, así que aguanta —y pide— rejilla larga.
//
// El cupo se declara EN la sección, no se deduce de su nombre: subir una
// sección de 8 a 12 es decidir que importa más, y eso se escribe.

export const CUPO = 8;
export const MINIMO = 4;

const cupoDe = (s: SeccionVitrina) => s.cupo ?? CUPO;

// ─── Que la card diga algo ───────────────────────────────────────────────────
//
// La card de promoción muestra nombre, descripción y hasta TRES specs. Publicar
// con `specs: {}` deja una card con el nombre y el precio y tres renglones
// vacíos de relleno: ocupa sitio y no ayuda a decidir.
//
// Las listas traen las specs con nombres distintos según el proveedor
// —"memoria" y "ram", "disco_duro" y "almacenamiento", "os" y "sistema
// operativo"— y además con claves internas que NO deben salir a la web, como
// `seccion` (la columna del PDF de donde salió) o `detalle`.

/** Clave de lista → clave que la card sabe etiquetar. `null` = no se muestra. */
const ALIAS_SPEC: Record<string, string | null> = {
  procesador: "procesador", cpu: "procesador",
  ram: "ram", memoria: "ram", "memoria ram": "ram",
  almacenamiento: "almacenamiento", disco: "almacenamiento", disco_duro: "almacenamiento",
  pantalla: "pantalla", monitor: "monitor",
  os: "so", so: "so", "s.o": "so", sistema_operativo: "so",
  tvideo: "gpu", gpu: "gpu", "tarjeta de video": "gpu",
  conectividad: "conectividad", capacidad: "capacidad", interfaz: "interfaz",
  resolucion: "resolucion", "resolución": "resolucion", estandar: "estandar", puertos: "puertos",
  conexion: "conexion", "conexión": "conexion", banda: "banda", tipo: "tipo", potencia: "potencia",
  garantia: "garantia", velocidad: "velocidad", frecuencia: "frecuencia",
  version: "version", duracion: "duracion", cobertura: "cobertura", incluye: "incluye",
  // Internas del lector o del catálogo: nunca a la vitrina.
  seccion: null, detalle: null, board: null, combo: null, filtro: null,
  iluminacion: null, perifericos: null, chasis: null,
};

/** Orden en que se muestran: la card enseña las tres primeras, así que lo que
 *  decide una compra va delante. */
const ORDEN_SPEC = ["procesador", "ram", "almacenamiento", "gpu", "pantalla", "monitor", "so",
  "capacidad", "resolucion", "tecnologia", "estandar", "banda", "velocidad", "puertos", "potencia", "tipo",
  "conexion", "interfaz", "frecuencia", "cobertura", "duracion", "version", "conectividad", "incluye"];

// ─── Que la ficha se lea como una ficha ──────────────────────────────────────
//
// Las listas escriben la memoria como "ADATA SPECTRIX D35G 16GB DDR4 3200MHZ" y
// el disco como "SSD HIKSEMI 512GB WAPE (P) M.2": el fabricante de la pieza, su
// nombre comercial y la referencia interna. Nada de eso decide una compra —el
// cliente compara 16GB contra 8GB— y al recortar a 32 caracteres la card
// enseñaba "HIKSEMI ARMOR / ADATA XPG…" sin llegar a decir cuánta memoria trae.
//
// Se normaliza ANTES de recortar, que si no se recorta la parte que importa.

const CAPACIDAD = /(\d{1,4})\s?(gb|tb)/i;

/** "SODIMM DDR4-8GB BUS DE 3200" → "8GB DDR4 3200MHz" */
function ramCorta(v: string): string {
  const cap = v.match(CAPACIDAD);
  if (!cap) return v;
  const tipo = v.match(/\bddr\s?([2345])/i);
  const mhz = v.match(/(\d{4})\s?mhz/i) ?? v.match(/bus\s*(?:de)?\s*(\d{4})/i);
  const partes = [Number(cap[1]) + cap[2].toUpperCase()];
  if (tipo) partes.push("DDR" + tipo[1]);
  if (mhz) partes.push(mhz[1] + "MHz");
  return partes.join(" ");
}

/** "SSD HIKSEMI 512GB WAPE (P) M.2" → "512GB SSD M.2" */
function discoCorto(v: string): string {
  const cap = v.match(CAPACIDAD);
  if (!cap) return v;
  const gb = Number(cap[1]) * (cap[2].toLowerCase() === "tb" ? 1000 : 1);
  const tamano = gb >= 1000 && gb % 1000 === 0 ? gb / 1000 + "TB" : gb + "GB";
  const tecnologia = /ssd|nvme|\bm\.?2/i.test(v) ? "SSD"
    : /hdd|sata|mec[áa]nic/i.test(v) ? "HDD" : "";
  const partes = [tamano, tecnologia].filter(Boolean);
  if (/\bnvme\b/i.test(v)) partes.push("NVMe");
  else if (/\bm\.?2/i.test(v)) partes.push("M.2");
  return partes.join(" ");
}

/** "AMD RYZEN 7 8700F 4,1GHZ" → "AMD Ryzen 7 8700F 4.1GHz" */
const COMO_SE_LEE: Record<string, string> = {
  amd: "AMD", intel: "Intel", ryzen: "Ryzen", core: "Core", ultra: "Ultra",
  xeon: "Xeon", athlon: "Athlon", celeron: "Celeron", pentium: "Pentium",
};
function cpuCorta(v: string): string {
  const t = v
    .replace(/\bprocessors?\b/i, "")
    .replace(/\s*[(][^)]*[)]/g, "")
    .replace(/core\s?i(\d)/i, "Core i$1")
    .replace(/(\d),(\d)\s?ghz/i, "$1.$2GHz")
    .replace(/(\d(?:\.\d)?)\s?ghz/i, "$1GHz")
    .replace(/\s+/g, " ")
    .trim();
  return t.split(" ").map((w) => COMO_SE_LEE[w.toLowerCase()] ?? w).join(" ");
}


/** Quién sabe acortar cada spec. Lo que no está aquí se muestra tal cual. */
const ACORTA: Record<string, (v: string) => string> = {
  // "capacidad" pasa por el mismo sitio que el disco: 1000GB es como lo escribe
  // el proveedor y 1TB es como se compra.
  procesador: cpuCorta, ram: ramCorta, almacenamiento: discoCorto, capacidad: discoCorto,
};


/** Las specs del producto tal como las va a leer un cliente en la card. */
export function specsParaCard(p: ActiveProduct): Record<string, string> {
  const bruto: Record<string, string> = {};
  for (const [k, v] of Object.entries(p.specs ?? {})) {
    const clave = ALIAS_SPEC[k.toLowerCase().replace(/_/g, " ").trim()]
      ?? ALIAS_SPEC[k.toLowerCase()] ?? null;
    if (!clave || !v?.trim() || bruto[clave]) continue;
    bruto[clave] = v;
  }

  // Lo que la ficha no trae pero el nombre sí. "Ryzen 5 5600GT 16GB 512GB" lleva
  // la memoria y el disco dentro del propio nombre en media docena de listas.
  if (EQUIPOS_COMPLETOS.has(p.categoria)) {
    const { ram, disco } = ramYDisco(sinVram(`${p.nombre} ${Object.values(p.specs ?? {}).join(" ")}`));
    if (!bruto.ram && ram) bruto.ram = `${ram}GB`;
    if (!bruto.almacenamiento && disco) bruto.almacenamiento = disco >= 1024 ? `${disco / 1024}TB` : `${disco}GB`;
    if (!bruto.pantalla && !bruto.monitor) {
      const pulg = pantallaDesdeNombre(p.nombre);
      if (pulg) bruto.pantalla = pulg;
    }
  } else {
    // Un USB de 128GB no tiene 128GB de RAM: leerle la memoria a un accesorio
    // con la regla de los equipos ponía "RAM 128GB" en la card.
    for (const [k, v] of Object.entries(specsDeNombre(p.nombre))) if (!bruto[k]) bruto[k] = v;
    // La etiqueta "SSD" sobre un WD Blue SATA es mentira, y sobre una memoria
    // USB no significa nada: en lo que no es un equipo, eso es capacidad.
    if (bruto.almacenamiento) {
      bruto.capacidad = bruto.capacidad ?? bruto.almacenamiento;
      delete bruto.almacenamiento;
    }
  }

  const salida: Record<string, string> = {};
  for (const clave of ORDEN_SPEC) {
    if (!bruto[clave]) continue;
    salida[clave] = (ACORTA[clave] ?? ((x: string) => x))(bruto[clave]).trim();
  }
  return salida;
}

/**
 * ¿La ficha se contradice con el nombre?
 *
 * En la vitrina salió un "HP 15-FC0275LA AMD Ryzen 7 7730U / RAM 16GB" cuya
 * ficha decía "Intel Core i3 1215U" y "8GB": el lector arrastró las specs de la
 * fila de al lado. No es un detalle de maquetación —el cliente compara por
 * procesador y por RAM, y estaría comparando los de otro equipo—.
 *
 * Cuando el nombre y la ficha no dicen lo mismo, la fila entera es sospechosa,
 * así que la card no sale. No se "arregla" quitando la spec que molesta: si el
 * procesador vino corrido, la RAM y el disco vienen del mismo sitio.
 */
const MARCA_INTEL = /intel|core\s*(i[3579]|ultra|\d)/i;
const MARCA_AMD = /\b(amd|ryzen|athlon)\b/i;

function fichaContradice(p: ActiveProduct, specs: Record<string, string>): boolean {
  const cpu = specs.procesador ?? "";
  if (cpu) {
    const nIntel = MARCA_INTEL.test(p.nombre), nAmd = MARCA_AMD.test(p.nombre);
    const sIntel = MARCA_INTEL.test(cpu), sAmd = MARCA_AMD.test(cpu);
    if (nAmd && !nIntel && sIntel && !sAmd) return true;
    if (nIntel && !nAmd && sAmd && !sIntel) return true;
  }

  // La RAM del nombre contra la de la ficha. Se lee del nombre sin la VRAM de la
  // gráfica, que si no un "+ RTX 5060 8GB" pasaría por memoria del equipo.
  const delNombre = ramYDisco(sinVram(p.nombre)).ram;
  const deLaFicha = Number((specs.ram ?? "").match(/(\d{1,3})\s?GB/i)?.[1] ?? 0);
  if (delNombre && deLaFicha && delNombre !== deLaFicha) return true;

  return false;
}

/**
 * ¿Esta card va a decirle algo al cliente?
 *
 * La información puede venir de las specs O DEL NOMBRE, y de qué producto sea
 * depende cuál manda. Medido sobre las listas:
 *
 *   equipos completos  →  tienen ficha: procesador, RAM, disco, gráfica
 *   accesorios         →  289 productos, 287 sin una sola spec reconocida
 *   antivirus          →  153 productos, 153 sin specs
 *   redes, tablets     →  ninguno con specs
 *
 * Pero esos nombres miden 36 y 54 caracteres y lo dicen todo: "Combo Genius
 * Inalámbrico Teclado Y Mouse US KM-8101", "Kaspersky Small Office Security 10
 * Users, 1 Año". Exigirles specs habría vaciado seis de las doce secciones para
 * proteger a las otras seis.
 *
 * Así que a un portátil se le exige ficha —sin RAM ni disco no se compara— y a
 * un accesorio se le exige un nombre que describa.
 */
const EQUIPOS_COMPLETOS = new Set([
  "portatil", "escritorio", "escritorio-alto-rendimiento", "all-in-one", "mini-pc", "servidor",
]);

function suficienteInfo(p: ActiveProduct, specs: Record<string, string>): boolean {
  if (EQUIPOS_COMPLETOS.has(p.categoria)) return Object.keys(specs).length >= 2;
  const palabras = p.nombre.trim().split(/\s+/).filter((w) => w.length > 1).length;
  return p.nombre.trim().length >= 24 && palabras >= 3;
}

/** Qué es el producto, en la línea que va bajo el nombre en la card.
 *
 *  Se arma con lo que se sabe y nada más. Nada de "ideal para tu productividad":
 *  el cliente que está comparando ocho equipos no lee adjetivos, lee datos. */
const QUE_ES: Record<string, string> = {
  portatil: "Portátil", escritorio: "Equipo de escritorio",
  "escritorio-alto-rendimiento": "Escritorio alto rendimiento",
  "all-in-one": "Todo en uno", "mini-pc": "Mini PC", servidor: "Servidor",
  monitor: "Monitor", tableta: "Tablet", celular: "Celular",
  impresora: "Impresora", redes: "Equipo de red",
  antivirus: "Licencia de seguridad", licencia: "Licencia", camara: "Cámara",
  teclado: "Teclado", mouse: "Mouse", auriculares: "Audio", televisor: "Televisor",
  almacenamiento: "Almacenamiento", "memoria-ram": "Memoria RAM", procesador: "Procesador",
  motherboard: "Board", "tarjeta-grafica": "Tarjeta de video", "fuente-poder": "Fuente de poder",
  proteccion: "Protección eléctrica", refrigeracion: "Refrigeración",
  accesorios: "Accesorio", software: "Software",
};


/**
 * La línea que va bajo el nombre.
 *
 * Antes decía "PC de alto rendimiento · Power Group · gráfica dedicada": repetía
 * la marca que ya está en el nombre y gastaba la línea en un adjetivo. Lo que el
 * cliente no puede deducir del nombre es el FORMATO —si es portátil o torre, y
 * de qué tamaño—, así que eso es lo que va: "Portátil 14"",
 * "Escritorio de alto rendimiento · Monitor 23.8"".
 *
 * La marca sólo se nombra si el nombre no la lleva ya.
 */

function descripcionDe(p: ActiveProduct, specs: Record<string, string>, marca: string): string {
  const base = QUE_ES[p.categoria] ?? "Equipo";

  if (EQUIPOS_COMPLETOS.has(p.categoria)) {
    // La pantalla del portátil forma parte de lo que es; el monitor de una torre
    // es algo que viene ADEMÁS, y por eso se nombra aparte.
    const propia = pulgadasDe(specs.pantalla) || pulgadasDe(p.nombre);
    const aparte = pulgadasDe(specs.monitor);

    // Una torre no tiene pantalla. El "Compumax Core i7-13620H 8GB 500GB" venía
    // en la lista como `escritorio` y traía "LCD 15.6"", lector de huella y
    // cámara: es un portátil mal clasificado, y en la card salía como "Equipo de
    // escritorio" sin tamaño. Manda la pantalla, no la columna de la lista.
    const conPantalla = propia && p.categoria !== "portatil" && !aparte;
    if (conPantalla) {
      const n = Number(propia.replace('"', ""));
      return (n <= 17 ? "Portátil " : "Todo en uno ") + propia;
    }

    const partes = [propia && p.categoria === "portatil" ? base + " " + propia : base];
    if (aparte) partes.push("Monitor " + aparte);
    return partes.join(" · ");
  }

  const partes = [sustantivoDeNombre(p.nombre) ?? base];
  const sinTildes = (t: string) => t.normalize("NFD").replace(/[^a-zA-Z0-9 ]/g, "").toLowerCase();
  if (marca && !sinTildes(p.nombre).includes(sinTildes(marca))) partes.push(marca);
  return partes.join(" · ");
}

/**
 * Qué alimenta cada sección.
 *
 * `campo` y `valor` son EXACTAMENTE lo que filtra /soluciones; publicar con otra
 * cosa deja el producto fuera de la vitrina aunque esté en el catálogo.
 *
 * `categorias` son las categorías de LISTA que pueden entrar, y `rango` acota
 * por precio cuando la misma categoría alimenta dos secciones distintas: un
 * escritorio de $1,5M es "Hogar y Estudio" y uno de $4M es "Productividad", y
 * son el mismo `escritorio` en la lista del proveedor.
 */
export type SeccionVitrina = {
  id: string;
  nombre: string;
  campo: "usoCaso" | "segmento";
  valor: string;
  categorias: string[];
  /** Tope de precio de venta, cuando la sección es la gama de entrada. */
  hasta?: number;
  /** Piso de precio de venta, cuando la sección es la gama alta. */
  desde?: number;
  /**
   * Señal que el nombre TIENE que llevar para entrar, y a qué categorías se les
   * exige. Es para cuando la categoría de lista no distingue lo que la sección
   * promete: todos los portátiles son `portatil`, gamer o de oficina.
   */
  exige?: { categorias: string[]; patron: RegExp };
  /** Lo que la sección no admite aunque su categoría encaje. */
  excluye?: RegExp;
  /** Cuántas cards quiere: 12 las que mandan, 8 el resto. Ver la escalera. */
  cupo?: 8 | 12;
};

export const SECCIONES: SeccionVitrina[] = [
  // Mezcla portátiles y escritorio a propósito: es la sección de "un equipo para
  // la casa", y ahí el cliente compara las dos cosas. Por eso filtra por
  // segmento y no por usoCaso, que solo admitiría portátiles.
  { id: "hogar-estudio", nombre: "Hogar y Estudio", campo: "segmento", valor: "hogar-estudio",
    categorias: ["portatil", "escritorio", "all-in-one"], hasta: 2_600_000 },

  // Los portátiles gamer pertenecen aquí tanto como las torres. El piso de
  // precio es lo que evita que entre un portátil de oficina: por debajo de tres
  // millones no hay gráfica dedicada que valga.
  // El piso de precio no bastaba: por encima de tres millones hay ultrabooks de
  // oficina —un Zenbook OLED, un HP 240 G10— que no son máquinas de juego y
  // dejaban la sección sin credibilidad. A un portátil se le exige que lo diga:
  // gráfica dedicada o línea gamer. A una torre no, que para eso está en
  // `escritorio-alto-rendimiento`.
  // Sin `tarjeta-grafica`: una gráfica suelta es una pieza y su sitio es
  // Componentes. Aquí van máquinas.
  { id: "gaming-streaming", nombre: "Gaming y Streaming", campo: "segmento", valor: "gaming-streaming",
    categorias: ["escritorio-alto-rendimiento", "portatil"], desde: 3_000_000,
    // La señal se le pide también a las torres: entre los ensamblados hay
    // "JANUS WORKSTATION Core i5-12400" sin gráfica dedicada, que es una buena
    // máquina de oficina y una mala card en la sección de juego.
    exige: { categorias: ["portatil", "escritorio-alto-rendimiento"],
      patron: /rtx|gtx|geforce|radeon|\brx\s?\d{4}\b|\btuf\b|\brog\b|nitro|predator|victus|katana|legion|\bloq\b|\bomen\b|gam(ing|er)/i } },

  { id: "productividad-oficina", nombre: "Productividad y Oficina", campo: "usoCaso", valor: "pc-empresarial",
    categorias: ["escritorio", "all-in-one", "mini-pc"], desde: 2_000_000 },

  { id: "movilidad-premium", nombre: "Movilidad Premium", campo: "usoCaso", valor: "portatil-ejecutivo",
    categorias: ["portatil"], desde: 2_600_000 },

  // La categoría `redes` de las listas recoge lo que el lector no supo colocar
  // —se coló una board "ASUS TUF X870 PLUS GAMING WIFI"—, así que aquí el nombre
  // tiene que decir qué aparato es.
  { id: "redes-servidores", nombre: "Redes y Servidores", campo: "segmento", valor: "redes-servidores",
    categorias: ["redes", "servidor"],
    exige: { categorias: ["redes"],
      patron: /\b(router|switch|antena|repetidor|firewall|poe|inyector|balanceador|nvr)\b|punto\sde\sacceso|access\s?point/i } },

  // La sección promete "GPU dedicada", así que se le exige: entraban
  // "JANUS WORKSTATION Core i5-12400 + Monitor 55"" con gráfica integrada, que
  // para editar vídeo es justo lo que no sirve.
  { id: "creadores-produccion", nombre: "Creadores y Producción", campo: "segmento", valor: "creadores-produccion",
    categorias: ["escritorio-alto-rendimiento"], desde: 3_500_000,
    exige: { categorias: ["escritorio-alto-rendimiento"],
      patron: /rtx|gtx|geforce|radeon|\brx\s?\d{4}\b|quadro|\bgpu\b/i } },

  // Sin `televisor`: en las listas vigentes esa categoría tiene TRES productos y
  // ninguno es un televisor —una board, un mouse y un rotulador que el lector no
  // supo clasificar—. Mientras los proveedores no traigan TV, admitirla sólo
  // sirve para colar lo que no encaja en ningún sitio.
  { id: "smart-home", nombre: "Smart Home y Conectividad", campo: "segmento", valor: "smart-home",
    categorias: ["camara", "redes"] },

  { id: "monitores", nombre: "Monitores", campo: "usoCaso", valor: "monitor",
    categorias: ["monitor"] },

  { id: "tablets", nombre: "Tablets Empresariales", campo: "usoCaso", valor: "tablet-empresarial",
    categorias: ["tableta"] },

  // El almacenamiento entra sólo si es EXTERNO: un disco que se lleva en el
  // bolso es un accesorio, y uno que va atornillado a la board es un componente.
  { id: "accesorios", nombre: "Accesorios", campo: "usoCaso", valor: "accesorio",
    cupo: 12,
    categorias: ["accesorios", "mouse", "teclado", "auriculares", "camara", "impresora", "almacenamiento"],
    exige: { categorias: ["almacenamiento"], patron: /extern|port[áa]til|micro\s?sd|\busb\b/i },
    excluye: /grabador\sde\sv[íi]deo|\bnvr\b/i },

  { id: "licencias", nombre: "Licencias y Software", campo: "usoCaso", valor: "licencia",
    categorias: ["antivirus", "licencia", "software"] },

  // Piezas que van DENTRO del equipo. Un disco externo no se instala, se
  // conecta: eso es un accesorio y allí tiene sección.
  { id: "componentes", nombre: "Componentes", campo: "segmento", valor: "componentes",
    categorias: ["procesador", "motherboard", "memoria-ram", "almacenamiento",
                 "tarjeta-grafica", "fuente-poder", "refrigeracion"],
    excluye: /extern/i },
];

/**
 * Un producto, UNA sección.
 *
 * Un producto publicado en una sección por `segmento` —una cámara en Smart
 * Home, un router en Redes— lleva ADEMÁS el `usoCaso` que necesita /productos
 * para agruparlo en su catálogo, y ese usoCaso es "accesorio". Sin esta regla la
 * vitrina enseñaba las ocho cámaras en Smart Home y otra vez en Accesorios: 46
 * cards en Accesorios, 38 de ellas prestadas de otra sección.
 *
 * Manda el segmento, que es lo específico. Las secciones por `usoCaso` sólo se
 * quedan con lo que no tiene sección propia.
 */
export const SEGMENTOS_CON_SECCION = new Set(
  SECCIONES.filter((s) => s.campo === "segmento").map((s) => s.valor),
);

export function esDeLaSeccion(
  p: { usoCaso?: string | null; segmento?: string | null },
  campo: "usoCaso" | "segmento",
  valor: string,
): boolean {
  if (campo === "segmento") return p.segmento === valor;
  return p.usoCaso === valor && !SEGMENTOS_CON_SECCION.has(p.segmento ?? "");
}

/**
 * Productos publicados que están en la sección equivocada.
 *
 * Una "Unidad DVD-RW Externa USB 3.0" de $79.000 en *Creadores y Producción* no
 * es un error de precio ni de lectura: es un accesorio colado en la sección de
 * las estaciones de trabajo. Rompe la promesa de la sección y descoloca al
 * cliente que llegó buscando un equipo para editar video.
 *
 * Lo que se admite en cada sección se DERIVA de las mismas `categorias` que
 * alimentan la propuesta, así que no hay una segunda lista que se desincronice:
 * si una sección puede recibir cierto producto, ese producto está bien ahí.
 */
export type MalUbicado = {
  referencia: string;
  nombre: string;
  categoria: string;
  seccion: string;
  precio: number;
};

/** Categorías de TIENDA que son un equipo completo. */
const MAQUINAS = new Set(["pc", "portatil", "monitor", "tablet"]);

export function verificarUbicacion(): MalUbicado[] {
  const publicados = loadBusinessProducts().filter((p) => p.enPromocion);
  const fuera: MalUbicado[] = [];

  for (const s of SECCIONES) {
    const admite = new Set(s.categorias.map(categoriaTienda));
    for (const p of publicados) {
      if (!esDeLaSeccion(p as unknown as { usoCaso?: string; segmento?: string }, s.campo, s.valor)) continue;

      // La categoría de tienda es gruesa: una cámara, un mouse y un router son
      // los tres "accesorio", así que un mouse pasaba por bueno en Smart Home.
      // El nombre afina lo que la categoría no distingue —salvo en los equipos,
      // que nombran sus piezas y se harían pasar por tarjeta de video—.
      const dice = MAQUINAS.has(p.categoria) ? null : categoriaPorNombre(p.nombre);
      if (admite.has(p.categoria) && (!dice || s.categorias.includes(dice))) continue;
      fuera.push({
        referencia: p.referencia ?? "",
        nombre: p.nombre,
        categoria: p.categoria,
        seccion: s.nombre,
        precio: p.precioDesde ?? p.precio ?? 0,
      });
    }
  }
  return fuera;
}

export type Candidato = {
  referencia: string;
  nombre: string;
  marca: string;
  categoria: string;
  proveedor: string;
  precioCosto: number;
  precioVenta: number;
  /** entrada | medio | alto — el tramo de la escalera que ocupa. */
  tramo: string;
  /** Por qué está propuesto, en una línea que se pueda leer. */
  porque: string;
  /** Lo que verá el cliente en la card. */
  specs: Record<string, string>;
  descripcion: string;
};

export type PropuestaSeccion = {
  id: string;
  nombre: string;
  publicados: number;
  faltan: number;
  candidatos: Candidato[];
  /** Cuántos candidatos había en las listas antes de recortar al cupo. */
  disponibles: number;
  /** Cuántas cards quiere esta sección: 12 en Accesorios, 8 en el resto. */
  cupo: number;
  /** Ni juntando lo publicado con lo propuesto se llega al mínimo de 4. */
  bajoMinimo: boolean;
};

/** Una palabra de verdad: sólo letras, tres o más. "Ryzen" sí, "512GB" no. */
const PALABRA = /^[a-záéíóúñüA-ZÁÉÍÓÚÑÜ]{3,}$/;

/** Un nombre que no identifica el producto no puede ir a una card. Es la misma
 *  guarda del importador: mejor una sección con seis cards buenas que con ocho. */
function nombreUsable(n: string): boolean {
  const t = n.trim();
  if (t.length < 12) return false;

  // Restos de la lectura del PDF. No son productos: son trozos de la página que
  // se colaron con forma de nombre —"IVA ASUS PRIME B760M-A AX6 GSI" (la
  // columna del impuesto pegada al producto de al lado) o "VIGI y ; Pero además
  // (Key, VIGI Cámara de red tipo" (dos frases partidas por la mitad)—.
  if (t.includes(";")) return false;
  // "IVA" no aparece en el nombre de ningún producto: aparece cuando la columna
  // del impuesto se pegó al de al lado. Pasaba al principio ("IVA ASUS PRIME
  // B760M-A") y también por dentro ("GamePad con IVA Portátil ROG Strix G16").
  if (/(^| )iva( |$)/i.test(t)) return false;
  if ((t.match(/[(]/g) ?? []).length !== (t.match(/[)]/g) ?? []).length) return false;
  if (/^(iva|precio|total|subtotal|descuento|valor|ref)[ :]/i.test(t)) return false;

  // Dos palabras de verdad, como mínimo. Sin esto entraba "TMP216-51-56ZP
  // NX.B17AL.00D": es un portátil real, pero en una card el cliente lee dos
  // códigos de fábrica y no sabe qué le están ofreciendo.
  return t.split(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü0-9]+/).filter((w) => PALABRA.test(w)).length >= 2;
}

/**
 * ¿Este producto es de los que van en esta sección?
 *
 * La categoría de la lista se equivoca —el lector clasificó un "MOUSE BLUETOOTH
 * SILENCIOSO LENOVO WL310" y una board "ASUS PRIME B760M-A" como `televisor`, y
 * por ahí se colaban a Smart Home—. El nombre no se equivoca: un mouse dice
 * "Mouse". Así que el nombre manda, con la misma tabla que usa el importador.
 *
 * Los equipos completos quedan fuera de la comprobación a propósito: un PC
 * gamer NOMBRA su gráfica ("... + RTX 5060 8GB") y el nombre lo llamaría tarjeta
 * de video. En un equipo, la categoría de la lista sí es la buena.
 */
/**
 * Piezas cuyo NOMBRE es el modelo. En una gráfica o un procesador, "GeForce RTX"
 * sin número no dice qué se está vendiendo: la diferencia entre una RTX 3050 y
 * una RTX 5090 es diez veces el precio. Se coló una "Tarjeta de Video GeForce
 * RTX PLUS" a $4.562.000 —una gráfica al precio de un PC entero, sin modelo—.
 */
const PIEZAS_CON_MODELO = new Set(["tarjeta-grafica", "procesador", "memoria-ram", "motherboard"]);
const LLEVA_MODELO = /\d{3,}/;

function encajaEnSeccion(nombre: string, catLista: string, s: SeccionVitrina): boolean {
  if (s.excluye?.test(nombre)) return false;
  if (PIEZAS_CON_MODELO.has(catLista) && !LLEVA_MODELO.test(nombre)) return false;
  if (s.exige && s.exige.categorias.includes(catLista) && !s.exige.patron.test(nombre)) return false;
  if (EQUIPOS_COMPLETOS.has(catLista)) return true;
  const dice = categoriaPorNombre(nombre);
  return !dice || s.categorias.includes(dice);
}

/**
 * El nombre tal cual va a la card.
 *
 * Los PDF traen el rótulo de la sección pegado al primer producto que hay
 * debajo: "PERIFÉRICOS & Xiaomi Smart Band 9 Active". El producto es bueno y el
 * precio es bueno; lo que sobra son las dos palabras de la cabecera. Se quitan
 * en vez de tirar la card, que es lo que se hacía antes.
 */
const CABECERA_PEGADA = /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ]{2,}&\s*/;

function nombreDeCard(nombre: string): string {
  const limpio = nombre.replace(CABECERA_PEGADA, "").trim();
  return nombreUsable(limpio) ? limpio : nombre.trim();
}

/** El modelo, ignorando cómo lo escribe cada proveedor. Dos referencias con el
 *  mismo modelo son la misma card. */
const modelo = (n: string) =>
  n.normalize("NFD").toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Cuánto producto da por su precio.
 *
 * No es "el más barato": el más barato suele ser la peor máquina, deja mala
 * primera impresión y el menor margen absoluto. Esto mide lo contrario — cuánta
 * ficha técnica trae por millón de pesos — que es lo que hace que una card se
 * sienta buena compra.
 */
function valorPorPeso(p: ActiveProduct, precioVenta: number): number {
  const texto = `${p.nombre} ${Object.values(p.specs ?? {}).join(" ")}`;
  const gb = [...texto.matchAll(/(\d{1,4})\s?GB\b/gi)].map((m) => Number(m[1])).filter((n) => n <= 4096);
  const tb = [...texto.matchAll(/(\d)\s?TB\b/gi)].map((m) => Number(m[1]) * 1024);
  const capacidad = [...gb, ...tb].reduce((a, b) => a + b, 0);

  let puntos = capacidad / 8;                                    // RAM + disco
  if (/\b(rtx|gtx|radeon\s*rx|rx\s?\d{4})\b/i.test(texto)) puntos += 40;   // gráfica dedicada
  if (/\b(i7|i9|ryzen\s*[79]|ultra\s*[79]|xeon)\b/i.test(texto)) puntos += 25;
  else if (/\b(i5|ryzen\s*5|ultra\s*5)\b/i.test(texto)) puntos += 12;
  puntos += Object.keys(p.specs ?? {}).length * 2;               // ficha completa

  return puntos / Math.max(precioVenta / 1_000_000, 0.05);
}

const TRAMOS = ["entrada", "medio", "alto"] as const;
/** Cómo se reparten 8 cards: la del medio es la que más se vende, y las de los
 *  extremos hacen de ancla — la cara hace razonable a la del medio. */
const REPARTO = { entrada: 0.25, medio: 0.5, alto: 0.25 };

/** La propuesta para las secciones pedidas. No escribe nada. */
export function proponerRelleno(ids: string[]): PropuestaSeccion[] {
  const publicados = loadBusinessProducts();
  const margins = loadMargins();
  const vigentes = loadActiveProducts();

  // Lo que ya está publicado no se vuelve a proponer, esté donde esté.
  const yaEsta = new Set(
    publicados.map((p) => String(p.referencia ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "")).filter(Boolean),
  );
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const publicadosModelo = new Set(publicados.map((p) => modelo(p.nombre)));
  // Un modelo propuesto en una sección no vuelve a proponerse en otra: los
  // mismos tres Power Group salían a la vez en Gaming y en Creadores, y sólo
  // pueden estar en una.
  const usados = new Set<string>();

  return SECCIONES.filter((s) => ids.includes(s.id)).map((s) => {
    const enVitrina = publicados.filter(
      (p) => p.enPromocion &&
        esDeLaSeccion(p as unknown as { usoCaso?: string; segmento?: string }, s.campo, s.valor),
    ).length;
    const faltan = Math.max(0, cupoDe(s) - enVitrina);

    const sueltos = vigentes
      .filter((p) => s.categorias.includes(p.categoria))
      .filter((p) => p.precio_costo > 0 && p.referencia && !yaEsta.has(norm(p.referencia)))
      .filter((p) => nombreUsable(p.nombre))
      .filter((p) => encajaEnSeccion(p.nombre, p.categoria, s))
      // Una card que no dice nada ocupa sitio en la vitrina y no ayuda a decidir.
      .filter((p) => suficienteInfo(p, specsParaCard(p)))
      .filter((p) => !fichaContradice(p, specsParaCard(p)))
      .map((p) => {
        const precioVenta = applyMargin(p.precio_costo, p.categoria, margins, p.nombre);
        return { p, precioVenta, valor: valorPorPeso(p, precioVenta) };
      })
      .filter(({ precioVenta }) =>
        (s.hasta === undefined || precioVenta <= s.hasta) &&
        (s.desde === undefined || precioVenta >= s.desde));

    // ── Un modelo, una card ──
    // Las listas traen el mismo equipo con dos referencias y dos precios —el
    // "Ryzen 7 8700F 32GB 1TB + RTX 5050 8GB" salía a $4.739.000 y a
    // $4.979.000—. La misma máquina dos veces en la misma rejilla no parece
    // surtido: parece un error. Se queda la barata.
    const porModelo = new Map<string, (typeof sueltos)[number]>();
    for (const c of sueltos) {
      const clave = modelo(c.p.nombre);
      if (publicadosModelo.has(clave) || usados.has(clave)) continue;
      const previo = porModelo.get(clave);
      if (!previo || c.precioVenta < previo.precioVenta) porModelo.set(clave, c);
    }
    const pool = [...porModelo.values()];

    if (faltan === 0 || pool.length === 0) {
      return { id: s.id, nombre: s.nombre, publicados: enVitrina, faltan, candidatos: [],
        disponibles: pool.length, cupo: cupoDe(s), bajoMinimo: enVitrina < MINIMO };
    }

    // ── Escalera de precios ──
    // Ocho equipos al mismo precio convierten peor que una escalera: el cliente
    // no compara, y el que no puede pagar el único precio se va. Se parte el
    // surtido en tres tercios por precio y se toma de cada uno.
    const ordenados = [...pool].sort((a, b) => a.precioVenta - b.precioVenta);
    const corte = Math.ceil(ordenados.length / 3);
    const porTramo: Record<string, typeof ordenados> = {
      entrada: ordenados.slice(0, corte),
      medio: ordenados.slice(corte, corte * 2),
      alto: ordenados.slice(corte * 2),
    };

    // Las cuotas se reparten SIN redondear cada una por su lado: redondeando,
    // 3 huecos daban 1+2+1 = 4 propuestas para 3 sitios.
    const cuotas = { entrada: Math.floor(faltan * REPARTO.entrada), alto: Math.floor(faltan * REPARTO.alto) } as Record<string, number>;
    cuotas.medio = faltan - cuotas.entrada - cuotas.alto;

    const elegidos: Candidato[] = [];
    const puestos = new Set<string>();
    const porProveedor = new Map<string, number>();
    const porCategoria = new Map<string, number>();

    const tomar = (c: (typeof pool)[number], tramo: string) => {
      if (puestos.has(c.p.referencia!) || elegidos.length >= faltan) return false;
      puestos.add(c.p.referencia!);
      usados.add(modelo(c.p.nombre));
      porProveedor.set(c.p.proveedor, (porProveedor.get(c.p.proveedor) ?? 0) + 1);
      porCategoria.set(c.p.categoria, (porCategoria.get(c.p.categoria) ?? 0) + 1);
      elegidos.push(candidato(c.p, c.precioVenta, tramo, c.valor));
      return true;
    };

    // ── Cómo se reparte la sección ──
    //
    // Tres pasadas, cada una con una restricción menos. La diversidad es una
    // preferencia fuerte, no un muro: hay secciones que un solo proveedor
    // domina, y dejarla a medias por eso es peor que repetirlo.
    //
    //   1ª  un tope por proveedor Y otro por categoría de lista
    //   2ª  sólo el tope por proveedor
    //   3ª  sin topes, lo mejor que quede
    //
    // Sin la primera, Gaming salía con siete Power Group teniendo 58 Janus en
    // las listas, y Componentes con ocho discos teniendo procesadores, memorias
    // y boards. Lo que las colaba era el segundo paso, que no miraba nada.
    const topeProveedor = Math.max(2, Math.ceil(faltan / 2));
    const topeCategoria = Math.max(2, Math.ceil(faltan / 3));

    const limiteEntrada = ordenados[corte - 1]?.precioVenta ?? Infinity;
    const limiteMedio = ordenados[corte * 2 - 1]?.precioVenta ?? Infinity;
    const tramoDe = (precio: number) =>
      precio <= limiteEntrada ? "entrada" : precio <= limiteMedio ? "medio" : "alto";

    const cabe = (c: (typeof pool)[number], conCategoria: boolean, conProveedor: boolean) =>
      (!conProveedor || (porProveedor.get(c.p.proveedor) ?? 0) < topeProveedor) &&
      (!conCategoria || (porCategoria.get(c.p.categoria) ?? 0) < topeCategoria);

    // Las dos primeras pasadas respetan la escalera de precio; la última ya sólo
    // busca llenar, y el tramo se deduce del precio para que no salgan ocho
    // "medio" seguidos.
    for (const [conCategoria, conProveedor] of [[true, true], [false, true]] as const) {
      for (const tramo of TRAMOS) {
        const orden = [...porTramo[tramo]].sort((a, b) => b.valor - a.valor);
        for (const c of orden) {
          if (elegidos.filter((e) => e.tramo === tramo).length >= cuotas[tramo]) break;
          if (!cabe(c, conCategoria, conProveedor)) continue;
          tomar(c, tramo);
        }
      }
    }

    if (elegidos.length < faltan) {
      for (const c of [...pool].sort((a, b) => b.valor - a.valor)) {
        if (elegidos.length >= faltan) break;
        tomar(c, tramoDe(c.precioVenta));
      }
    }

    return {
      id: s.id, nombre: s.nombre, publicados: enVitrina, faltan,
      candidatos: elegidos.sort((a, b) => a.precioVenta - b.precioVenta),
      disponibles: pool.length,
      cupo: cupoDe(s),
      bajoMinimo: enVitrina + elegidos.length < MINIMO,
    };
  });
}

/**
 * Publica los candidatos aprobados de una sección.
 *
 * Se vuelve a calcular todo en el momento: entre ver la propuesta y aprobarla
 * pudo importarse otra lista, y publicar el precio que se vio en pantalla en vez
 * del vigente es justo el problema que vinimos a arreglar.
 *
 * Escribe `usoCaso` Y `segmento`: el primero es lo que filtran las secciones
 * viejas y el segundo lo que usan las nuevas. Poner solo uno deja el producto
 * en el catálogo pero fuera de la vitrina.
 */
export function publicarCandidatos(
  seccionId: string,
  referencias: string[],
): { publicados: number; omitidos: number } {
  const seccion = SECCIONES.find((s) => s.id === seccionId);
  if (!seccion) return { publicados: 0, omitidos: referencias.length };

  const pedidas = new Set(referencias.map((r) => r.toUpperCase().replace(/[^A-Z0-9]/g, "")));
  const propuesta = proponerRelleno([seccionId])[0];
  const aprobados = propuesta.candidatos.filter((c) =>
    pedidas.has(c.referencia.toUpperCase().replace(/[^A-Z0-9]/g, "")),
  );

  const productos = loadBusinessProducts();
  const existentes = new Set(productos.map((p) => p.referencia));
  let publicados = 0;

  for (const c of aprobados) {
    if (!c.referencia || existentes.has(c.referencia)) continue;
    existentes.add(c.referencia);
    productos.push({
      referencia: c.referencia,
      id: c.referencia,
      slug: slugify(c.nombre),
      nombre: c.nombre,
      // La marca del proveedor NUNCA sale a la tienda: si coinciden, vacía.
      marca: c.marca.trim().toLowerCase() === c.proveedor.trim().toLowerCase() ? "" : c.marca,
      categoria: categoriaTienda(c.categoria),
      usoCaso: seccion.campo === "usoCaso" ? seccion.valor : usoCasoPorDefecto(c.categoria),
      segmento: seccion.campo === "segmento" ? seccion.valor : segmentoPorDefecto(c.categoria),
      publicado: true,
      enPromocion: true,
      destacado: false,
      enAccesorios: false,
      precio: c.precioVenta,
      precioDesde: c.precioVenta,
      precioIvaIncluido: true,
      proveedor: "manual",
      // Las specs SÍ viajan: la card muestra tres y sin ellas sale con el
      // nombre, el precio y tres renglones vacíos de relleno.
      specs: c.specs,
      descripcionUso: c.descripcion,
    } as unknown as ReturnType<typeof loadBusinessProducts>[number]);
    publicados++;
  }

  if (publicados > 0) saveBusinessProducts(productos);
  return { publicados, omitidos: referencias.length - publicados };
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Categoría de TIENDA (la taxonomía del catálogo público), distinta de la de
 *  lista y de la clave de margen. Confundirlas ya costó precios equivocados. */
function categoriaTienda(catLista: string): string {
  if (catLista === "portatil") return "portatil";
  if (catLista === "monitor") return "monitor";
  if (["escritorio", "escritorio-alto-rendimiento", "all-in-one", "mini-pc", "servidor"].includes(catLista)) return "pc";
  if (["tableta", "celular"].includes(catLista)) return "tablet";
  // El catálogo tiene su propia categoría para el software: mandarlo a
  // "accesorio" lo publicaba mal Y hacía que la verificación marcara como
  // intrusas las ocho licencias que llevan meses bien puestas.
  if (["antivirus", "licencia", "software"].includes(catLista)) return "licencia";
  return "accesorio";
}
const usoCasoPorDefecto = (c: string) =>
  c === "portatil" ? "portatil-oficina" : c === "monitor" ? "monitor" : c === "tableta" ? "tablet-empresarial" : "accesorio";
const segmentoPorDefecto = (c: string) =>
  ["escritorio", "all-in-one", "mini-pc"].includes(c) ? "productividad-oficina" : "accesorios";

function candidato(p: ActiveProduct, precioVenta: number, tramo: string, valor: number): Candidato {
  const texto = `${p.nombre} ${Object.values(p.specs ?? {}).join(" ")}`;
  const razones: string[] = [];
  if (/\b(rtx|gtx|radeon)\b/i.test(texto)) razones.push("gráfica dedicada");
  if (/\b(i7|i9|ryzen\s*[79]|ultra\s*[79])\b/i.test(texto)) razones.push("CPU de gama alta");
  const ram = texto.match(/(\d{1,3})\s?GB\b/i);
  if (ram) razones.push(`${ram[1]}GB`);
  if (p.marca) razones.push(`marca ${p.marca}`);
  razones.push(`${Math.round(valor)} pts/millón`);

  const specs = specsParaCard(p);
  // La marca de la card se lee del NOMBRE de la card, no de la que quedó
  // guardada al importar: si la lista trae "T-Dagger" para un "Asus TUF Gaming
  // A15 + GamePad ... T-Dagger", en pantalla se vería una marca que el propio
  // nombre desmiente. Se calcula una vez y la usan el campo y la descripción,
  // que si no podían contradecirse entre ellos.
  const marca = marcaDeNombre(p.nombre, p.categoria) ?? p.marca;
  return {
    referencia: p.referencia ?? "",
    nombre: nombreDeCard(p.nombre),
    marca,
    categoria: p.categoria,
    proveedor: p.proveedor,
    precioCosto: p.precio_costo,
    precioVenta,
    tramo,
    porque: razones.join(" · "),
    specs,
    descripcion: descripcionDe(p, specs, marca),
  };
}
