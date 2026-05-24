// Tipos y utilidades client-safe (sin `fs`)
export type Product = {
  id: string;
  slug: string;
  nombre: string;
  marca: string;
  categoria: string;
  precio: number;
  precioAnterior?: number;
  stock: number;
  rating: number;
  reviews: number;
  imagen: string;
  destacado?: boolean;
  specs: Record<string, string | number>;
  descripcion: string;
};

export const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
