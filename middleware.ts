import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Admin authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Heymom admin", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}

export function middleware(request: NextRequest) {
  // Local CMS is deliberately open only during development. A public deployment
  // must have credentials configured, otherwise it is safer to disable /admin.
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const expectedUser = process.env.ADMIN_USERNAME ?? "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) {
    return new NextResponse("Admin is disabled. Configure ADMIN_PASSWORD before publishing.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return unauthorized();
  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");
    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    if (separator < 0 || username !== expectedUser || password !== expectedPassword) return unauthorized();
  } catch {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
