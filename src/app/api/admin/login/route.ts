import { NextRequest, NextResponse } from "next/server";

const USERNAME = "Admin";
const PASSWORD = "aDmin8@";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (username === USERNAME && password === PASSWORD) {
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
