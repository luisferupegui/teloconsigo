import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, hasAnyUser } from "@/lib/admin-users";

// Las credenciales viven en data/admin-users.json (hasheadas). El primer usuario
// se siembra desde ADMIN_USER / ADMIN_PASSWORD del .env (ver src/lib/admin-users).
// La gestión (alta/baja/cambio de clave) se hace desde /admin/usuarios.

export async function POST(req: NextRequest) {
  // Sin ningún usuario configurado (ni en el store ni sembrable desde .env) no se
  // permite login. Evita un bypass con campos vacíos cuando falta todo.
  if (!hasAnyUser()) {
    console.error("[login] No hay usuarios configurados. Define ADMIN_USER / ADMIN_PASSWORD en .env.local o crea un usuario.");
    return NextResponse.json(
      { ok: false, error: "El login no está configurado en el servidor." },
      { status: 401 },
    );
  }

  let username = "";
  let password = "";
  try {
    const body = await req.json();
    if (typeof body?.username === "string") username = body.username;
    if (typeof body?.password === "string") password = body.password;
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida" }, { status: 400 });
  }

  if (verifyCredentials(username, password)) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_auth", "yes", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 horas
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  }

  return NextResponse.json(
    { ok: false, error: "Usuario o contraseña incorrectos" },
    { status: 401 },
  );
}
