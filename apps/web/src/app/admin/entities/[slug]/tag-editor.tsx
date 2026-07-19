"use client";

import { useActionState } from "react";
import { addTagAction, removeTagAction } from "@/app/admin/actions";
import { errorClass, inputClass } from "@/components/admin/form-styles";
import { tagVariant } from "@/components/admin/tag-variant";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { initialFormState } from "../../form-state";

export function TagEditor({ slug, tags }: { slug: string; tags: string[] }) {
  const [state, formAction] = useActionState(addTagAction, initialFormState);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {tags.length === 0 ? <span className="text-[13px] text-ink-muted">No tags.</span> : null}
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1">
            <Tag variant={tagVariant(tag)}>{tag}</Tag>
            <form action={removeTagAction}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="tag" value={tag} />
              <button
                type="submit"
                className="text-[11px] text-ink-muted hover:text-distressed"
                aria-label={`Remove tag ${tag}`}
              >
                remove
              </button>
            </form>
          </span>
        ))}
      </div>
      <form action={formAction} className="mt-3 flex max-w-sm gap-2">
        <input type="hidden" name="slug" value={slug} />
        <input name="tag" className={inputClass} placeholder="Add tag from taxonomy" />
        <Button type="submit" variant="ghost">
          Add
        </Button>
      </form>
      {state.errors.tag ? <p className={errorClass}>{state.errors.tag}</p> : null}
    </div>
  );
}
