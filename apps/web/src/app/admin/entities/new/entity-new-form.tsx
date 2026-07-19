"use client";

import { useActionState } from "react";
import { createEntityAction } from "@/app/admin/actions";
import { errorClass, inputClass, labelClass } from "@/components/admin/form-styles";
import { Button } from "@/components/ui/button";
import { initialFormState } from "../../form-state";

export function EntityNewForm({ kinds }: { kinds: string[] }) {
  const [state, formAction] = useActionState(createEntityAction, initialFormState);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div>
        <label className={labelClass} htmlFor="kind">
          Kind
        </label>
        <select
          id="kind"
          name="kind"
          className={inputClass}
          defaultValue={state.values.kind ?? "organization"}
        >
          {kinds.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
        {state.errors.kind ? <p className={errorClass}>{state.errors.kind}</p> : null}
      </div>
      <div>
        <label className={labelClass} htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          className={inputClass}
          defaultValue={state.values.name ?? ""}
        />
        {state.errors.name ? <p className={errorClass}>{state.errors.name}</p> : null}
      </div>
      <div>
        <label className={labelClass} htmlFor="country">
          Country (2-letter code, optional)
        </label>
        <input
          id="country"
          name="country"
          maxLength={2}
          className={inputClass}
          defaultValue={state.values.country ?? ""}
        />
        {state.errors.country ? <p className={errorClass}>{state.errors.country}</p> : null}
      </div>
      <div>
        <label className={labelClass} htmlFor="tags">
          Tags (comma-separated, from the taxonomy)
        </label>
        <input
          id="tags"
          name="tags"
          className={inputClass}
          placeholder="bank, servicer"
          defaultValue={state.values.tags ?? ""}
        />
        {state.errors.tags ? <p className={errorClass}>{state.errors.tags}</p> : null}
      </div>
      <div>
        <label className={labelClass} htmlFor="summary">
          Summary
        </label>
        <textarea
          id="summary"
          name="summary"
          rows={3}
          className={inputClass}
          defaultValue={state.values.summary ?? ""}
        />
      </div>
      <Button type="submit">Create entity</Button>
    </form>
  );
}
