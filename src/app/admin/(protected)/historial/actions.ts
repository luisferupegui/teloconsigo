"use server";

import { COOKIE_SESION, leerSesion } from "@/lib/admin-session";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { clearHistory, updateHistoryEstado, type OrderEstado } from "@/lib/orders";

export async function limpiarHistorial() {
  const cookieStore = await cookies();
  if (!leerSesion(cookieStore.get(COOKIE_SESION)?.value)) throw new Error("No autorizado");
  clearHistory();
  revalidatePath("/admin/historial");
}

export async function cambiarEstadoHistorial(orderId: string, estado: OrderEstado) {
  const cookieStore = await cookies();
  if (!leerSesion(cookieStore.get(COOKIE_SESION)?.value)) throw new Error("No autorizado");
  updateHistoryEstado(orderId, estado);
  revalidatePath("/admin/historial");
}
