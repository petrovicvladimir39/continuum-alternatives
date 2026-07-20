import Link from "next/link";
import { listPendingClaims } from "@continuum/db";
import { Button } from "@/components/ui/button";
import { decideClaimAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * /admin/claims (Phase 33A) — pending stewardship claims, identity shown.
 * Approving makes the claimant the org's ONE steward (partial unique index
 * backstops it).
 */
export default async function ClaimsPage() {
  const claims = await listPendingClaims();
  return (
    <div>
      <h1 className="type-h2">Claims</h1>
      <p className="mt-2 max-w-xl text-[13px] text-ink-secondary">
        Pending organization claims. Approve → the member stewards the org (statement +
        suggestions only, never direct record writes). One approved claim per org, ever.
      </p>
      {claims.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-muted">No pending claims.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {claims.map((claim) => (
            <div key={claim.id} className="border border-line p-3">
              <p className="text-[13px]">
                <Link href={`/companies/${claim.entitySlug}`} className="font-medium text-accent hover:underline">
                  {claim.entityName}
                </Link>
                <span className="text-ink-muted">
                  {" "}
                  · claimed by <span className="font-medium text-ink">{claim.memberName}</span>
                  {claim.memberEmail !== null ? ` (${claim.memberEmail})` : ""}
                  {" · "}
                  {claim.method === "email_domain" ? "email-domain match" : "manual evidence"}
                </span>
              </p>
              {claim.evidence !== null ? (
                <p className="mt-1 border-l-2 border-line pl-2 text-[13px] text-ink-secondary">
                  {claim.evidence}
                </p>
              ) : null}
              <div className="mt-2 flex gap-3">
                <form action={decideClaimAction}>
                  <input type="hidden" name="claimId" value={claim.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <Button type="submit" variant="ghost">
                    Approve
                  </Button>
                </form>
                <form action={decideClaimAction}>
                  <input type="hidden" name="claimId" value={claim.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <button type="submit" className="text-[12px] text-ink-muted hover:text-distressed">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
