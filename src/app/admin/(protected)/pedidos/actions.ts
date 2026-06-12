"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { updateOrderEstado, type OrderEstado } from "@/lib/orders";

export async function cambiarEstado(orderId: string, estado: OrderEstado) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_auth")?.value !== "yes") throw new Error("No autorizado");
  updateOrderEstado(orderId, estado);
  revalidatePath("/admin/pedidos");
}
