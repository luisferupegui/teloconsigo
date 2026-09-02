import "server-only";
import { marcaDeNombre } from "@/lib/marcas";
import { lineasDePdf, camposDeBloque, partirEnBloques, precioDeTexto, campo, type Campo } from "./bloques";
import type { ParsedProduct } from "@/lib/parse-supplier-doc";
import type { Descartado, ResultadoParser } from "./tipos";
import { fragmentosDePdf } from "./coordenadas";
import { tarjetasDePagina, rotulosDePagina } from "./compuoriente-tarjetas";

// ─── Compuoriente ────────────────────────────────────────────────────────────
//
// Cada equipo empieza por la línea de familia ("EQUIPO POWER GROUP"), sigue con
// su referencia y sus campos etiquetados, y cierra con el PRECIO y el MONITOR —
// en ese orden, después de las specs:
//
//     EQUIPO POWER GROUP
//     G105162HST
//     Caja ATX Power Group: G93
//     Procesador:
//     INTEL CORE I5-10400T  2,0GHZ      ← el valor va en la línea siguiente
//     Board (2 opc): MSI PRO H510M PLUS II /
//     ASUS PRIME H510M-F
//     Memoria: HIKSEMI ARMOR
//     16GB   DDR4 3200MHZ
//     Almacenamiento (2 opc): SATA / HIKSEMI  512GB
//     OS: Linux
//     $1.599.000                         ← precio de ESTE equipo
//     Monitor: ASUS
//     22" VP229HF                        ← monitor de ESTE equipo
//
// Que el precio venga al final y no al principio es la trampa de esta lista: un
// parser que asocie "el precio más cercano hacia arriba" le pone a cada equipo
// el precio del anterior. Aquí el bloque se cierra en la familia siguiente, así
// que el precio que contiene es el suyo.

const FAMILIA = /^EQUIPO\s+[A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9 .\-]{2,40}$/;
/** Referencia: código alfanumérico corto, en mayúsculas, sin espacios. */
const REFERENCIA = /^[A-Z0-9][A-Z0-9-]{5,20}$/;

// Los equipos que comparten panel no repiten "EQUIPO POWER GROUP": el segundo y
// los siguientes abren con "EQUIPO" a secas.
//
//     EQUIPO          ← rótulo encima del precio del equipo ANTERIOR
//     $3.899.000
//     Monitor: MSI PRO 24"
//     EQUIPO          ← este sí abre una ficha nueva
//     R87162MR0
//     Chasis: MSI MAG FORGE M100A
//
// La misma palabra hace las dos cosas, así que la línea sola no decide: abre
// ficha solo si la siguiente es una referencia. Sin esta regla los cuatro
// equipos del panel se leían como uno —se perdían tres, con su precio— porque
// el bloque no se cortaba nunca.
const EQUIPO_SOLO = /^EQUIPO$/;

const abreFicha = (linea: string, i: number, lineas: string[]) =>
  FAMILIA.test(linea) || (EQUIPO_SOLO.test(linea) && REFERENCIA.test(lineas[i + 1] ?? ""));

function cpuCorto(procesador: string): string {
  const p = procesador.replace(/\s+/g, " ").trim();
  const ryzen = p.match(/ryzen\s*(\d)\s*([0-9a-z]+)/i);
  if (ryzen) return `Ryzen ${ryzen[1]} ${ryzen[2].toUpperCase()}`;
  const core = p.match(/core\s*i(\d)[\s-]*([0-9a-z]+)/i);
  if (core) return `Core i${core[1]}-${core[2].toUpperCase()}`;
  return p.split(/\s{2,}/)[0].slice(0, 28);
}

const soloCapacidad = (t: string | undefined, re: RegExp) => t?.match(re)?.[0]?.toUpperCase();

/** El modelo de la tarjeta de video, sin la marca ni la publicidad.
 *
 *  Va en el NOMBRE porque sin ella los equipos gamer son indistinguibles: doce
 *  máquinas se llamaban todas "POWER GROUP Ryzen 7 8700F 16GB 512GB" con precios
 *  entre $3.499.000 y $4.399.000, y lo único que las separa es la gráfica. En la
 *  tienda eso sería una lista de nombres idénticos a precios distintos.
 *
 *  "ASUS DUAL RADEON 9060XT 8GB" y "ASUS DUAL RX 9060XT 8GB" son la misma
 *  tarjeta escrita de dos formas, así que las dos salen como "RX 9060XT". */
function gpuCorta(tvideo: string | undefined): string | null {
  if (!tvideo) return null;
  const t = tvideo.toUpperCase();
  const nvidia = t.match(/\b(RTX|GTX)\s*(\d{3,4})\s*(TI|SUPER)?/);
  const amd = t.match(/\b(?:RADEON\s+)?RX\s*(\d{3,4})\s*(XT)?|\bRADEON\s+(\d{3,4})\s*(XT)?/);
  const modelo = nvidia
    ? `${nvidia[1]} ${nvidia[2]}${nvidia[3] ? " " + nvidia[3] : ""}`
    : amd
      ? `RX ${amd[1] ?? amd[3]}${(amd[2] ?? amd[4]) ?? ""}`
      : null;
  if (!modelo) return null;
  // La memoria se escribe "8G", "8GB" o "6GB GDDR6"; el modelo tiene 4 cifras y
  // la memoria una o dos, así que no se confunden.
  const memoria = t.match(/\b(\d{1,2})\s*GB?\b/);
  return memoria ? `${modelo} ${memoria[1]}GB` : modelo;
}

function componerNombre(familia: string, campos: Campo[]): string {
  const cpu     = campo(campos, "procesador");
  const ram     = soloCapacidad(campo(campos, "memoria"), /\d+\s?GB/i);
  const disco   = soloCapacidad(campo(campos, "almacenamiento", "disco"), /\d+\s?(?:GB|TB)/i);
  const monitor = campo(campos, "monitor");
  const pulgadas = monitor?.match(/\d{2}(?:[.,]\d)?\s?[”"]/)?.[0]?.replace("”", '"');
  const gpu = gpuCorta(campo(campos, "tvideo", "t.video", "tarjeta de video"));

  return [
    familia,
    cpu ? cpuCorto(cpu) : null,
    ram ? ram.replace(/\s/g, "") : null,
    disco ? disco.replace(/\s/g, "") : null,
    gpu ? `+ ${gpu}` : null,
    pulgadas ? `+ Monitor ${pulgadas}` : null,
  ].filter(Boolean).join(" ");
}

function categoriaDe(campos: Campo[], nombre: string): string {
  const texto = `${nombre} ${campos.map((c) => `${c.etiqueta} ${c.valor}`).join(" ")}`.toLowerCase();
  if (/all.?in.?one|todo en uno|\baio\b/.test(texto)) return "all-in-one";
  if (/port[aá]til|laptop|notebook/.test(texto)) return "portatil";
  if (/\b(rtx|gtx|radeon rx)\b/.test(texto) || campo(campos, "tvideo", "t.video")) return "escritorio-alto-rendimiento";
  return "escritorio";
}

/** Una etiqueta de ficha: "Procesador:", "Fuente de poder:", "OS:". */
const ETIQUETA = /^[A-Za-zÁÉÍÓÚÑáéíóúñ][^:]{2,40}:/;

/** Cuántas líneas seguidas sin etiqueta hacen falta para dar la ficha por
 *  terminada. Medido sobre el catálogo: dentro de una ficha el tramo más largo
 *  sin etiquetas es de 17 líneas (los textos de marketing de las tarjetas de
 *  video), y con 16 no se pierde NI UN campo de los 89 equipos. */
const FIN_DE_FICHA = 16;

/** Los campos de la ficha, sin la cola del catálogo.
 *
 *  Hace falta porque el último equipo no tiene una ficha detrás que lo cierre:
 *  su bloque llegaba hasta el final del documento y se tragaba las 941 líneas
 *  siguientes —accesorios, impresoras, portátiles, tablets, celulares y hasta
 *  los datos de contacto del proveedor—. Como las specs se escriben recorriendo
 *  el bloque y la última repetición de cada etiqueta gana, esa cola pisaba los
 *  valores buenos: el equipo acababa con "Procesador: Octa-Core" y "Memoria:
 *  8GB" copiados de una tablet, y en la categoría "all-in-one" porque en algún
 *  punto de la cola decía "ALL IN ONE".
 *
 *  El corte es por DENSIDAD DE ETIQUETAS, no por longitud: dentro de una ficha
 *  los campos se suceden cada una o dos líneas, y donde el catálogo deja de
 *  serlo aparecen tramos largos de prosa. */
function camposDeLaFicha(bloque: string[]): string[] {
  let seguidas = 0;
  for (let i = 0; i < bloque.length; i++) {
    if (ETIQUETA.test(bloque[i])) { seguidas = 0; continue; }
    if (++seguidas >= FIN_DE_FICHA) return bloque.slice(0, i - FIN_DE_FICHA + 1);
  }
  return bloque;
}

export async function parseCompuoriente(buffer: Buffer): Promise<ResultadoParser> {
  const lineas = await lineasDePdf(buffer);
  const bloques = partirEnBloques(lineas, abreFicha);
  const productos: ParsedProduct[] = [];
  const descartados: Descartado[] = [];

  // Los equipos que abren con "EQUIPO" a secas no nombran su familia: heredan la
  // del panel, que es el último encabezado completo que se vio.
  let familiaVigente = "POWER GROUP";

  for (const bloqueCompleto of bloques) {
    const cabecera = bloqueCompleto[0].replace(/^EQUIPO\b\s*/i, "").trim();
    if (cabecera) familiaVigente = cabecera;
    const familia = familiaVigente;

    const bloque = camposDeLaFicha(bloqueCompleto);
    // La referencia es la primera línea suelta tras la familia, antes de los campos.
    const referencia = bloque.slice(1, 4).find((l) => REFERENCIA.test(l)) ?? "";

    const { campos } = camposDeBloque(bloque.slice(1));
    // El precio del bloque: la primera cifra con $ que aparezca dentro de él.
    // Va DESPUÉS de las specs, así que el bloque tiene que cerrarse en la
    // familia siguiente; si se cerrara antes, cada equipo heredaría el precio
    // del anterior.
    // El precio se busca en el bloque COMPLETO, no en el recortado: hay equipos
    // cuyo precio va impreso después del panel de tarjetas de video, o sea
    // detrás del corte. El primero que aparece siempre es el de esta ficha,
    // porque el bloque empieza justo donde empieza el equipo.
    const lineaPrecio = bloqueCompleto.find((l) => precioDeTexto(l) !== null);
    const precio = lineaPrecio ? precioDeTexto(lineaPrecio) : null;

    if (!campo(campos, "procesador")) {
      descartados.push({
        referencia: referencia || familia,
        motivo: precio ? "Referencia con precio pero sin ficha (variante)" : "Bloque sin procesador",
      });
      continue;
    }

    const nombre = componerNombre(familia, campos);

    const specs: Record<string, string> = {};
    for (const c of campos) {
      if (!c.valor || /^nota$/.test(c.etiqueta)) continue;
      const clave = c.etiqueta.replace(/\s+/g, "_");
      // Una etiqueta puede repetirse dentro de la misma ficha con dos cosas
      // distintas: "Combo: Teclado y Mouse" y más abajo "Combo: Licencia
      // Digital, Kaspersky". Sobrescribir dejaba solo la última y el equipo
      // perdía la mitad de lo que incluye, así que se suman.
      specs[clave] = specs[clave] && specs[clave] !== c.valor
        ? `${specs[clave]} · ${c.valor}`
        : c.valor;
    }

    productos.push({
      nombre,
      marca: marcaDeNombre(nombre) ?? "",
      categoria: categoriaDe(campos, nombre),
      precio_costo: precio ?? 0,
      referencia,
      specs: Object.keys(specs).length ? specs : undefined,
    });
  }

  // ── La otra mitad del catálogo ──
  //
  // Los equipos armados son solo una parte. Portátiles, tablets, celulares,
  // monitores, televisores y periféricos vienen maquetados como folleto y los
  // lee el motor de tarjetas. Se saltan las páginas donde hay fichas de equipo
  // para no leer dos veces lo mismo: ahí el precio ya tiene dueño.
  const paginas = await fragmentosDePdf(buffer);
  // La sección se arrastra entre páginas: PORTÁTILES ocupa tres y solo la
  // primera lleva el rótulo impreso.
  let seccion: string | null = null;
  for (const fragmentos of paginas) {
    const rotulos = rotulosDePagina(fragmentos);
    if (!fragmentos.some((f) => /^EQUIPO(\s|$)/.test(f.t))) {
      productos.push(...tarjetasDePagina(fragmentos, seccion, descartados));
    }
    // Para la página siguiente vale el rótulo que quedó más abajo en esta.
    seccion = rotulos.at(-1)?.categoria ?? seccion;
  }

  return { productos, descartados };
}
