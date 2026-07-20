import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Phase 24B — auth cutover. HTTP Basic Auth is RETIRED (ADMIN_USER /
 * ADMIN_PASSWORD are gone from .env.example); identity is Clerk.
 *
 * - Clerk configured: clerkMiddleware runs everywhere; /admin/* and
 *   /account/* require a session (unauthenticated → sign-in). The admin
 *   ROLE check (publicMetadata.role === 'admin') lives in the admin layout,
 *   where the full user record is available — non-admins get a clean 404.
 * - Clerk NOT configured: the public site runs untouched; /admin and
 *   /account answer 404 (admin is unreachable until the operator finishes
 *   the Clerk dashboard steps in docs/POST-RUN-CHECKLIST.md).
 */

const isProtectedRoute = createRouteMatcher(["/admin(.*)", "/account(.*)"]);

const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

function disabledFallback(request: NextRequest): NextResponse {
  if (isProtectedRoute(request)) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.next();
}

export default clerkEnabled
  ? clerkMiddleware(async (auth, request) => {
      if (isProtectedRoute(request)) {
        await auth.protect();
      }
    })
  : disabledFallback;

export const config = {
  // Clerk's standard matcher: everything except static assets, plus API routes.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
