/**
 * Access-role resolution (Phase 24B) — PURE, fixture-tested. Authorization
 * stays app-layer via Clerk claims (no RLS): the middleware ensures a
 * session exists for /admin and /account; these helpers decide what that
 * session may do. Admin requires publicMetadata.role === 'admin' exactly.
 */

export type AccessRole = "admin" | "member" | "anon";

export function resolveAccessRole(
  session: { userId: string | null; publicMetadata?: Record<string, unknown> | null } | null,
): AccessRole {
  if (session === null || session.userId === null || session.userId === "") {
    return "anon";
  }
  return session.publicMetadata?.role === "admin" ? "admin" : "member";
}

/** /admin/*: admins only — everyone else sees a clean 404 (no existence hints). */
export function canAccessAdmin(role: AccessRole): boolean {
  return role === "admin";
}

/** /account: any signed-in identity. */
export function canAccessAccount(role: AccessRole): boolean {
  return role !== "anon";
}
