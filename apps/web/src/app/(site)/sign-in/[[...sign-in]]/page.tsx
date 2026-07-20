import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/**
 * Sign-in (Phase 24A) — Clerk component, appearance fully tokenized.
 * Sign-in METHODS (passkeys + email) are configured in the Clerk dashboard,
 * not in code — see docs/POST-RUN-CHECKLIST.md.
 */
export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return (
      <div className="max-w-md py-12">
        <h1 className="type-h1">Sign in</h1>
        <p className="mt-3 text-[14px] leading-[1.6] text-ink-secondary">
          Member sign-in is not yet enabled — the identity provider is awaiting configuration.
          The public record needs no account; everything you can read here stays open.
        </p>
      </div>
    );
  }
  return (
    <div className="flex justify-center py-12">
      <SignIn appearance={clerkAppearance} />
    </div>
  );
}
