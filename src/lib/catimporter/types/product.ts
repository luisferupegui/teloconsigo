export type ImportSource = "pdf" | "docx" | "xlsx";
export type ConfidenceLevel = "high" | "medium" | "low";

export type CatimporterProduct = {
  id: string;
  internalCode: string;
  supplierCode?: string;
  nombre: string;
  marca: string;
  categoria: string;
  precio_costo: number;
  proveedor: string;
  specs: Record<string, string>;
  normalized: Record<string, string | number>;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  warnings: string[];
  source: ImportSource;
  requiresReview: boolean;
};
