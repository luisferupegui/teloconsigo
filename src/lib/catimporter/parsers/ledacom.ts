import "server-only";
import { marcaDeNombre } from "@/lib/marcas";
import type { ParsedProduct } from "@/lib/parse-supplier-doc";
import type { Descartado, ResultadoParser } from "./tipos";
import { fragmentosDePdf, type Fragmento } from "./coordenadas";
import { fichasDePagina } from "./ledacom-fichas";
import { categoriaDeProducto } from "./categorias";

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

/** Filas: fragmentos que comparten la misma banda vertical. La tolerancia es de
 *  3 puntos porque una celda con el nombre en dos renglones desplaza su precio
 *  un par de puntos respecto a la referencia. */
function filasDe(fragmentos: Fragmento[]): Fragmento[][] {
  // POR CERCANÍA, no por bandas fijas. Dentro de una misma fila los fragmentos
  // no están perfectamente alineados: el nombre suele ir un punto por encima de
  // su referencia y su precio.
  //
  //   y=379 x=212 | 910-007456
  //   y=379 x=379 | $40.000
  //   y=380 x=255 | Mouse Logitech M196 Bluetooth Graffito   ← 1pt más arriba
  //
  // Con bandas fijas (redondeando y/3) ese punto caía justo en el corte y partía
  // la fila en dos: la referencia y el precio quedaban sin nombre, y el producto
  // se descartaba. Agrupando por distancia no hay corte donde partir.
  //
  // La tolerancia es 3 porque las filas del catálogo van separadas 6 puntos:
  // suficiente para absorber el desalineado y demasiado poco para fundir dos.
  const TOLERANCIA = 3;
  const orden = [...fragmentos].sort((a, b) => b.y - a.y);
  const filas: Fragmento[][] = [];
  let actual: Fragmento[] = [];
  let yFila = Number.POSITIVE_INFINITY;

  for (const f of orden) {
    if (actual.length > 0 && yFila - f.y > TOLERANCIA) {
      filas.push(actual.sort((a, b) => a.x - b.x));
      actual = [];
    }
    if (actual.length === 0) yFila = f.y;
    actual.push(f);
  }
  if (actual.length > 0) filas.push(actual.sort((a, b) => a.x - b.x));
  return filas;
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
          marca: marcaDeNombre(nombre, categoriaDeProducto(nombre, seccion)) ?? "",
          categoria: categoriaDeProducto(nombre, seccion),
          precio_costo: precio,
          referencia,
          specs: seccion ? { seccion } : undefined,
        });
      }
    }
  }

  return { productos, descartados };
}
