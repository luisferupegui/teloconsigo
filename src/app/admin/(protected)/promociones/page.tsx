import { redirect } from "next/navigation";

// Promociones se fusionó con Productos: ahora todo se gestiona en una sola lista
// unificada. Mantenemos esta ruta como redirección por compatibilidad.
export default function PromocionesAdminPage() {
  redirect("/admin/marketing?filter=promo");
}
