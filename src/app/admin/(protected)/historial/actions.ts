"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { clearHistory } from "@/lib/orders";

export async function limpiarHistorial() {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_auth")?.value !== "yes") throw new Error("No autorizado");
  clearHistory();
  revalidatePath("/admin/historial");
}
