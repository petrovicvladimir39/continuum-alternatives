"use server";

import { CHANNELS } from "@continuum/shared";
import { subscribeContact } from "@continuum/db";
import { sendConfirmationEmail } from "@continuum/pipeline";

/**
 * Public subscription submit (Phase 23A). Consent is explicit and stored at
 * submit (consent_source 'site'); activation only via the double-opt-in
 * link. Without Resend the contact stays pending and the UI says so
 * honestly — `pnpm contacts:send-confirmations` backfills later.
 */

export type SubscribeState = {
  status: "idle" | "error" | "pending_sent" | "pending_unmailed" | "active";
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function subscribeAction(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const channels = formData
    .getAll("channels")
    .map(String)
    .filter((c) => (CHANNELS as readonly string[]).includes(c));
  const consent = formData.get("consent") === "on";

  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }
  if (channels.length === 0) {
    return { status: "error", message: "Pick at least one channel." };
  }
  if (!consent) {
    return { status: "error", message: "Consent is required — we only send what you opt into." };
  }

  const outcome = await subscribeContact(email, channels);
  if (outcome.state === "active") {
    return {
      status: "active",
      message: "You are already confirmed — channel preferences updated.",
    };
  }

  const sendResult = await sendConfirmationEmail(email, outcome.token);
  if (sendResult === "sent") {
    return {
      status: "pending_sent",
      message: "Check your inbox — one click confirms the subscription.",
    };
  }
  return {
    status: "pending_unmailed",
    message:
      "Signed up. Your confirmation email will arrive when our mail system completes verification — nothing is sent to you until you confirm.",
  };
}
