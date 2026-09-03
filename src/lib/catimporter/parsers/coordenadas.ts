import "server-only";
// Se importa el módulo interno, NO la raíz "pdf-parse": su index.js corre un bloque de
// debug al cargarse que lee un PDF de prueba inexistente y rompe el build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

// ─── Texto CON POSICIÓN ──────────────────────────────────────────────────────
//
// El texto plano de un PDF sirve cuando el documento tiene una sola columna. En
// cuanto hay dos o tres tablas lado a lado —como en Ledacom— el extractor las
// recorre por renglón y entrega el nombre de un producto pegado al precio de
// otro. Ningún ajuste de expresiones regulares arregla eso: la información que
// falta es DÓNDE estaba cada trozo en la página.
//
// Aquí se conserva esa posición. `pdf-parse` permite reemplazar el render de
// cada página, y PDF.js entrega cada fragmento con su matriz de transformación,
// de la que salen la X y la Y.

/** `h` es el tamaño de la letra, que en los catálogos maquetados como folleto
 *  distingue el nombre de un producto de su descripción. */
export type Fragmento = { x: number; y: number; t: string; h: number };

type ItemPdfJs = { str?: string; transform?: number[] };
type PaginaPdfJs = {
  getTextContent: (o?: Record<string, unknown>) => Promise<{ items: ItemPdfJs[] }>;
};

/**
 * En qué página del PDF está impresa cada referencia.
 *
 * Sirve para una cosa concreta: cuando el lector no encuentra el precio de un
 * producto —hay proveedores que lo imprimen dentro de una imagen, o en un sitio
 * de la página que el extractor deja lejos de su ficha— alguien tiene que
 * abrirlo y escribirlo. Decirle "página 18" en vez de dejarlo con un documento
 * de 33 páginas es la diferencia entre veinte segundos y cinco minutos.
 *
 * Se busca la referencia como palabra suelta en el texto de cada página. Los
 * fragmentos se unen por renglón antes de comparar, porque PDF.js parte las
 * cadenas donde el diseñador tocó el espaciado y "90579000106" puede llegar en
 * dos trozos.
 */
export async function paginasDeReferencias(
  buffer: Buffer,
  referencias: string[],
): Promise<Map<string, number>> {
  const buscadas = referencias.filter(Boolean);
  if (buscadas.length === 0) return new Map();

  const paginas = await fragmentosDePdf(buffer);
  const out = new Map<string, number>();

  for (const [i, fragmentos] of paginas.entries()) {
    // Un solo texto por página, con los renglones ya pegados.
    const filas = new Map<number, Fragmento[]>();
    for (const f of fragmentos) {
      const fila = Math.round(f.y / 4);
      const lista = filas.get(fila);
      if (lista) lista.push(f);
      else filas.set(fila, [f]);
    }
    const texto = [...filas.values()]
      .map((fs) => fs.sort((a, b) => a.x - b.x).map((f) => f.t).join(""))
      .join("\n");

    for (const ref of buscadas) {
      if (!out.has(ref) && texto.includes(ref)) out.set(ref, i + 1);
    }
    if (out.size === buscadas.length) break;
  }

  return out;
}

/** Fragmentos de texto con su posición, página por página. */
export async function fragmentosDePdf(buffer: Buffer): Promise<Fragmento[][]> {
  const paginas: Fragmento[][] = [];

  await pdfParse(buffer, {
    // `disableCombineTextItems` evita que PDF.js pegue fragmentos vecinos: si los
    // uniera, volvería a mezclar celdas de columnas distintas, que es justo el
    // problema que se viene a resolver.
    pagerender: async (pagina: PaginaPdfJs) => {
      const contenido = await pagina.getTextContent({ disableCombineTextItems: true });
      const fragmentos: Fragmento[] = [];
      for (const item of contenido.items) {
        const t = (item.str ?? "").trim();
        if (!t || !item.transform) continue;
        // El tamaño sale de la escala de la matriz, no de un campo aparte.
        const h = Math.hypot(item.transform[2], item.transform[3]);
        fragmentos.push({
          x: Math.round(item.transform[4]),
          y: Math.round(item.transform[5]),
          t,
          h: Math.round(h * 10) / 10,
        });
      }
      paginas.push(fragmentos);
      // El texto plano no se usa: lo que interesa se guardó arriba con su posición.
      return "";
    },
  });

  return paginas;
}
