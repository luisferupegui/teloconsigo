import type { ParsedProduct } from "@/lib/parse-supplier-doc";

/** Un bloque del catálogo que NO se convirtió en producto, con el motivo.
 *
 *  Existe para que nada desaparezca en silencio. Un importador que devuelve "66
 *  productos" sin decir qué hizo con los otros 7 bloques obliga a confiar a
 *  ciegas; uno que dice "66 productos y 7 referencias sin ficha" se puede
 *  revisar contra el PDF. */
export type Descartado = { referencia: string; motivo: string };

export type ResultadoParser = {
  productos: ParsedProduct[];
  descartados: Descartado[];
};
