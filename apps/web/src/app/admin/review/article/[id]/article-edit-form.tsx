"use client";

import { useActionState } from "react";
import { updateArticleAction } from "@/app/admin/actions";
import { errorClass, inputClass, labelClass } from "@/components/admin/form-styles";
import { Button } from "@/components/ui/button";
import { initialFormState } from "../../../form-state";

export function ArticleEditForm({
  articleId,
  editable,
  initial,
}: {
  articleId: string;
  editable: boolean;
  initial: { headline: string; deck: string; bodyMd: string };
}) {
  const [state, formAction] = useActionState(updateArticleAction, initialFormState);
  const value = (key: string, fallback: string) => state.values[key] ?? fallback;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="articleId" value={articleId} />
      <div>
        <label className={labelClass} htmlFor="article-headline">
          Headline (≤90)
        </label>
        <input
          id="article-headline"
          name="headline"
          maxLength={90}
          className={`${inputClass} font-serif text-[18px]`}
          defaultValue={value("headline", initial.headline)}
          disabled={!editable}
        />
        {state.errors.headline ? <p className={errorClass}>{state.errors.headline}</p> : null}
      </div>
      <div>
        <label className={labelClass} htmlFor="article-deck">
          Deck (≤160)
        </label>
        <input
          id="article-deck"
          name="deck"
          maxLength={160}
          className={inputClass}
          defaultValue={value("deck", initial.deck)}
          disabled={!editable}
        />
        {state.errors.deck ? <p className={errorClass}>{state.errors.deck}</p> : null}
      </div>
      <div>
        <label className={labelClass} htmlFor="article-body">
          Body (markdown paragraphs)
        </label>
        <textarea
          id="article-body"
          name="bodyMd"
          rows={14}
          className={inputClass}
          defaultValue={value("bodyMd", initial.bodyMd)}
          disabled={!editable}
        />
        {state.errors.bodyMd ? <p className={errorClass}>{state.errors.bodyMd}</p> : null}
      </div>
      {editable ? (
        <div className="flex items-center gap-3">
          <Button type="submit" variant="ghost">
            Save edits
          </Button>
          {state.values.saved === "1" ? (
            <span className="text-[13px] text-equity">Saved.</span>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
