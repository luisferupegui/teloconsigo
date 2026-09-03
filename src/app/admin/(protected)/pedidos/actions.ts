"use server";

import { COOKIE_SESION, leerSesion } from "@/lib/admin-session";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { updateOrderEstado, deleteOrder, type OrderEstado } from "@/lib/orders";

export async function cambiarEstado(orderId: string, estado: OrderEstado) {
  const cookieStore = await cookies();
  if (!leerSesion(cookieStore.get(COOKIE_SESION)?.value)) throw new Error("No autorizado");
  updateOrderEstado(orderId, estado);
  revalidatePath("/admin/pedidos");
}

export async function borrarPedido(orderId: string) {
  const cookieStore = await cookies();
  if (!leerSesion(cookieStore.get(COOKIE_SESION)?.value)) throw new Error("No autorizado");
  deleteOrder(orderId);
  revalidatePath("/admin/pedidos");
}
