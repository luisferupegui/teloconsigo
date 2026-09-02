import "server-only";
import { marcaDeNombre } from "@/lib/marcas";
import type { ParsedProduct } from "@/lib/parse-supplier-doc";
import type { Descartado } from "./tipos";
import type { Fragmento } from "./coordenadas";

// ─── Compuoriente, la mitad que NO son fichas ────────────────────────────────
//
// El catálogo tiene dos mitades muy distintas. Los equipos armados vienen como
// fichas de "Etiqueta: valor" y los lee `compuoriente.ts`. Todo lo demás —los
// portátiles, las tablets, los celulares, los monitores, los televisores, las
// impresoras, los all-in-one— viene maquetado como un FOLLETO: tarjetas en
// cuadrícula, con el nombre arriba y el precio abajo.
//
//     y=1039 x= 70 | 14-DQ3502LA          ← nombre
//     y= 954 x= 68 | INTEL CELERON        ← ficha técnica de la tarjeta
//     y= 938 x= 62 | 8GB / SSD 512GB
//     y= 899 x= 97 | $1.099.000           ← precio, debajo y en la misma banda
//
// Esa mitad no la leía nadie: eran unos 158 precios que no llegaban a producto.
//
// LA REGLA ES EL PRECIO. Cada precio es una tarjeta, y la tarjeta es lo que hay
// justo encima dentro de su misma banda vertical, hasta donde empieza la
// tarjeta de la fila de arriba.
//
// LA CATEGORÍA LA DA LA SECCIÓN, NO EL NOMBRE. Es la diferencia con el resto
// del importador, y la razón es que aquí el nombre no es un nombre: es la
// tarjeta entera, specs incluidas. Deducirla del texto clasificaba los 37
// portátiles como "procesador" —porque dicen "INTEL CORE i5"— y las tablets
// como "monitor", porque dicen "Pantalla:". Con la categoría equivocada se
// aplica el margen equivocado, y eso cobra de más o de menos en silencio. El
// folleto ya trae la respuesta impresa en grande: PORTÁTILES, TABLETS,
// CELULARES, IMPRESORAS.

/** Ancho de media tarjeta. Las columnas del folleto miden unos 170 puntos, así
 *  que 110 cubre el nombre aunque vaya sangrado y no alcanza la columna vecina. */
const MEDIO_ANCHO = 110;

/** Alto máximo de una tarjeta cuando no hay otra encima que la limite. */
const ALTO_MAXIMO = 170;

const ES_PRECIO = /^\$\s?\d[\d.,]{3,}$/;

/** Los rótulos de sección que imprime el folleto, y qué son. El orden importa:
 *  "PORTÁTILES GAMING" tiene que reconocerse antes que "PORTÁTILES". */
const SECCIONES: [RegExp, string][] = [
  [/^all\s*in\s*one$/i,                       "all-in-one"],
  [/^port[aá]tiles?(\s+gaming)?$/i,           "portatil"],
  [/^tablets?$/i,                             "tableta"],
  [/^celulares?$/i,                           "celular"],
  [/^impresoras?$/i,                          "impresora"],
  [/^televisores?$/i,                         "televisor"],
  [/^monitores(\s+gaming)?$/i,                "monitor"],
  [/^perif[eé]ricos$/i,                       "accesorios"],
  [/^disipadores$/i,                          "refrigeracion"],
  [/^chasis(\s+gamer)?$/i,                    "accesorios"],
  [/^boards?$/i,                              "motherboard"],
  [/^fuentes?(\s+de\s+poder)?$/i,             "fuente-poder"],
  [/^pc\s+corporativos?$/i,                   "escritorio"],
  [/^accesorios$/i,                           "accesorios"],
  [/^otros$/i,                                "accesorios"],
  [/^partes\s+para\s+pc$/i,                   "accesorios"],
];

/** Tamaño de letra a partir del cual un texto puede ser rótulo de sección. Los
 *  rótulos van entre 29 y 63 puntos; el cuerpo de una tarjeta no pasa de 18. */
const TAMANO_DE_SECCION = 25;

/** Texto de folleto que no describe al producto. */
const RUIDO = new RegExp(
  [
    "^iv\\s?a\\s+incluido$", "^iva\\s+incluido$", "^incluido$", "^iva+$",
    "^disponible\\s+en\\b", "^[uú]ltim[ao]s?\\s", "^\\(\\d+\\)",
    // "BAJÓ DE PRECIO" viene partido en fragmentos sueltos y se colaba en los
    // nombres ("AIO IdeaCentre BAJÓ PRECIO"), así que se filtra pieza a pieza.
    "^precio(\\s+especial)?$", "^baj[oó]$", "^de$", "^baj[oó]\\s+de\\s+precio$", "^promoci[oó]n\\b",
    "^nota\\b", "^importante:", "^pag\\.?\\s*\\d+$", "^\\d+$", "^\\$",
  ].join("|"),
  "i",
);

const precioNumero = (t: string): number | null => {
  const n = Number(t.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n >= 1000 ? n : null;
};

/** Formas que tiene una especificación y no un código: "1920X1080", "180Hz",
 *  "512GB", "3.2GHz". Se excluyen para que no pasen por número de parte. */
const ES_ESPECIFICACION =
  /^\d+\s?[x×]\s?\d+$|^\d+[.,]?\d*(gb|tb|mb|hz|ms|w|ghz|mhz|dpi|ppm|cfm|dbi|nm|mm|k)$|^ddr\d$/i;

/**
 * El número de parte de la tarjeta, si lo trae.
 *
 * ES LA GUARDA PRINCIPAL DE ESTE MOTOR, y también lo que separa un producto de
 * un trozo de folleto. En este catálogo todo lo que se vende lleva su código
 * impreso —"D1LB9LA#ABM", "ZAF00124CO", "F0J6002NLD", "DCP-T430W"— y lo que no
 * es un producto, no:
 *
 *   "PIVOTE Altura ajustable FHD 1920X1080 1ms 180Hz"     ← no hay código
 *   "Malla frontal de corte recto y elegante ARGB"        ← no hay código
 *   "IVA Ganancia: 12 DBI - Frecuencia: 824"              ← no hay código
 *
 * Esas tres son texto de diseño que quedó encima de un precio. Sin esta guarda
 * entraban al catálogo como productos, con nombre de anuncio y con el precio
 * de su vecino. Un código son al menos dos letras y dos cifras juntas, y nunca
 * una medida.
 */
function numeroDeParte(t: string): string | null {
  for (const bruto of t.split(/[\s,;()/]+/)) {
    const tok = bruto.replace(/^[.\-–—]+|[.\-–—:]+$/g, "");
    if (tok.length < 6 || tok.length > 24) continue;
    if (ES_ESPECIFICACION.test(tok)) continue;
    const letras = (tok.match(/[a-z]/gi) ?? []).length;
    const cifras = (tok.match(/\d/g) ?? []).length;
    if (letras >= 2 && cifras >= 2) return tok.toUpperCase();
  }
  return null;
}

/** Un nombre creíble tiene letras de sobra, no solo cifras y unidades sueltas.
 *  Es la guarda que impide que "6 PINES" o "128GB-" pasen por producto. */
function nombreCreible(t: string): boolean {
  const letras = (t.match(/[a-záéíóúñü]/gi) ?? []).length;
  const palabras = t.split(/\s+/).filter((p) => /[a-záéíóúñü]{3,}/i.test(p)).length;
  return t.length >= 14 && letras >= 10 && palabras >= 2;
}

/** Junta los fragmentos en orden de lectura y recompone las palabras.
 *
 *  PDF.js parte las palabras donde el diseñador ajustó el espaciado: "CÁMAR" +
 *  "A" + "WEB 720P", o "P" + "ARTES". Al pegarlos se recupera la palabra si el
 *  trozo suelto es de una o dos letras. */
function renglonesDe(frags: Fragmento[]): string[] {
  const filas = new Map<number, Fragmento[]>();
  for (const f of frags) {
    const fila = Math.round(f.y / 4);
    const lista = filas.get(fila);
    if (lista) lista.push(f);
    else filas.set(fila, [f]);
  }
  return [...filas.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, fs]) =>
      fs
        .sort((a, b) => a.x - b.x)
        .reduce(
          (acc, f) =>
            acc && /^[A-Za-zÁÉÍÓÚÑ]{1,2}$/.test(f.t) ? acc + f.t : acc ? `${acc} ${f.t}` : f.t,
          "",
        )
        .replace(/\s{2,}/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

/** El nombre son los PRIMEROS RENGLONES de la tarjeta, no la tarjeta entera.
 *
 *  El folleto pone arriba el modelo y debajo la ficha técnica, así que cortando
 *  por renglones el título sale limpio —"23.8” KA242Y", "AIO A100 F0J6002NLD"—
 *  mientras que juntándolo todo salía "PIVOTE Altura ajustable FHD 1920X1080
 *  1ms 180Hz Tiempo de respuesta", que no es el nombre de nada.
 *
 *  Se toman renglones hasta juntar algo con sustancia, porque el primero a veces
 *  es solo un código ("F0JN0017LD") y a veces ya trae marca y modelo. */
function nombreYDetalle(renglones: string[]): { nombre: string; detalle: string } {
  let nombre = "";
  let i = 0;
  while (i < renglones.length && nombre.length < 24 && i < 3) {
    nombre = nombre ? `${nombre} ${renglones[i]}` : renglones[i];
    i++;
  }
  return { nombre: nombre.slice(0, 110), detalle: renglones.slice(i).join(" · ") };
}

/** Los rótulos de sección de una página, con la altura a la que están.
 *
 *  Hacen falta CON su posición y no solo el de la página: una página puede
 *  anunciar una sección nueva a media altura, y entonces lo de arriba todavía
 *  pertenece a la anterior. Pasaba con IMPRESORAS, impreso al pie de la página
 *  de los all-in-one: sin mirar la altura, nueve all-in-one y un mouse se
 *  importaban como impresoras. */
export function rotulosDePagina(fragmentos: Fragmento[]): { y: number; categoria: string }[] {
  // Los rótulos hay que armarlos por renglón antes de reconocerlos: PDF.js parte
  // "PARTES PARA PC" en "P" + "ARTES" + "P" + "ARA" + "PC" donde el diseñador
  // tocó el espaciado, y comparando fragmento a fragmento no coincide ninguno.
  // Cuando eso pasaba, una página entera heredaba la sección equivocada y los
  // repuestos entraban como televisores.
  const grandes = fragmentos.filter((f) => f.h >= TAMANO_DE_SECCION);
  const filas = new Map<number, Fragmento[]>();
  for (const f of grandes) {
    const fila = Math.round(f.y / 6);
    const lista = filas.get(fila);
    if (lista) lista.push(f);
    else filas.set(fila, [f]);
  }

  const out: { y: number; categoria: string }[] = [];
  for (const [, fs] of filas) {
    const texto = fs
      .sort((a, b) => a.x - b.x)
      .reduce(
        (acc, f) =>
          acc && /^[A-Za-zÁÉÍÓÚÑ]{1,2}$/.test(f.t) ? acc + f.t : acc ? `${acc} ${f.t}` : f.t,
        "",
      )
      .replace(/\s{2,}/g, " ")
      .trim();
    const categoria = SECCIONES.find(([re]) => re.test(texto))?.[1];
    if (categoria) out.push({ y: Math.max(...fs.map((f) => f.y)), categoria });
  }
  return out.sort((a, b) => b.y - a.y);
}

/**
 * Lee las tarjetas de una página del folleto.
 *
 * `heredada` es la sección que venía de la página anterior, porque una sección
 * ocupa varias páginas y solo la primera lleva el rótulo impreso. Cada tarjeta
 * usa el rótulo que tenga encima, y si no hay ninguno, la heredada.
 */
export function tarjetasDePagina(
  fragmentos: Fragmento[],
  heredada: string | null,
  descartados: Descartado[],
): ParsedProduct[] {
  const rotulos = rotulosDePagina(fragmentos);
  const precios = fragmentos.filter((f) => ES_PRECIO.test(f.t)).sort((a, b) => b.y - a.y);
  const productos: ParsedProduct[] = [];

  for (const p of precios) {
    const importe = precioNumero(p.t);
    if (!importe) continue;

    // El techo de la tarjeta: el precio de la fila de arriba en esta misma
    // banda. Sin él, una tarjeta se comería el texto de la que tiene encima.
    const techo = precios
      .filter((q) => q.y > p.y && Math.abs(q.x - p.x) < MEDIO_ANCHO)
      .reduce((min, q) => Math.min(min, q.y), p.y + ALTO_MAXIMO);

    const banda = fragmentos.filter(
      (f) =>
        !ES_PRECIO.test(f.t) &&
        f.y > p.y &&
        f.y < techo &&
        f.h < TAMANO_DE_SECCION && // el rótulo de la sección no es el nombre
        Math.abs(f.x - p.x) < MEDIO_ANCHO &&
        !RUIDO.test(f.t),
    );

    // La sección de ESTA tarjeta: el rótulo más cercano por encima, que estando
    // la lista ordenada de arriba abajo es el ÚLTIMO que queda por encima, no el
    // primero. Tomando el primero, una página que anuncia CELULARES arriba y
    // TABLETS abajo metía las tablets en celulares.
    const categoria = rotulos.filter((r) => r.y > p.y).at(-1)?.categoria ?? heredada;
    if (!categoria) {
      descartados.push({ referencia: p.t, motivo: "Precio de folleto sin sección conocida" });
      continue;
    }

    const renglones = renglonesDe(banda);
    const texto = renglones.join(" ");
    if (!nombreCreible(texto)) {
      descartados.push({
        referencia: p.t,
        motivo: "Precio de folleto sin un nombre legible encima (el diseño lo imprime en otra columna)",
      });
      continue;
    }

    const referencia = numeroDeParte(texto);
    if (!referencia) {
      descartados.push({
        referencia: p.t,
        motivo: `Texto de folleto sin número de parte, no es un producto: “${texto.slice(0, 48)}…”`,
      });
      continue;
    }

    const { nombre, detalle } = nombreYDetalle(renglones);

    productos.push({
      nombre,
      marca: marcaDeNombre(nombre) ?? "",
      categoria,
      precio_costo: importe,
      referencia,
      specs: detalle ? { detalle } : undefined,
    });
  }

  return productos;
}
