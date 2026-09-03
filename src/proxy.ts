import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESION, leerSesion } from "@/lib/admin-session";

// Endpoints del flujo de auth que DEBEN seguir accesibles sin sesión.
const PUBLIC_API = new Set(["/api/admin/login", "/api/admin/logout"]);

// La sesión se VALIDA, no se mira si existe. Antes bastaba con que la cookie
// dijera "yes", y esa cadena la escribe cualquiera desde la consola del
// navegador: `document.cookie = "admin_auth=yes"` y dentro. Ahora el valor va
// firmado con un secreto del servidor y se comprueba la firma en cada petición.
//
// Este archivo corre en el runtime de Node —así lo hace Proxy en esta versión de
// Next— así que puede usar `node:crypto` y leer el fichero de credenciales.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = leerSesion(request.cookies.get(COOKIE_SESION)?.value) !== null;

  // ── Rutas API del panel admin ───────────────────────────────────────────────
  // El matcher de páginas (/admin/*) NO cubría /api/admin/*, así que esas rutas
  // quedaban sin autenticar. Aquí las cerramos: sin cookie → 401 JSON. No se
  // redirige (una API no debe mandar a /admin/login); solo login/logout son
  // públicas (el flujo de auth).
  if (pathname.startsWith("/api/admin")) {
    if (PUBLIC_API.has(pathname) || isLoggedIn) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // ── Páginas del panel admin (/admin/*) ──────────────────────────────────────
  const isLoginPage = pathname === "/admin/login";

  let response: NextResponse;

  if (!isLoggedIn && !isLoginPage) {
    response = NextResponse.redirect(new URL("/admin/login", request.url));
  } else if (isLoggedIn && isLoginPage) {
    response = NextResponse.redirect(new URL("/admin", request.url));
  } else {
    response = NextResponse.next();
  }

  // Pasa el pathname al root layout para ocultar navbar/footer en /admin/*
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
