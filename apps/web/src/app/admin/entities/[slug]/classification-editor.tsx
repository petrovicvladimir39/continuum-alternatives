import { ALT_TAXONOMY, CLASS_LEVEL, classifiedLabel } from "@continuum/shared";
import { listClassificationsForEntity } from "@continuum/db";
import {
  addEntityClassificationAction,
  removeEntityClassificationAction,
} from "@/app/admin/actions";
import { inputClass, labelClass } from "@/components/admin/form-styles";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";

/**
 * Operator classification editor (Phase 26D) — add/remove taxonomy rows on
 * one entity. Operator rows are approved at source (the operator IS the
 * review authority).
 */
export async function ClassificationEditor({
  entityId,
  slug,
}: {
  entityId: string;
  slug: string;
}) {
  const classifications = await listClassificationsForEntity(entityId);

  return (
    <section className="mt-8 border-t border-line pt-5">
      <h2 className="type-label mb-3">Taxonomy classifications</h2>
      {classifications.length > 0 ? (
        <ul className="mb-3 space-y-1.5">
          {classifications.map((c) => (
            <li key={`${c.assetClass}:${c.strategy}`} className="flex items-center gap-2 text-[13px]">
              <Tag variant="neutral">{classifiedLabel(c.assetClass, c.strategy)}</Tag>
              <span className="type-data text-ink-muted">
                {c.source} · {c.status}
              </span>
              <form action={removeEntityClassificationAction}>
                <input type="hidden" name="entityId" value={entityId} />
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="assetClass" value={c.assetClass} />
                <input type="hidden" name="strategy" value={c.strategy} />
                <button type="submit" className="text-[11px] text-ink-muted hover:text-distressed">
                  remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-[13px] text-ink-muted">No classifications yet.</p>
      )}
      <form action={addEntityClassificationAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="entityId" value={entityId} />
        <input type="hidden" name="slug" value={slug} />
        <div>
          <label className={labelClass} htmlFor="cls-strategy">
            Add classification
          </label>
          <select id="cls-strategy" name="pair" className={inputClass} defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {ALT_TAXONOMY.map((assetClass) => (
              <optgroup key={assetClass.slug} label={assetClass.label}>
                <option value={`${assetClass.slug}:${CLASS_LEVEL}`}>
                  {assetClass.label} (class-level)
                </option>
                {assetClass.strategies.map((s) => (
                  <option key={s.slug} value={`${assetClass.slug}:${s.slug}`}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <Button type="submit" variant="ghost">
          Add
        </Button>
      </form>
    </section>
  );
}
