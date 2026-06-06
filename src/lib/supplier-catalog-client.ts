export type SupplierProductWithMargin = {
  id: string;
  nombre: string;
  marca: string;
  categoria: string;
  precio_costo: number;
  proveedor: string;
  referencia?: string;
  specs?: Record<string, string>;
  importedAt: string;
  precio_final: number;
  margen: number;
};

export const CATEGORY_EMOJI: Record<string, string> = {
  portatil: "💻",
  procesador: "🔲",
  monitor: "🖥️",
  "memoria-ram": "🧠",
  almacenamiento: "💾",
  "tarjeta-grafica": "🎮",
  "fuente-poder": "⚡",
  refrigeracion: "❄️",
  escritorio: "🖥️",
  redes: "📡",
  mouse: "🖱️",
  auriculares: "🎧",
  streaming: "📹",
  impresora: "🖨️",
  accesorios: "🔌",
  teclado: "⌨️",
  motherboard: "🔲",
  default: "📦",
};
