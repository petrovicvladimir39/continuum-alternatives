"use client";

import { useActionState } from "react";
import { generateDigestAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { initialFormState } from "../form-state";

export function GenerateDigestButton() {
  const [state, formAction] = useActionState(generateDigestAction, initialFormState);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <Button type="submit">Generate draft for today</Button>
      {state.values.message ? (
        <span className="text-[13px] text-ink-secondary">{state.values.message}</span>
      ) : null}
    </form>
  );
}
