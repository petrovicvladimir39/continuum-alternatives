"use client";

import { useActionState } from "react";
import { createSourceAction, updateSourceAction } from "@/app/admin/actions";
import { errorClass, inputClass, labelClass } from "@/components/admin/form-styles";
import { Button } from "@/components/ui/button";
import { initialFormState } from "../form-state";

const SCHEDULES = ["hourly", "daily", "weekly"];

export function SourceForm({
  mode,
  sourceTypes,
  sourceId,
  initial,
}: {
  mode: "create" | "edit";
  sourceTypes: string[];
  sourceId?: string;
  initial?: {
    name: string;
    url: string;
    country: string;
    sourceType: string;
    schedule: string;
    active: boolean;
  };
}) {
  const [state, formAction] = useActionState(
    mode === "create" ? createSourceAction : updateSourceAction,
    initialFormState,
  );
  const value = (key: string, fallback: string) => state.values[key] ?? fallback;

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {sourceId !== undefined ? <input type="hidden" name="sourceId" value={sourceId} /> : null}
      <div>
        <label className={labelClass} htmlFor="source-name">
          Name
        </label>
        <input
          id="source-name"
          name="name"
          className={inputClass}
          defaultValue={value("name", initial?.name ?? "")}
        />
        {state.errors.name ? <p className={errorClass}>{state.errors.name}</p> : null}
      </div>
      <div>
        <label className={labelClass} htmlFor="source-url">
          URL
        </label>
        <input
          id="source-url"
          name="url"
          className={inputClass}
          placeholder="https://…"
          defaultValue={value("url", initial?.url ?? "")}
        />
        {state.errors.url ? <p className={errorClass}>{state.errors.url}</p> : null}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass} htmlFor="source-country">
            Country
          </label>
          <input
            id="source-country"
            name="country"
            maxLength={2}
            className={inputClass}
            defaultValue={value("country", initial?.country ?? "")}
          />
          {state.errors.country ? <p className={errorClass}>{state.errors.country}</p> : null}
        </div>
        <div>
          <label className={labelClass} htmlFor="source-type">
            Type
          </label>
          <select
            id="source-type"
            name="sourceType"
            className={inputClass}
            defaultValue={value("sourceType", initial?.sourceType ?? "press")}
          >
            {sourceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {state.errors.sourceType ? <p className={errorClass}>{state.errors.sourceType}</p> : null}
        </div>
        <div>
          <label className={labelClass} htmlFor="source-schedule">
            Schedule
          </label>
          <select
            id="source-schedule"
            name="schedule"
            className={inputClass}
            defaultValue={value("schedule", initial?.schedule ?? "daily")}
          >
            {SCHEDULES.map((schedule) => (
              <option key={schedule} value={schedule}>
                {schedule}
              </option>
            ))}
          </select>
          {state.errors.schedule ? <p className={errorClass}>{state.errors.schedule}</p> : null}
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="source-fetch-method">
          Fetch method
        </label>
        <select
          id="source-fetch-method"
          name="fetchMethod"
          className={inputClass}
          defaultValue="http_simple"
        >
          <option value="http_simple">http_simple</option>
        </select>
      </div>
      <label className="flex items-center gap-1.5 text-[13px]">
        <input
          type="checkbox"
          name="active"
          defaultChecked={
            state.values.active !== undefined
              ? state.values.active === "on"
              : (initial?.active ?? true)
          }
        />
        Active
      </label>
      {state.errors.form ? <p className={errorClass}>{state.errors.form}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit">{mode === "create" ? "Create source" : "Save changes"}</Button>
        {state.values.saved === "1" ? (
          <span className="text-[13px] text-ink-muted">Saved.</span>
        ) : null}
      </div>
    </form>
  );
}
