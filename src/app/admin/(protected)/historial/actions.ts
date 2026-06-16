"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { clearHistory, updateHistoryEstado, type OrderEstado } from "@/lib/orders";

export async function limpiarHistorial() {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_auth")?.value !== "yes") throw new Error("No autorizado");
  clearHistory();
  revalidatePath("/admin/historial");
}

export async function cambiarEstadoHistorial(orderId: string, estado: OrderEstado) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_auth")?.value !== "yes") throw new Error("No autorizado");
  updateHistoryEstado(orderId, estado);
  revalidatePath("/admin/historial");
}
