import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = request.cookies.get("admin_auth")?.value === "yes";
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
  matcher: ["/admin/:path*"],
};
