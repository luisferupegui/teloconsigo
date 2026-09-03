import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, hasAnyUser } from "@/lib/admin-users";
import { COOKIE_SESION, crearSesion, opcionesCookie } from "@/lib/admin-session";

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
    // La cookie ya no vale la cadena "yes" —que cualquiera escribía a mano en la
    // consola del navegador y entraba— sino un dato firmado con un secreto del
    // servidor. Ver src/lib/admin-session.ts.
    const sesion = crearSesion(username);
    if (!sesion) {
      console.error(
        "[login] No hay con qué firmar la sesión: falta ADMIN_SESSION_SECRET y no se pudo leer data/admin-users.json.",
      );
      return NextResponse.json(
        { ok: false, error: "El login no está configurado en el servidor." },
        { status: 500 },
      );
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_SESION, sesion.valor, opcionesCookie(sesion.maxAge));
    return res;
  }

  return NextResponse.json(
    { ok: false, error: "Usuario o contraseña incorrectos" },
    { status: 401 },
  );
}
