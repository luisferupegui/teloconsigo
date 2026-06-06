import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

// Credenciales del panel admin. Se leen del entorno (.env.local, gitignored) —
// nunca deben estar hardcodeadas en el código fuente ni quedar en el repo.
const USERNAME = process.env.ADMIN_USER;
const PASSWORD = process.env.ADMIN_PASSWORD;

// Comparación de tiempo constante e independiente de la longitud: comparamos los
// hashes SHA-256 (siempre 32 bytes), así no se filtra ni el contenido ni el largo.
function safeEqual(a: string, b: string): boolean {
  const ah = createHash("sha256").update(a).digest();
  const bh = createHash("sha256").update(b).digest();
  return timingSafeEqual(ah, bh);
}

export async function POST(req: NextRequest) {
  // Sin credenciales configuradas NO se permite ningún login. Esto evita un bypass
  // con campos vacíos (undefined === undefined) cuando faltan las variables.
  if (!USERNAME || !PASSWORD) {
    console.error("[login] Falta configurar ADMIN_USER / ADMIN_PASSWORD en .env.local");
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

  const valid = safeEqual(username, USERNAME) && safeEqual(password, PASSWORD);

  if (valid) {
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
