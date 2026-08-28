import { parseSupplierDoc } from "@/lib/parse-supplier-doc";
import { parseJanusPdf } from "@/lib/parse-janus-pdf";
import { generateProductId } from "@/lib/supplier-catalog";
import { internalCode } from "./codes/internal-code";
import { normalizeProduct } from "./normalization/product-normalizer";
import { validateProduct } from "./validation/confidence-engine";
import type { CatimporterProduct, ImportSource } from "./types/product";

export async function importCatalog(buffer: Buffer, fileName: string, provider: string, aplicarIva = false): Promise<CatimporterProduct[]> {
  const lower = fileName.toLowerCase();
  const source: ImportSource = lower.endsWith(".pdf") ? "pdf" : lower.endsWith(".docx") ? "docx" : "xlsx";
  let parsed = await parseSupplierDoc(buffer, fileName);
  if (source === "pdf") {
    try {
      const janus = await parseJanusPdf(buffer, { aplicarIva });
      // `ParsedJanusProduct` trae `referencia` opcional y `ParsedProduct` la exige.
      if (janus.length > parsed.length) {
        parsed = janus.map((j) => ({ ...j, referencia: j.referencia ?? "" }));
      }
    } catch { /* generic parser remains authoritative fallback */ }
  }
  return parsed.map((p, i) => {
    const normalized = normalizeProduct(p.nombre, p.specs ?? {});
    const validation = validateProduct({ nombre: p.nombre, precio_costo: p.precio_costo, marca: p.marca, source });
    return { id: generateProductId(p.nombre, provider, p.referencia), internalCode: internalCode(provider, i + 1), supplierCode: p.referencia || undefined, nombre: p.nombre, marca: p.marca, categoria: p.categoria, precio_costo: p.precio_costo, proveedor: provider, specs: p.specs ?? {}, normalized, source, ...validation };
  });
}
