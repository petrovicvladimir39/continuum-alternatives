"use client";

import { useActionState } from "react";
import { addContactAction } from "@/app/admin/actions";
import { errorClass, inputClass, labelClass } from "@/components/admin/form-styles";
import { Button } from "@/components/ui/button";
import { initialFormState } from "../form-state";

export function ContactForm({ channels }: { channels: string[] }) {
  const [state, formAction] = useActionState(addContactAction, initialFormState);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="contact-email">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            className={inputClass}
            defaultValue={state.values.email ?? ""}
          />
          {state.errors.email ? <p className={errorClass}>{state.errors.email}</p> : null}
        </div>
        <div>
          <label className={labelClass} htmlFor="contact-name">
            Name
          </label>
          <input
            id="contact-name"
            name="name"
            className={inputClass}
            defaultValue={state.values.name ?? ""}
          />
        </div>
      </div>
      <div>
        <span className={labelClass}>Channels</span>
        <div className="flex flex-wrap gap-3 text-[13px]">
          {channels.map((channel) => (
            <label key={channel} className="flex items-center gap-1.5">
              <input type="checkbox" name="channels" value={channel} />
              {channel}
            </label>
          ))}
        </div>
        {state.errors.channels ? <p className={errorClass}>{state.errors.channels}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit">Add contact</Button>
        {state.values.message ? (
          <span className="text-[13px] text-ink-muted">{state.values.message}</span>
        ) : null}
      </div>
    </form>
  );
}
