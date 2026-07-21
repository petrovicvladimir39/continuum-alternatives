"use client";

import { useActionState } from "react";
import { askFilingAction, type FilingChatState } from "@/app/(site)/documents/[id]/actions";
import { Button } from "@/components/ui/button";

const initialState: FilingChatState = { status: "idle" };

/** Question box (34C) — quiet; the answer appears in the cached list below. */
export function FilingChatBox({ documentId }: { documentId: string }) {
  const [state, formAction] = useActionState(askFilingAction, initialState);
  return (
    <form action={formAction} className="mt-3 flex max-w-xl flex-wrap gap-2">
      <input type="hidden" name="documentId" value={documentId} />
      <input
        name="question"
        maxLength={300}
        placeholder="e.g. What is the sale price and deadline?"
        className="min-w-[260px] flex-1 border border-line bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-line-strong"
      />
      <Button type="submit" variant="ghost">
        Ask
      </Button>
      {state.status === "notice" ? (
        <p className="w-full text-[12px] text-ink-secondary">{state.message}</p>
      ) : null}
    </form>
  );
}
