import "server-only";
import type { ParsedProduct } from "@/lib/parse-supplier-doc";
import type { Descartado, ResultadoParser } from "./tipos";
import { fragmentosDePdf, type Fragmento } from "./coordenadas";
import { fichasDePagina } from "./ledacom-fichas";

// ─── Ledacom ─────────────────────────────────────────────────────────────────
//
// Ledacom publica una TABLA DE VARIAS COLUMNAS por página: dos o tres productos
// uno al lado del otro, cada uno con Ref, Nombre y Valor.
//
//   y=576 | 7:31300005401  50:Teclado Genius Smart KB-100  172:$24.000
//         | 215:920-004428N  257:Combo Logitech  291:USB  299:MK120  380:$58.000
//
// Leído como texto plano —que es lo único que veía el importador anterior— eso
// llega mezclado: el nombre de un producto pegado al precio de otro, y los
// fragmentos de una misma celda partidos en trozos sueltos. Por eso la lista
// devolvía CERO productos pese a tener 209.000 caracteres de texto.
//
// Con las coordenadas la regla es simple y no necesita saber dónde están las
// columnas: se ordenan los fragmentos de la fila por su posición X y CADA PRECIO
// CIERRA UN PRODUCTO. Lo que va desde el precio anterior hasta este es una
// celda: primero la referencia, después el nombre.

/** Un código de referencia: sin espacios, con dígitos, y no es un precio. */
const ES_REFERENCIA = /^[A-Z0-9][A-Z0-9._\-/]{3,20}$/i;
const ES_PRECIO = /^\$\s?[\d][\d.,]*$/;

const precioNumero = (t: string): number | null => {
  const n = Number(t.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n >= 1000 ? n : null;
};

/** Secciones del catálogo → categoría de la tienda. El título manda sobre el
 *  nombre: "Mouses y PadMouses" es más fiable que adivinar por la palabra. */
const SECCIONES: [RegExp, string][] = [
  // El software va primero y separado: antivirus y licencias tienen márgenes
  // distintos en el panel (35% y 25%), y cayendo en "accesorios" se cobraban al
  // 40%. Una licencia de Office no es un accesorio.
  [/antivirus|\beset\b|kaspersky|norton|mcafee|avast|bitdefender/i, "antivirus"],
  [/licencia|\blic\.|windows|office|microsoft 365/i, "licencia"],
  [/teclado|combo/i,                    "teclado"],
  [/mouse|padmouse/i,                   "mouse"],
  [/sonido|parlante|audio|diadema/i,    "auriculares"],
  [/c[aá]mara/i,                        "camara"],
  [/monitor|pantalla/i,                 "monitor"],
  [/impresor|t[oó]ner|tinta/i,          "impresora"],
  [/memoria|ram|ddr/i,                  "memoria-ram"],
  [/disco|almacenamiento|ssd|nvme/i,    "almacenamiento"],
  [/procesador|cpu/i,                   "procesador"],
  [/board|tarjeta madre|mainboard/i,    "motherboard"],
  [/video|gr[aá]fica|gpu/i,             "tarjeta-grafica"],
  [/fuente|poder/i,                     "fuente-poder"],
  [/red|router|switch|wifi/i,           "redes"],
  [/port[aá]til|laptop/i,               "portatil"],
  [/ups|regulador|energ[ií]a/i,         "proteccion"],
];

/** Cuando la sección no dice nada útil ("Otros Productos"), manda el nombre. */
function categoriaDe(seccion: string | undefined, nombre: string): string {
  for (const [re, cat] of SECCIONES) if (seccion && re.test(seccion)) return cat;
  for (const [re, cat] of SECCIONES) if (re.test(nombre)) return cat;
  return "accesorios";
}

/** Filas: fragmentos que comparten la misma banda vertical. La tolerancia es de
 *  3 puntos porque una celda con el nombre en dos renglones desplaza su precio
 *  un par de puntos respecto a la referencia. */
function filasDe(fragmentos: Fragmento[]): Fragmento[][] {
  const bandas = new Map<number, Fragmento[]>();
  for (const f of fragmentos) {
    const banda = Math.round(f.y / 3) * 3;
    if (!bandas.has(banda)) bandas.set(banda, []);
    bandas.get(banda)!.push(f);
  }
  return [...bandas.entries()]
    .sort((a, b) => b[0] - a[0])            // de arriba abajo
    .map(([, fs]) => fs.sort((a, b) => a.x - b.x));
}

/** ¿Esta fila es la cabecera de una tabla ("Ref … Valor")? Si lo es, el texto
 *  que va entre medias nombra la sección, y con él la categoría de la columna. */
function seccionesDeCabecera(fila: Fragmento[]): { x: number; titulo: string }[] | null {
  const tieneRef = fila.some((f) => /^ref\.?$/i.test(f.t));
  const tieneValor = fila.some((f) => /^valor$/i.test(f.t));
  if (!tieneRef || !tieneValor) return null;

  const out: { x: number; titulo: string }[] = [];
  let inicio: Fragmento | null = null;
  const partes: string[] = [];
  for (const f of fila) {
    if (/^ref\.?$/i.test(f.t)) { inicio = f; partes.length = 0; continue; }
    if (/^valor$/i.test(f.t)) {
      if (inicio && partes.length) out.push({ x: inicio.x, titulo: partes.join(" ") });
      inicio = null; partes.length = 0; continue;
    }
    if (inicio) partes.push(f.t);
  }
  return out.length ? out : null;
}

/** Ruido de página que nunca es producto. */
const RUIDO = /^(pag\.?\s*\d+|aplica t[eé]rminos|valor|ref\.?|precios?|iva|www\.|s\.a\.s)/i;

export async function parseLedacom(buffer: Buffer): Promise<ResultadoParser> {
  const paginas = await fragmentosDePdf(buffer);
  const productos: ParsedProduct[] = [];
  const descartados: Descartado[] = [];
  const vistos = new Set<string>();

  for (const fragmentos of paginas) {
    // El MISMO PDF trae dos maquetaciones. Las fichas de tres columnas
    // (celulares, tablets, portátiles) las lee su propio motor; sin él se
    // perdían familias enteras, que es justo lo que se veía mal agrupado.
    for (const p of fichasDePagina(fragmentos, descartados)) {
      const clave = `${p.referencia}|${p.nombre.toLowerCase()}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      productos.push(p);
    }

    // Secciones vigentes por columna. Se actualizan al encontrar una cabecera y
    // valen hasta la siguiente, que es como se lee la página.
    let secciones: { x: number; titulo: string }[] = [];

    for (const fila of filasDe(fragmentos)) {
      const cabecera = seccionesDeCabecera(fila);
      if (cabecera) { secciones = cabecera; continue; }

      // CADA PRECIO CIERRA UN PRODUCTO. Lo acumulado desde el precio anterior
      // es su celda.
      let celda: Fragmento[] = [];
      for (const f of fila) {
        if (!ES_PRECIO.test(f.t)) { celda.push(f); continue; }

        const precio = precioNumero(f.t);
        const utiles = celda.filter((c) => !RUIDO.test(c.t));
        celda = [];
        if (!precio || utiles.length === 0) continue;

        // El primer fragmento tiene que ser la REFERENCIA. Es lo que separa una
        // fila de la tabla de un trozo de prosa: las fichas de portátil traen
        // párrafos de puertos ("…auriculares / micrófono (3,5 mm); 1x") que se
        // cortan a lo ancho y acaban al lado de un precio de otra columna. Sin
        // esta exigencia entraban 41 "productos" que eran media frase suelta.
        const primero = utiles[0];
        const hayRef = ES_REFERENCIA.test(primero.t) && /\d/.test(primero.t) && !/\s/.test(primero.t);
        const nombre = utiles.slice(1).map((c) => c.t).join(" ").replace(/\s{2,}/g, " ").trim();

        if (!hayRef || nombre.length < 6) {
          descartados.push({
            referencia: hayRef ? primero.t : "(sin ref)",
            motivo: hayRef ? "Fila con referencia y precio pero sin nombre" : "Texto suelto junto a un precio, sin referencia",
          });
          continue;
        }
        const referencia = primero.t;

        // La misma referencia puede repetirse entre páginas (índices, promociones).
        const clave = `${referencia}|${nombre.toLowerCase()}`;
        if (vistos.has(clave)) continue;
        vistos.add(clave);

        // La sección de la columna es la que empieza más a la izquierda sin
        // pasarse de donde está esta celda.
        const seccion = [...secciones].reverse().find((s) => s.x <= primero.x + 8)?.titulo;

        productos.push({
          nombre,
          marca: "Ledacom",
          categoria: categoriaDe(seccion, nombre),
          precio_costo: precio,
          referencia,
          specs: seccion ? { seccion } : undefined,
        });
      }
    }
  }

  return { productos, descartados };
}
