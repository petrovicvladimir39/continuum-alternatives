"use client";

import { useActionState } from "react";
import { approveAndSendDigestAction, sendDigestAgainAction } from "@/app/admin/actions";
import { errorClass } from "@/components/admin/form-styles";
import { Button } from "@/components/ui/button";
import { initialFormState } from "../../form-state";

export function ApproveAndSend({ digestId }: { digestId: string }) {
  const [state, formAction] = useActionState(approveAndSendDigestAction, initialFormState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="digestId" value={digestId} />
      <label className="flex items-center gap-1.5 text-[13px]">
        <input type="checkbox" name="confirm" required />
        Confirm approval and delivery
      </label>
      <Button type="submit">Approve &amp; send</Button>
      {state.values.message ? (
        <span className="text-[13px] text-ink-secondary">{state.values.message}</span>
      ) : null}
      {state.errors.form ? <span className={errorClass}>{state.errors.form}</span> : null}
    </form>
  );
}

export function SendAgain({ digestId }: { digestId: string }) {
  const [state, formAction] = useActionState(sendDigestAgainAction, initialFormState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="digestId" value={digestId} />
      <Button type="submit" variant="ghost">
        Send again
      </Button>
      {state.values.message ? (
        <span className="text-[13px] text-ink-secondary">{state.values.message}</span>
      ) : null}
      {state.errors.form ? <span className={errorClass}>{state.errors.form}</span> : null}
    </form>
  );
}
