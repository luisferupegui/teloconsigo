import { NextResponse } from "next/server";
import { COOKIE_SESION, opcionesCookie } from "@/lib/admin-session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Mismas opciones que al emitirla, con maxAge 0. Si `path` o `secure` no
  // coinciden con los del login, el navegador crea una cookie distinta en vez de
  // borrar la que había y la sesión sigue viva.
  res.cookies.set(COOKIE_SESION, "", opcionesCookie(0));
  return res;
}
