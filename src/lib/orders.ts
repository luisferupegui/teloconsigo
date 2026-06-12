import "server-only";
import fs from "fs";
import path from "path";

const ORDERS_PATH = path.join(process.cwd(), "data", "orders.json");

export type OrderEstado = "pendiente" | "confirmado" | "enviado" | "entregado";

export type Order = {
  id: string;
  orderNumber: string;   // formato DDMMYY + consecutivo (ej: 120626101)
  fecha: string;
  cliente: {
    nombre: string;
    cedula: string;
    direccion: string;
    ciudad: string;
    telefono: string;
    email: string;
  };
  producto: {
    nombre: string;
    modelo?: string;
    cantidad: number;
    precioCOP: number;
    proveedor: "colombia" | "eeuu";
  };
  estado: OrderEstado;
};

export function getOrders(): Order[] {
  try {
    return JSON.parse(fs.readFileSync(ORDERS_PATH, "utf-8")) as Order[];
  } catch {
    return [];
  }
}

function generateOrderNumber(existingOrders: Order[]): string {
  // Prefijo: fecha del día en Colombia (DDMMYY)
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(2);
  const datePrefix = `${dd}${mm}${yy}`;

  // Consecutivo GLOBAL (no se reinicia por día).
  // Rango 101–999 (899 valores), luego vuelve a 100.
  // Fórmula: 100 + ((n + 1) % 900)  donde n = total de órdenes existentes.
  // n=0 → 101, n=898 → 999, n=899 → 100, n=900 → 101, …
  const consecutive = 100 + ((existingOrders.length + 1) % 900);
  return `${datePrefix}${consecutive}`;
}

export function saveOrder(order: Omit<Order, "id" | "orderNumber" | "fecha" | "estado">): Order {
  const orders = getOrders();
  const newOrder: Order = {
    ...order,
    id: crypto.randomUUID(),
    orderNumber: generateOrderNumber(orders),
    fecha: new Date().toISOString(),
    estado: "pendiente",
  };
  orders.unshift(newOrder);
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2), "utf-8");
  return newOrder;
}

export function updateOrderEstado(id: string, estado: OrderEstado): boolean {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return false;
  orders[idx].estado = estado;
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2), "utf-8");
  return true;
}
