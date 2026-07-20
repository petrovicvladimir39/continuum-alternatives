import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  claimStateFor,
  getMemberByClerkId,
  isVendorOrg,
  publishedStories,
  STEWARD_SUGGESTABLE_FIELDS,
  vendorActive,
} from "@continuum/db";
import { renderArticleBody } from "@/components/editorial/article-view";
import { Button } from "@/components/ui/button";
import {
  claimOrgAction,
  createStoryAction,
  setStatementAction,
  startVendorCheckoutAction,
  suggestFieldAction,
} from "@/lib/platform-actions";

/**
 * Claiming + steward tools + vendor track record (Phase 33A/B), one
 * section on organization profiles. Steward powers are NARROW by design:
 * the labeled own-voice statement and review-queue suggestions — the
 * record itself never takes a steward's word directly.
 */

const FIELD_LABELS: Record<string, string> = {
  founded_year: "Founded year",
  hq_address: "HQ address",
  aum_text: "AUM (as stated)",
  team_size_text: "Team size (as stated)",
};

export async function OrgStewardSection({
  entityId,
  entityName,
  backPath,
  stewardStatement,
}: {
  entityId: string;
  entityName: string;
  backPath: string;
  stewardStatement: string | null;
}) {
  const clerkEnabled = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
  const [stories, isVendor, vendorLive] = await Promise.all([
    publishedStories(entityId),
    isVendorOrg(entityId),
    vendorActive(entityId),
  ]);

  let memberId: string | null = null;
  if (clerkEnabled) {
    const { userId } = await auth();
    const member = userId === null ? null : await getMemberByClerkId(userId);
    memberId = member?.id ?? null;
  }
  const claimState = await claimStateFor(entityId, memberId);
  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_VENDOR);

  return (
    <>
      {/* ── Track record (33B) — published, consent-resolved stories. */}
      {stories.length > 0 ? (
        <section className="mt-10">
          <h2 className="type-h2">Track record</h2>
          {vendorLive ? (
            <p className="type-small mt-1 text-ink-muted">
              Verified vendor · stories reviewed before publication; client names appear only with
              the client&apos;s consent.
            </p>
          ) : null}
          <div className="mt-3 max-w-2xl space-y-5">
            {stories.map((story) => (
              <div key={story.id} className="border-t border-line pt-3">
                <h3 className="type-h3">{story.title}</h3>
                <div className="mt-1 text-[13px] [&>p]:mb-2 [&>p]:leading-[1.55]">
                  {renderArticleBody(story.bodyMd)}
                </div>
                <p className="type-small text-ink-muted">
                  {story.clientDisplay !== null ? (
                    <>
                      Client:{" "}
                      {story.clientHref !== null ? (
                        <Link href={story.clientHref} className="text-accent hover:underline">
                          {story.clientDisplay}
                        </Link>
                      ) : (
                        story.clientDisplay
                      )}
                    </>
                  ) : null}
                  {story.dealName !== null ? (
                    <>
                      {story.clientDisplay !== null ? " · " : ""}Deal:{" "}
                      {story.dealHref !== null ? (
                        <Link href={story.dealHref} className="text-accent hover:underline">
                          {story.dealName}
                        </Link>
                      ) : (
                        story.dealName
                      )}
                    </>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Claiming (33A) — quiet, signed-in only. */}
      {memberId !== null ? (
        <section className="mt-10 border-t border-line pt-4">
          {claimState === "claimed_mine" ? (
            <StewardTools
              entityId={entityId}
              entityName={entityName}
              backPath={backPath}
              stewardStatement={stewardStatement}
              isVendor={isVendor}
              vendorLive={vendorLive}
              stripeReady={stripeReady}
            />
          ) : claimState === "pending_mine" ? (
            <p className="text-[13px] text-ink-muted">
              Your claim on this organization awaits operator review.
            </p>
          ) : claimState === "claimed_other" ? null : (
            <details>
              <summary className="cursor-pointer list-none text-[13px] text-ink-muted hover:text-accent [&::-webkit-details-marker]:hidden">
                Work here? Claim this organization
              </summary>
              <form action={claimOrgAction} className="mt-2 max-w-md">
                <input type="hidden" name="entityId" value={entityId} />
                <input type="hidden" name="backPath" value={backPath} />
                <p className="text-[12px] leading-[1.5] text-ink-secondary">
                  If your sign-in email matches this organization&apos;s website domain the claim
                  files automatically; otherwise say briefly how we can verify you. Every claim is
                  reviewed by the operator before stewardship is granted.
                </p>
                <input
                  name="evidence"
                  maxLength={300}
                  placeholder="How can we verify you? (needed unless your email domain matches)"
                  className="mt-2 w-full border border-line bg-surface px-2 py-1 text-[12px] outline-none focus:border-line-strong"
                />
                <Button type="submit" variant="ghost" className="mt-2">
                  Submit claim
                </Button>
              </form>
            </details>
          )}
        </section>
      ) : null}
    </>
  );
}

function StewardTools({
  entityId,
  entityName,
  backPath,
  stewardStatement,
  isVendor,
  vendorLive,
  stripeReady,
}: {
  entityId: string;
  entityName: string;
  backPath: string;
  stewardStatement: string | null;
  isVendor: boolean;
  vendorLive: boolean;
  stripeReady: boolean;
}) {
  return (
    <div>
      <h2 className="type-label">Steward tools — you manage this organization&apos;s voice</h2>
      <div className="mt-3 max-w-xl space-y-5">
        <form action={setStatementAction}>
          <input type="hidden" name="entityId" value={entityId} />
          <input type="hidden" name="backPath" value={backPath} />
          <label className="type-small text-ink-secondary" htmlFor="steward-statement">
            &ldquo;From {entityName}&rdquo; — your organization&apos;s own statement (≤600 chars,
            always labeled as yours; it never alters the record)
          </label>
          <textarea
            id="steward-statement"
            name="statement"
            rows={3}
            maxLength={700}
            defaultValue={stewardStatement ?? ""}
            className="mt-1 w-full border border-line bg-surface px-2.5 py-2 text-[13px] leading-[1.55] outline-none focus:border-line-strong"
          />
          <Button type="submit" variant="ghost" className="mt-1.5">
            Save statement
          </Button>
        </form>

        <form action={suggestFieldAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="entityId" value={entityId} />
          <input type="hidden" name="backPath" value={backPath} />
          <label className="block">
            <span className="type-label">Suggest a correction</span>
            <select name="field" className="mt-1 block rounded-sm border border-line bg-surface px-2 py-1.5 text-[13px]">
              {STEWARD_SUGGESTABLE_FIELDS.map((field) => (
                <option key={field} value={field}>
                  {FIELD_LABELS[field] ?? field}
                </option>
              ))}
            </select>
          </label>
          <input
            name="value"
            maxLength={200}
            placeholder="Correct value"
            className="min-w-[180px] flex-1 border border-line bg-surface px-2 py-1.5 text-[13px] outline-none focus:border-line-strong"
          />
          <Button type="submit" variant="ghost">
            Suggest
          </Button>
          <p className="type-small w-full text-ink-muted">
            Suggestions go through the operator&apos;s review queue — stewards never edit the
            record directly.
          </p>
        </form>

        {/* ── Vendor tier (33B). Pre-config honesty when Stripe absent. */}
        {isVendor ? (
          vendorLive ? (
            <form action={createStoryAction} className="border-t border-line pt-4">
              <p className="type-label">Add a track-record story</p>
              <input type="hidden" name="entityId" value={entityId} />
              <input type="hidden" name="backPath" value={backPath} />
              <input
                name="title"
                maxLength={90}
                placeholder="Title (≤90 chars)"
                className="mt-2 w-full border border-line bg-surface px-2 py-1.5 text-[13px] outline-none focus:border-line-strong"
              />
              <textarea
                name="body"
                rows={4}
                maxLength={2400}
                placeholder="What you did, for whom, with what outcome — markdown subset (bold, links)."
                className="mt-2 w-full border border-line bg-surface px-2.5 py-2 text-[13px] leading-[1.55] outline-none focus:border-line-strong"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  name="clientSlug"
                  placeholder="Client company slug (optional)"
                  className="min-w-[200px] flex-1 border border-line bg-surface px-2 py-1 text-[12px] outline-none focus:border-line-strong"
                />
                <input
                  name="dealSlug"
                  placeholder="Deal slug (optional)"
                  className="min-w-[160px] flex-1 border border-line bg-surface px-2 py-1 text-[12px] outline-none focus:border-line-strong"
                />
              </div>
              <Button type="submit" variant="ghost" className="mt-2">
                Submit story
              </Button>
              <p className="type-small mt-1.5 text-ink-muted">
                Stories are reviewed before publication. A referenced client is NAMED only after
                that client&apos;s steward consents — otherwise it publishes anonymized (&ldquo;a
                regional bank&rdquo;).
              </p>
            </form>
          ) : (
            <div className="border-t border-line pt-4">
              <p className="type-label">Vendor profile</p>
              {stripeReady ? (
                <form action={startVendorCheckoutAction} className="mt-2">
                  <input type="hidden" name="entityId" value={entityId} />
                  <input type="hidden" name="backPath" value={backPath} />
                  <p className="text-[13px] text-ink-secondary">
                    Unlock track-record stories on this profile — reviewed, client-consented, and
                    marked verified.
                  </p>
                  <Button type="submit" variant="ghost" className="mt-2">
                    Activate vendor profile
                  </Button>
                </form>
              ) : (
                <p className="mt-2 text-[13px] text-ink-secondary">Vendor profiles open soon.</p>
              )}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
