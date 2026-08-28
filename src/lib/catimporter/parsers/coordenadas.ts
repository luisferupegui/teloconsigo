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

export type Fragmento = { x: number; y: number; t: string };

type ItemPdfJs = { str?: string; transform?: number[] };
type PaginaPdfJs = {
  getTextContent: (o?: Record<string, unknown>) => Promise<{ items: ItemPdfJs[] }>;
};

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
        fragmentos.push({ x: Math.round(item.transform[4]), y: Math.round(item.transform[5]), t });
      }
      paginas.push(fragmentos);
      // El texto plano no se usa: lo que interesa se guardó arriba con su posición.
      return "";
    },
  });

  return paginas;
}
