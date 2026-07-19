"use client";

import { useActionState } from "react";
import { addEdgeAction } from "@/app/admin/actions";
import { EntityPicker } from "@/components/admin/entity-picker";
import { errorClass, inputClass, labelClass } from "@/components/admin/form-styles";
import { Button } from "@/components/ui/button";
import { initialFormState } from "../../form-state";

export function EdgeForm({ slug, edgeTypes }: { slug: string; edgeTypes: string[] }) {
  const [state, formAction] = useActionState(addEdgeAction, initialFormState);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <label className={labelClass} htmlFor="edge-type">
          Edge type
        </label>
        <select
          id="edge-type"
          name="type"
          className={inputClass}
          defaultValue={state.values.type ?? "invested_in"}
        >
          {edgeTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {state.errors.type ? <p className={errorClass}>{state.errors.type}</p> : null}
      </div>
      <div>
        <span className={labelClass}>Direction</span>
        <div className="flex gap-4 text-[13px]">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="direction"
              value="out"
              defaultChecked={(state.values.direction ?? "out") === "out"}
            />
            this entity is source
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="direction"
              value="in"
              defaultChecked={state.values.direction === "in"}
            />
            this entity is target
          </label>
        </div>
        {state.errors.direction ? <p className={errorClass}>{state.errors.direction}</p> : null}
      </div>
      <EntityPicker
        label="Counterpart"
        name="counterpart"
        {...(state.errors.counterpart !== undefined ? { error: state.errors.counterpart } : {})}
      />
      <EntityPicker label="Deal (optional)" name="deal" kindFilter="deal" />
      <div>
        <label className={labelClass} htmlFor="edge-role">
          Role
        </label>
        <input
          id="edge-role"
          name="role"
          className={inputClass}
          defaultValue={state.values.role ?? ""}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass} htmlFor="edge-date">
            Date
          </label>
          <input
            id="edge-date"
            name="date"
            type="date"
            className={inputClass}
            defaultValue={state.values.date ?? ""}
          />
          {state.errors.date ? <p className={errorClass}>{state.errors.date}</p> : null}
        </div>
        <div>
          <label className={labelClass} htmlFor="edge-amount">
            Amount
          </label>
          <input
            id="edge-amount"
            name="amount"
            className={inputClass}
            defaultValue={state.values.amount ?? ""}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="edge-currency">
            Currency
          </label>
          <input
            id="edge-currency"
            name="currency"
            maxLength={3}
            className={inputClass}
            placeholder="EUR"
            defaultValue={state.values.currency ?? ""}
          />
          {state.errors.currency ? <p className={errorClass}>{state.errors.currency}</p> : null}
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="edge-status">
          Status
        </label>
        <select
          id="edge-status"
          name="status"
          className={inputClass}
          defaultValue={state.values.status ?? "approved"}
        >
          <option value="approved">approved</option>
          <option value="proposed">proposed</option>
        </select>
        {state.errors.status ? <p className={errorClass}>{state.errors.status}</p> : null}
      </div>
      {state.errors.form ? <p className={errorClass}>{state.errors.form}</p> : null}
      <Button type="submit">Add edge</Button>
    </form>
  );
}
