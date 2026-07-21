import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { assetClassBySlug, compsRenderable, COMPS_MIN_DEALS } from "@continuum/shared";
import { compsByClass, getMemberByClerkId, resolveMemberTier, upsertMemberProfile } from "@continuum/db";
import { DataTable, numericCell } from "@/components/ui/data-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deal comps",
  robots: { index: false, follow: false },
};

const EUR = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 });

/**
 * /tools/comps (Phase 34B) — deterministic value ranges from OUR OWN deal
 * records with parsed amounts, per taxonomy class. COVERAGE-GATED at
 * COMPS_MIN_DEALS: below the gate a class shows in the Building note with
 * its real count — never a range built on anecdotes. The engine and its
 * tests ship complete; the tables appear as the record earns them.
 */
export default async function CompsPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    notFound();
  }
  const user = await currentUser();
  if (user === null) {
    notFound();
  }
  let member = await getMemberByClerkId(user.id);
  if (member === null) {
    member = await upsertMemberProfile({
      clerkUserId: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      displayName: user.firstName ?? null,
    });
  }
  if ((await resolveMemberTier(member.id)) !== "founding") {
    return (
      <div className="max-w-xl py-12">
        <h1 className="type-h1">Deal comps</h1>
        <p className="mt-3 text-[14px] text-ink-secondary">
          Analyst tools are a founding-member feature.{" "}
          <Link href="/pricing" className="text-accent hover:underline">
            About membership →
          </Link>
        </p>
      </div>
    );
  }

  const rows = await compsByClass();
  const renderable = rows.filter((row) => compsRenderable(row.dealCount));
  const building = rows.filter((row) => !compsRenderable(row.dealCount));

  return (
    <div className="py-10">
      <h1 className="type-h1">Deal comps</h1>
      <p className="mt-2 max-w-2xl text-[14px] leading-[1.6] text-ink-secondary">
        Value ranges computed from deals on the Continuum record with parsed amounts — our own
        data, stated plainly. A class renders only at {COMPS_MIN_DEALS}+ comparable deals.
      </p>

      {renderable.length === 0 ? (
        <div className="mt-6 max-w-2xl border border-line p-4">
          <h2 className="type-label">Building</h2>
          <p className="mt-2 text-[13px] leading-[1.6] text-ink-secondary">
            No asset class has reached {COMPS_MIN_DEALS} deals with parsed amounts yet — the
            honest current state:
          </p>
          <ul className="mt-2 space-y-1 text-[13px] text-ink-secondary">
            {building.length === 0 ? (
              <li className="text-ink-muted">No deals with parsed amounts on the record yet.</li>
            ) : (
              building.map((row) => (
                <li key={row.assetClass} className="tabular-nums">
                  {assetClassBySlug(row.assetClass)?.label ?? row.assetClass}:{" "}
                  <span className="type-data">{row.dealCount}</span> of {COMPS_MIN_DEALS} needed
                </li>
              ))
            )}
          </ul>
          <p className="type-small mt-3 text-ink-muted">
            Ranges appear automatically as deal coverage grows — nothing to configure.
          </p>
        </div>
      ) : (
        <>
          <DataTable className="mt-6 max-w-3xl">
            <thead>
              <tr>
                <th>Asset class</th>
                <th className={numericCell}>Deals</th>
                <th className={numericCell}>Min</th>
                <th className={numericCell}>Median</th>
                <th className={numericCell}>Max</th>
              </tr>
            </thead>
            <tbody>
              {renderable.map((row) => (
                <tr key={row.assetClass}>
                  <td>{assetClassBySlug(row.assetClass)?.label ?? row.assetClass}</td>
                  <td className={numericCell}>{row.dealCount}</td>
                  <td className={numericCell}>{EUR.format(row.minAmount)}</td>
                  <td className={numericCell}>{EUR.format(row.medianAmount)}</td>
                  <td className={numericCell}>{EUR.format(row.maxAmount)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {building.length > 0 ? (
            <p className="type-small mt-3 text-ink-muted">
              Building:{" "}
              {building
                .map((row) => `${assetClassBySlug(row.assetClass)?.label ?? row.assetClass} (${row.dealCount}/${COMPS_MIN_DEALS})`)
                .join(" · ")}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
