"use client";

import { useActionState } from "react";
import { fetchNowAction } from "@/app/admin/actions";
import { errorClass } from "@/components/admin/form-styles";
import { Button } from "@/components/ui/button";
import { initialFormState } from "../../form-state";

export function FetchNow({ sourceId }: { sourceId: string }) {
  const [state, formAction] = useActionState(fetchNowAction, initialFormState);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="sourceId" value={sourceId} />
      <Button type="submit" variant="ghost">
        Fetch now
      </Button>
      {state.values.message ? (
        <span className="text-[13px] text-ink-secondary">{state.values.message}</span>
      ) : null}
      {state.errors.form ? <span className={errorClass}>{state.errors.form}</span> : null}
    </form>
  );
}
