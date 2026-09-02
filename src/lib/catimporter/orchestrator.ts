import { parseSupplierDoc, type ParsedProduct } from "@/lib/parse-supplier-doc";
import { parseJanusPdf } from "@/lib/parse-janus-pdf";
import { generateProductId } from "@/lib/supplier-catalog";
import { internalCode } from "./codes/internal-code";
import { normalizeProduct } from "./normalization/product-normalizer";
import { validateProduct } from "./validation/confidence-engine";
import { detectarProveedor } from "./parsers";
import type { Descartado } from "./parsers/tipos";
import type { CatimporterProduct, ImportSource } from "./types/product";

export type ResultadoImportacion = {
  motor: string;
  productos: CatimporterProduct[];
  /** Bloques del catálogo que no llegaron a producto, con el motivo. Nada se
   *  pierde en silencio: si el PDF trae 73 fichas y salen 66 productos, aquí
   *  están los 7 que faltan y por qué. */
  descartados: Descartado[];
};

/** Envuelve lo que devuelve un lector en la ficha de Catimporter: código interno,
 *  specs normalizadas y puntaje de confianza. */
function construir(
  parsed: ParsedProduct[],
  provider: string,
  source: ImportSource,
): CatimporterProduct[] {
  return parsed.map((p, i) => {
    const normalized = normalizeProduct(p.nombre, p.specs ?? {});
    const validation = validateProduct({
      nombre: p.nombre, precio_costo: p.precio_costo, marca: p.marca, source,
    });
    return {
      id: generateProductId(p.nombre, provider, p.referencia),
      internalCode: internalCode(provider, i + 1),
      supplierCode: p.referencia || undefined,
      nombre: p.nombre,
      marca: p.marca,
      categoria: p.categoria,
      precio_costo: p.precio_costo,
      proveedor: provider,
      specs: p.specs ?? {},
      normalized,
      source,
      ...validation,
    };
  });
}

export async function importCatalog(
  buffer: Buffer,
  fileName: string,
  provider: string,
  aplicarIva = false,
): Promise<ResultadoImportacion> {
  const lower = fileName.toLowerCase();
  const source: ImportSource = lower.endsWith(".pdf") ? "pdf" : lower.endsWith(".docx") ? "docx" : "xlsx";

  if (source === "pdf") {
    // MOTOR PROPIO DEL PROVEEDOR PRIMERO. Compumax y Compuoriente no publican
    // tablas sino fichas de "Etiqueta: valor", y el lector genérico —que busca un
    // nombre a la izquierda de un precio— devolvía CERO productos en ambas.
    // Si el catálogo se identifica a sí mismo, manda su motor: no compite por
    // cantidad contra el genérico, porque el genérico ahí no sabe leer.
    const { motor } = await detectarProveedor(buffer);
    if (motor) {
      const { productos, descartados } = await motor.parse(buffer);
      if (productos.length > 0) {
        return { motor: motor.nombre, productos: construir(productos, provider, source), descartados };
      }
    }
  }

  let parsed = await parseSupplierDoc(buffer, fileName);
  let motor = source === "pdf" ? "Genérico (PDF)" : `Genérico (${source.toUpperCase()})`;

  if (source === "pdf") {
    try {
      const janus = await parseJanusPdf(buffer, { aplicarIva });
      // `ParsedJanusProduct` trae `referencia` opcional y `ParsedProduct` la exige.
      if (janus.length > parsed.length) {
        parsed = janus.map((j) => ({ ...j, referencia: j.referencia ?? "" }));
        motor = "Janus";
      }
    } catch { /* el lector genérico sigue siendo el respaldo */ }
  }

  return { motor, productos: construir(parsed, provider, source), descartados: [] };
}
