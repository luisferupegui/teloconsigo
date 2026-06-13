import { cookies } from "next/headers";
import { exportHistoryCSV } from "@/lib/orders";

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_auth")?.value !== "yes") {
    return new Response("No autorizado", { status: 401 });
  }

  const csv = exportHistoryCSV();
  const fecha = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="historial-pedidos-${fecha}.csv"`,
    },
  });
}
