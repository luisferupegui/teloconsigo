import { redirect } from "next/navigation";

// "Productos y Promociones" pasó a llamarse Marketing y se movió a /admin/marketing.
// Esta ruta queda como redirección para no romper enlaces guardados.
export default async function ProductosLegacyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      v == null ? [] : Array.isArray(v) ? v.map((x) => [k, x] as [string, string]) : [[k, v] as [string, string]],
    ),
  ).toString();
  redirect(`/admin/marketing${qs ? `?${qs}` : ""}`);
}
