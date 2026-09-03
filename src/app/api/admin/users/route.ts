import { COOKIE_SESION, leerSesion } from "@/lib/admin-session";
import { NextRequest, NextResponse } from "next/server";
import { listUsers, addUser, deleteUser, setPassword } from "@/lib/admin-users";

// IMPORTANTE: el proxy (src/proxy.ts) solo protege /admin/*, NO /api/admin/*.
// Como estos endpoints crean/borran administradores y cambian contraseñas,
// verificamos la sesión aquí mismo. Sin la cookie de admin → 401.
function requireAdmin(req: NextRequest): boolean {
  return leerSesion(req.cookies.get(COOKIE_SESION)?.value) !== null;
}

const UNAUTHORIZED = NextResponse.json({ error: "No autorizado" }, { status: 401 });

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return UNAUTHORIZED;
  return NextResponse.json({ users: listUsers() });
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return UNAUTHORIZED;
  const body = await req.json().catch(() => ({}));
  const r = addUser(String(body.username ?? ""), String(body.password ?? ""));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!requireAdmin(req)) return UNAUTHORIZED;
  const body = await req.json().catch(() => ({}));
  const r = setPassword(String(body.username ?? ""), String(body.password ?? ""));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!requireAdmin(req)) return UNAUTHORIZED;
  const body = await req.json().catch(() => ({}));
  const r = deleteUser(String(body.username ?? ""));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
