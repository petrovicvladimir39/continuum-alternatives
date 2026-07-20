"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CHANNELS, sanitizeArticleMarkdown, strategyBySlug, CLASS_LEVEL, assetClassBySlug } from "@continuum/shared";
import { publishOperatorArticle, requireEntityBySlug, saveOperatorArticle } from "@continuum/db";

/**
 * Writing-desk actions (Phase 27C). NO LLM anywhere in this path — the
 * operator writes; the sanitizer enforces the markdown subset; publish is
 * the operator's own state change (guards apply only to desk_compose).
 */

export async function saveDraftAction(formData: FormData): Promise<void> {
  const id = String(formData.get("articleId") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim().slice(0, 90);
  const deck = String(formData.get("deck") ?? "").trim().slice(0, 160);
  const bodyMd = sanitizeArticleMarkdown(String(formData.get("bodyMd") ?? ""));
  const classification = String(formData.get("classification") ?? "").trim();
  const channels = formData
    .getAll("channels")
    .map(String)
    .filter((c) => (CHANNELS as readonly string[]).includes(c));
  const entitySlug = String(formData.get("primaryEntitySlug") ?? "").trim();
  const sourceUrls = String(formData.get("sourceUrls") ?? "")
    .split(/\s+/)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//.test(u))
    .slice(0, 8);

  if (headline === "" || bodyMd === "") {
    return;
  }

  // The AUTHOR chooses the classification — never auto-inferred for
  // operator pieces. "class:strategy" or "class:" (class-level) or "".
  let assetClass: string | null = null;
  let strategy: string | null = null;
  if (classification.includes(":")) {
    const [classSlug, strategySlug] = classification.split(":");
    if (classSlug && assetClassBySlug(classSlug) !== null) {
      assetClass = classSlug;
      strategy =
        strategySlug && strategySlug !== CLASS_LEVEL && strategyBySlug(strategySlug) !== null
          ? strategySlug
          : null;
    }
  }

  let primaryEntityId: string | null = null;
  if (entitySlug !== "") {
    try {
      primaryEntityId = (await requireEntityBySlug(entitySlug)).id;
    } catch {
      primaryEntityId = null;
    }
  }

  const saved = await saveOperatorArticle({
    ...(id !== "" ? { id } : {}),
    headline,
    deck: deck === "" ? null : deck,
    bodyMd,
    assetClass,
    strategy,
    channels,
    primaryEntityId,
    sourceUrls,
  });
  revalidatePath("/admin/write");
  redirect(`/admin/write?id=${saved.id}&saved=1`);
}

export async function publishDraftAction(formData: FormData): Promise<void> {
  const id = String(formData.get("articleId") ?? "").trim();
  if (id === "") {
    return;
  }
  await publishOperatorArticle(id);
  revalidatePath("/admin/write");
  revalidatePath("/news");
  revalidatePath("/");
  redirect("/admin/write?published=1");
}
