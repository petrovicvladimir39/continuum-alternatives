"use client";

import { useActionState } from "react";
import { updateEntityAction } from "@/app/admin/actions";
import { errorClass, inputClass, labelClass } from "@/components/admin/form-styles";
import { Button } from "@/components/ui/button";
import { initialFormState } from "../../form-state";
import type { DetailFieldDef } from "../detail-fields";

export function EntityEditForm({
  slug,
  initial,
  detailFields,
  detailInitial,
}: {
  slug: string;
  initial: { name: string; country: string; summary: string };
  detailFields: DetailFieldDef[];
  detailInitial: Record<string, string>;
}) {
  const [state, formAction] = useActionState(updateEntityAction, initialFormState);
  const value = (key: string, fallback: string) => state.values[key] ?? fallback;

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <label className={labelClass} htmlFor="edit-name">
          Name
        </label>
        <input
          id="edit-name"
          name="name"
          className={inputClass}
          defaultValue={value("name", initial.name)}
        />
        {state.errors.name ? <p className={errorClass}>{state.errors.name}</p> : null}
      </div>
      <div>
        <label className={labelClass} htmlFor="edit-country">
          Country
        </label>
        <input
          id="edit-country"
          name="country"
          maxLength={2}
          className={inputClass}
          defaultValue={value("country", initial.country)}
        />
        {state.errors.country ? <p className={errorClass}>{state.errors.country}</p> : null}
      </div>
      <div>
        <label className={labelClass} htmlFor="edit-summary">
          Summary
        </label>
        <textarea
          id="edit-summary"
          name="summary"
          rows={3}
          className={inputClass}
          defaultValue={value("summary", initial.summary)}
        />
      </div>
      {detailFields.map((field) => {
        const fieldName = `detail_${field.key}`;
        const fallback = detailInitial[field.key] ?? "";
        return (
          <div key={field.key}>
            <label className={labelClass} htmlFor={fieldName}>
              {field.label}
              {field.hint ? ` (${field.hint})` : ""}
            </label>
            {field.input === "select" ? (
              <select
                id={fieldName}
                name={fieldName}
                className={inputClass}
                defaultValue={value(
                  fieldName,
                  fallback === "" ? (field.options?.[0] ?? "") : fallback,
                )}
              >
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={fieldName}
                name={fieldName}
                className={inputClass}
                type={
                  field.input === "int"
                    ? "number"
                    : field.input === "date"
                      ? "date"
                      : field.input === "datetime"
                        ? "datetime-local"
                        : "text"
                }
                defaultValue={value(fieldName, fallback)}
              />
            )}
            {state.errors[fieldName] ? (
              <p className={errorClass}>{state.errors[fieldName]}</p>
            ) : null}
          </div>
        );
      })}
      <div className="flex items-center gap-3">
        <Button type="submit">Save changes</Button>
        {state.values.saved === "1" && Object.keys(state.errors).length === 0 ? (
          <span className="text-[13px] text-ink-muted">Saved.</span>
        ) : null}
      </div>
    </form>
  );
}
