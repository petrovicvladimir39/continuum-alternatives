import type { Metadata } from "next";
import { MOCK_MEMBERS, mockAvatar } from "@continuum/shared";

export const metadata: Metadata = { title: "Members — Network" };

/** Member directory — generated avatars (never real people). */
export default function MembersPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8">
      <div className="type-label">Network</div>
      <h1 className="type-display mt-2">Members</h1>
      <p className="type-small mt-2 max-w-[560px] text-ink-secondary">
        {MOCK_MEMBERS.length} members in the prototype set. Profiles, claims and verification flow
        in from the production membership system at cutover.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_MEMBERS.map((m) => (
          <div key={m.id} className="flex items-center gap-3 bg-surface p-3 transition-colors hover:bg-muted/50">
            <img src={mockAvatar(m.avatarSeed)} alt="" width={40} height={40} className="h-10 w-10 border border-line" />
            <div className="min-w-0">
              <div className="type-body truncate">{m.name}</div>
              <div className="type-small truncate text-ink-secondary">
                {m.roleTitle} · {m.organization}
              </div>
            </div>
            <span className="type-mono ml-auto shrink-0 text-ink-muted">{m.country}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
