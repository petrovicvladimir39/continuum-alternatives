import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { canExport } from "@continuum/shared";
import {
  getMemberByClerkId,
  listApiKeys,
  listWebhooks,
  resolveMemberTier,
  upsertMemberProfile,
  WEBHOOK_EVENTS,
} from "@continuum/db";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/admin/form-styles";
import {
  createWebhookAction,
  deleteWebhookAction,
  issueKeyAction,
  revokeKeyAction,
} from "@/lib/platform-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "API & webhooks",
  robots: { index: false, follow: false },
};

/**
 * /account/api (Phase 33C/E) — founding members issue/revoke API keys
 * (raw key shown ONCE) and manage webhooks. Free members see the honest
 * gate, not a teaser wall.
 */
export default async function AccountApiPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; secret?: string; webhook?: string }>;
}) {
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
  const params = await searchParams;
  const founding = canExport(await resolveMemberTier(member.id));

  if (!founding) {
    return (
      <div className="max-w-xl py-12">
        <h1 className="type-h1">API &amp; webhooks</h1>
        <p className="mt-3 text-[14px] text-ink-secondary">
          API keys, the MCP endpoint, and webhooks are founding-member features.{" "}
          <Link href="/pricing" className="text-accent hover:underline">
            About membership →
          </Link>
        </p>
      </div>
    );
  }

  const [keys, webhooks] = await Promise.all([listApiKeys(member.id), listWebhooks(member.id)]);

  return (
    <div className="max-w-2xl py-12">
      <h1 className="type-h1">API &amp; webhooks</h1>
      <p className="mt-2 text-[13px] text-ink-secondary">
        Read-only API v1 + MCP for agents ·{" "}
        <Link href="/docs/api" className="text-accent hover:underline">
          API docs
        </Link>
        {" · "}
        <Link href="/docs/mcp" className="text-accent hover:underline">
          MCP docs
        </Link>
      </p>

      {params.created !== undefined ? (
        <div className="mt-4 border border-line-strong p-3">
          <p className="text-[13px] font-medium text-ink">Your new API key — copy it NOW:</p>
          <p className="type-data mt-1 break-all text-[13px]">{params.created}</p>
          <p className="type-small mt-1 text-ink-muted">
            Shown once; we store only a hash. Lose it → revoke and issue a new one.
          </p>
        </div>
      ) : null}

      <h2 className="type-h2 mt-8">API keys</h2>
      {keys.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-muted">No keys yet.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {keys.map((key) => (
            <li key={key.id} className="flex flex-wrap items-baseline gap-3 text-[13px]">
              <span className="font-medium">{key.name}</span>
              <span className="type-small text-ink-muted">
                created {key.createdAt?.toISOString().slice(0, 10) ?? "—"}
                {key.lastUsedAt !== null
                  ? ` · last used ${key.lastUsedAt.toISOString().slice(0, 10)}`
                  : " · never used"}
                {key.revokedAt !== null ? " · REVOKED" : ""}
              </span>
              {key.revokedAt === null ? (
                <form action={revokeKeyAction}>
                  <input type="hidden" name="keyId" value={key.id} />
                  <button type="submit" className="text-[11px] text-ink-muted hover:text-distressed">
                    revoke
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <form action={issueKeyAction} className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label className={labelClass} htmlFor="key-name">
            Key name
          </label>
          <input id="key-name" name="name" maxLength={60} placeholder="e.g. research-agent" className={inputClass} />
        </div>
        <Button type="submit" variant="ghost">
          Issue key
        </Button>
        <p className="type-small w-full text-ink-muted">60 requests/minute per key · read-only.</p>
      </form>

      <h2 className="type-h2 mt-10">Webhooks</h2>
      <p className="type-small mt-1 text-ink-muted">
        Signed JSON POSTs when your watchlist surfaces new public record items. 10 consecutive
        failures deactivates a hook (you&apos;ll see it in What changed).
      </p>
      {params.secret !== undefined ? (
        <div className="mt-3 border border-line-strong p-3">
          <p className="text-[13px] font-medium text-ink">Webhook signing secret — copy it NOW:</p>
          <p className="type-data mt-1 break-all text-[13px]">{params.secret}</p>
          <p className="type-small mt-1 text-ink-muted">
            Verify: X-Continuum-Signature = t=&lt;unix&gt;,v1=HMAC_SHA256(secret, t + &quot;.&quot; + body).
          </p>
        </div>
      ) : null}
      {params.webhook !== undefined ? (
        <p className="mt-2 text-[12px] text-distressed">{params.webhook}</p>
      ) : null}
      {webhooks.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {webhooks.map((hook) => (
            <li key={hook.id} className="flex flex-wrap items-baseline gap-3 text-[13px]">
              <span className="type-data break-all">{hook.url}</span>
              <span className="type-small text-ink-muted">
                {hook.events.join(", ")}
                {hook.active ? "" : " · DEACTIVATED"}
                {hook.failureCount > 0 ? ` · ${hook.failureCount} recent failure(s)` : ""}
              </span>
              <form action={deleteWebhookAction}>
                <input type="hidden" name="webhookId" value={hook.id} />
                <button type="submit" className="text-[11px] text-ink-muted hover:text-distressed">
                  delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      <form action={createWebhookAction} className="mt-3 max-w-lg">
        <label className={labelClass} htmlFor="webhook-url">
          Endpoint URL (https only)
        </label>
        <input id="webhook-url" name="url" placeholder="https://your-app.example/hooks/continuum" className={inputClass} />
        <div className="mt-2 flex flex-wrap gap-4">
          {WEBHOOK_EVENTS.map((event) => (
            <label key={event} className="flex items-baseline gap-1.5 text-[12px]">
              <input type="checkbox" name="events" value={event} defaultChecked className="translate-y-[1px]" />
              {event}
            </label>
          ))}
        </div>
        <Button type="submit" variant="ghost" className="mt-2">
          Add webhook
        </Button>
      </form>
    </div>
  );
}
