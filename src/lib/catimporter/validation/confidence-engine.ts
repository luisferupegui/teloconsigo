import type { CatimporterProduct, ConfidenceLevel } from "../types/product";

type Validacion = {
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  warnings: string[];
  requiresReview: boolean;
};

export function validateProduct(
  product: Pick<CatimporterProduct, "nombre" | "precio_costo" | "marca" | "source">,
): Validacion {
  const warnings: string[] = [];
  let confidence = 100;
  if (!product.nombre?.trim()) { warnings.push("Nombre faltante"); confidence -= 40; }
  if (!(product.precio_costo > 0)) { warnings.push("Precio faltante"); confidence -= 40; }
  if (product.precio_costo > 0 && product.precio_costo < 1000) { warnings.push("Precio sospechosamente bajo"); confidence -= 20; }
  if (!product.marca?.trim()) { warnings.push("Marca no identificada"); confidence -= 5; }
  if (product.source === "pdf") { warnings.push("Origen PDF: revisar asociaciones visuales si hay dudas"); confidence -= 3; }
  confidence = Math.max(0, confidence);
  return { confidence, confidenceLevel: confidence >= 85 ? "high" : confidence >= 65 ? "medium" : "low", warnings, requiresReview: confidence < 85 || warnings.some(w => /faltante|sospechosamente/i.test(w)) };
}
