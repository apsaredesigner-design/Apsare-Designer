/**
 * Proxy (Next 16's replacement for middleware): an optimistic auth gate.
 *
 * It only checks that the `token` session cookie exists. The API enforces the
 * real session and role, and the admin panel layout also calls GET /auth/me and
 * sends non-admins back to /admin/login.
 *
 *   /admin/*   (except /admin/login) → /admin/login?next=<path>
 *   /account/*                       → /login?redirect=<path> (the storefront login reads `redirect`)
 */
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (request.cookies.has("token")) return NextResponse.next();

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdmin && (pathname === "/admin/login" || pathname.startsWith("/admin/login/"))) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = isAdmin ? "/admin/login" : "/login";
  url.search = "";
  url.searchParams.set(isAdmin ? "next" : "redirect", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
