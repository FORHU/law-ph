import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "./jwt";
import { AUTH_COOKIE } from "./session";

export async function updateSession(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const user = token ? await verifyToken(token) : null;

  const { pathname } = request.nextUrl;

  const isPublicPath =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/signup" ||
    pathname === "/api/auth/forgot-password" ||
    pathname === "/api/auth/update-password" ||
    pathname === "/api/auth/callback" ||
    pathname.startsWith("/api/auth/google") ||
    pathname.startsWith("/api/webhooks");

  if (!user && !isPublicPath) {
    if (pathname.startsWith("/api")) {
      return new NextResponse(
        JSON.stringify({ error: "unauthorized", message: "Authentication required" }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
