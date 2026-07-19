import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// INTERIM AUTH — REPLACED BY CLERK IN PHASE 23.
// HTTP Basic Auth for /admin/* against ADMIN_USER / ADMIN_PASSWORD env vars.
// Denies everything (401) when the env vars are unset.
export function middleware(request: NextRequest) {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  const header = request.headers.get("authorization");

  if (user && password && header?.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    if (
      separator > -1 &&
      decoded.slice(0, separator) === user &&
      decoded.slice(separator + 1) === password
    ) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Continuum Admin"' },
  });
}

export const config = {
  matcher: "/admin/:path*",
};
