import "server-only";
import fs from "fs";
import path from "path";

const ORDERS_PATH   = path.join(process.cwd(), "data", "orders.json");
const HISTORY_PATH  = path.join(process.cwd(), "data", "orders-history.json");

export type OrderEstado = "pendiente" | "confirmado" | "enviado" | "entregado";

export type ProveedorDetalle = {
  urlCompra?:           string;   // enlace Amazon/Newegg donde comprar
  costoUSD?:            number;   // precio en origen (USD)
  costoTotalCOP?:       number;   // costo puesto en Colombia (fórmula importación)
  margenCOP?:           number;   // precio venta − costo total
  proveedorLocal?:      "ledacom" | "infoshop" | "manual";
  // Comparación de mercado local (solo admin — nunca visible al cliente)
  precioMercadoLocal?:  number;   // promedio de precios en MercadoLibre/Alkosto/etc.
  fuenteLocal?:         string;   // URL de un listing local de referencia
  comparacionMercado?:  string;   // "MercadoLibre más económico: $X vs $Y (US importado)"
};

export type Order = {
  id:          string;
  orderNumber: string;   // DDMMYY + consecutivo (ej: 120626101)
  fecha:       string;
  cliente: {
    nombre:    string;
    cedula:    string;
    direccion: string;
    ciudad:    string;
    telefono:  string;
    email:     string;
  };
  producto: {
    nombre:    string;
    modelo?:   string;
    cantidad:  number;
    precioCOP: number;
    proveedor: "colombia" | "eeuu";
  };
  proveedorDetalle?: ProveedorDetalle;
  estado: OrderEstado;
};

export type HistoryOrder = Order & { fechaArchivado: string };

// ── Helpers de IO ─────────────────────────────────────────────────────────────

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ── Pedidos activos ───────────────────────────────────────────────────────────

export function getOrders(): Order[] {
  return readJSON<Order[]>(ORDERS_PATH, []);
}

function generateOrderNumber(existingOrders: Order[]): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(2);
  const consecutive = 100 + ((existingOrders.length + 1) % 900);
  return `${dd}${mm}${yy}${consecutive}`;
}

export function saveOrder(
  order: Omit<Order, "id" | "orderNumber" | "fecha" | "estado">
): Order {
  const orders = getOrders();
  const newOrder: Order = {
    ...order,
    id:          crypto.randomUUID(),
    orderNumber: generateOrderNumber(orders),
    fecha:       new Date().toISOString(),
    estado:      "pendiente",
  };
  orders.unshift(newOrder);
  writeJSON(ORDERS_PATH, orders);
  return newOrder;
}

export function updateOrderEstado(id: string, estado: OrderEstado): boolean {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return false;
  orders[idx].estado = estado;
  writeJSON(ORDERS_PATH, orders);
  return true;
}

/** Mueve el pedido al historial y lo elimina de pedidos activos. */
export function deleteOrder(id: string): boolean {
  const orders = getOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return false;

  const [removed] = orders.splice(idx, 1);
  writeJSON(ORDERS_PATH, orders);

  const history = getHistory();
  const archived: HistoryOrder = { ...removed, fechaArchivado: new Date().toISOString() };
  history.unshift(archived);
  writeJSON(HISTORY_PATH, history);

  return true;
}

// ── Historial ─────────────────────────────────────────────────────────────────

export function getHistory(): HistoryOrder[] {
  return readJSON<HistoryOrder[]>(HISTORY_PATH, []);
}

/** Devuelve los pedidos del historial cuya fecha de archivo supera los 6 meses. */
export function getExpiredHistory(): HistoryOrder[] {
  const SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - SIX_MONTHS;
  return getHistory().filter((o) => new Date(o.fechaArchivado).getTime() < cutoff);
}

/** Elimina TODOS los pedidos del historial. */
export function clearHistory(): void {
  writeJSON(HISTORY_PATH, []);
}

/** Genera un CSV con todos los pedidos del historial. */
export function exportHistoryCSV(): string {
  const history = getHistory();

  const header = [
    "N° Orden", "Fecha pedido", "Fecha archivado",
    "Cliente", "Cédula", "Ciudad", "Teléfono", "Email", "Dirección",
    "Producto", "Modelo", "Cantidad", "Precio venta COP",
    "Proveedor", "URL compra", "Costo USD", "Costo total COP", "Margen COP",
    "Proveedor local", "Estado",
  ].join(",");

  const rows = history.map((o) => {
    const d = o.proveedorDetalle ?? {};
    return [
      o.orderNumber ?? "",
      new Date(o.fecha).toLocaleString("es-CO", { timeZone: "America/Bogota" }),
      new Date(o.fechaArchivado).toLocaleString("es-CO", { timeZone: "America/Bogota" }),
      csv(o.cliente.nombre),
      csv(o.cliente.cedula),
      csv(o.cliente.ciudad),
      csv(o.cliente.telefono),
      csv(o.cliente.email),
      csv(o.cliente.direccion),
      csv(o.producto.nombre),
      csv(o.producto.modelo ?? ""),
      o.producto.cantidad,
      o.producto.precioCOP * o.producto.cantidad,
      o.producto.proveedor === "eeuu" ? "EE.UU." : "Colombia",
      csv(d.urlCompra ?? ""),
      d.costoUSD ?? "",
      d.costoTotalCOP ?? "",
      d.margenCOP ?? "",
      csv(d.proveedorLocal ?? ""),
      o.estado,
    ].join(",");
  });

  return [header, ...rows].join("\n");
}

function csv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
