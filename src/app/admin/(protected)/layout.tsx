import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogoutButton } from "../components/logout-button";

export const metadata = { title: "Admin · Te lo Consigo" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  if (cookieStore.get("admin_auth")?.value !== "yes") redirect("/admin/login");
  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-lg font-bold text-zinc-900"
            >
              ⚙️ Admin · Te lo Consigo
            </Link>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              MODO DESARROLLO
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-zinc-600 hover:text-[#1e6cff]"
            >
              ← Ver tienda
            </Link>
            <LogoutButton />
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl gap-1 px-4 sm:px-6 lg:px-8">
          {[
            ["/admin", "📦 Catálogo"],
            ["/admin/productos", "📋 Productos y Promociones"],
            ["/admin/nuevo", "➕ Nuevo"],
            ["/admin/importar", "📥 Importar CSV"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-zinc-600 hover:border-[#1e6cff] hover:text-[#1e6cff]"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
