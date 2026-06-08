import { UsersManager } from "@/components/admin/users-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usuarios · Admin" };

export default function UsuariosAdminPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">👤 Usuarios del panel</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Crea accesos al panel admin, cámbiales la contraseña o bórralos.
        </p>
      </div>
      <UsersManager />
    </div>
  );
}
