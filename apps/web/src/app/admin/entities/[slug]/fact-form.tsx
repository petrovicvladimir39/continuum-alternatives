"use client";

import { useActionState } from "react";
import { addFactAction } from "@/app/admin/actions";
import { errorClass, inputClass, labelClass } from "@/components/admin/form-styles";
import { Button } from "@/components/ui/button";
import { initialFormState } from "../../form-state";

export function FactForm({ slug, channels }: { slug: string; channels: string[] }) {
  const [state, formAction] = useActionState(addFactAction, initialFormState);
  const checkedChannels = (state.values.channels ?? "").split(",");

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="fact-type">
            Fact type
          </label>
          <input
            id="fact-type"
            name="factType"
            className={inputClass}
            placeholder="deal_announced"
            defaultValue={state.values.factType ?? ""}
          />
          {state.errors.factType ? <p className={errorClass}>{state.errors.factType}</p> : null}
        </div>
        <div>
          <label className={labelClass} htmlFor="fact-date">
            Date
          </label>
          <input
            id="fact-date"
            name="date"
            type="date"
            className={inputClass}
            defaultValue={state.values.date ?? ""}
          />
          {state.errors.date ? <p className={errorClass}>{state.errors.date}</p> : null}
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="fact-title">
          Title
        </label>
        <input
          id="fact-title"
          name="title"
          className={inputClass}
          defaultValue={state.values.title ?? ""}
        />
        {state.errors.title ? <p className={errorClass}>{state.errors.title}</p> : null}
      </div>
      <div>
        <label className={labelClass} htmlFor="fact-body">
          Body
        </label>
        <textarea
          id="fact-body"
          name="body"
          rows={3}
          className={inputClass}
          defaultValue={state.values.body ?? ""}
        />
      </div>
      <div>
        <span className={labelClass}>Channels</span>
        <div className="flex flex-wrap gap-4 text-[13px]">
          {channels.map((channel) => (
            <label key={channel} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                name="channels"
                value={channel}
                defaultChecked={checkedChannels.includes(channel)}
              />
              {channel}
            </label>
          ))}
        </div>
        {state.errors.channels ? <p className={errorClass}>{state.errors.channels}</p> : null}
      </div>
      <Button type="submit">Add fact</Button>
    </form>
  );
}
