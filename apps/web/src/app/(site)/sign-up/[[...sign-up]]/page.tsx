import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return (
      <div className="max-w-md py-12">
        <h1 className="type-h1">Sign up</h1>
        <p className="mt-3 text-[14px] leading-[1.6] text-ink-secondary">
          Member accounts are not yet enabled — the identity provider is awaiting configuration.
          The public record needs no account; everything you can read here stays open.
        </p>
      </div>
    );
  }
  return (
    <div className="flex justify-center py-12">
      <SignUp appearance={clerkAppearance} />
    </div>
  );
}
