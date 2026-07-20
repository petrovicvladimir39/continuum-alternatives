"use client";

import { useActionState } from "react";
import { extractNowAction } from "@/app/admin/actions";
import { errorClass } from "@/components/admin/form-styles";
import { Button } from "@/components/ui/button";
import { initialFormState } from "../../form-state";

export function ExtractNow({ documentId }: { documentId: string }) {
  const [state, formAction] = useActionState(extractNowAction, initialFormState);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="documentId" value={documentId} />
      <Button type="submit">Extract now</Button>
      {state.values.message ? (
        <span className="text-[13px] text-ink-secondary">{state.values.message}</span>
      ) : null}
      {state.errors.form ? <span className={errorClass}>{state.errors.form}</span> : null}
    </form>
  );
}
