"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { contacts, db, eq } from "@continuum/db";
import { validateReportGate } from "@continuum/shared";
import { REPORT_ACCESS_COOKIE } from "./gate";

/**
 * Report gate: GDPR-consented lead capture. Consent is explicit (unchecked
 * checkbox), stored with consent_source 'report' + timestamp. Channels stay
 * EMPTY — a report download is not a digest subscription.
 */
export async function requestReportAccessAction(formData: FormData): Promise<void> {
  const input = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").toLowerCase(),
    role: String(formData.get("role") ?? ""),
    consent: formData.get("consent") === "on",
  };
  const back = String(formData.get("back") ?? "/reports");
  const result = validateReportGate(input);
  if (!result.ok) {
    redirect(`${back}?error=${encodeURIComponent(result.error)}`);
  }

  const existing = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.email, input.email));
  if (existing.length === 0) {
    await db.insert(contacts).values({
      email: input.email,
      name: input.name.trim(),
      role: input.role.trim(),
      channels: [],
      consentSource: "report",
      consentedAt: new Date(),
    });
  }

  const cookieStore = await cookies();
  cookieStore.set(REPORT_ACCESS_COOKIE, "1", {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  // ?unlocked=1 lets the report page fire the report_unlocked event once.
  redirect(`${back}${back.includes("?") ? "&" : "?"}unlocked=1`);
}
