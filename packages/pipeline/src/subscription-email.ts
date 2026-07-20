import { Resend } from "resend";

/**
 * Double-opt-in confirmation email (Phase 23A). Same inline-styles register
 * as the digest email: Georgia serif heading, system sans body,
 * near-monochrome palette, hairline borders, no images, no packages.
 */

const INK = "#141311";
const INK_SECONDARY = "#5C5952";
const INK_MUTED = "#8A867C";
const LINE = "#E7E4DC";
const ACCENT = "#17456B";
const GROUND = "#FAFAF8";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const ORIGIN = "https://continuumalternatives.com";

export function buildConfirmationEmail(token: string): { subject: string; html: string } {
  const confirmUrl = `${ORIGIN}/confirm/${token}`;
  const unsubscribeUrl = `${ORIGIN}/unsubscribe/${token}`;
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:${GROUND};">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;background:${GROUND};">
    <h1 style="font-family:${SERIF};font-weight:500;font-size:24px;color:${INK};margin:0 0 4px;">Confirm your subscription</h1>
    <p style="font-family:${SANS};font-size:13px;color:${INK_SECONDARY};margin:0 0 18px;border-bottom:1px solid ${LINE};padding-bottom:14px;">Continuum Alternatives · The map of European alternative assets</p>
    <p style="font-family:${SANS};font-size:14px;line-height:1.55;color:${INK};margin:0 0 16px;">
      You asked to receive the Continuum Brief. One click confirms it — nothing is sent until you do.
    </p>
    <p style="margin:0 0 22px;">
      <a href="${confirmUrl}" style="font-family:${SANS};font-size:14px;color:${ACCENT};border:1px solid ${ACCENT};padding:9px 18px;text-decoration:none;display:inline-block;">Confirm subscription</a>
    </p>
    <p style="font-family:${SANS};font-size:12px;line-height:1.5;color:${INK_MUTED};margin:0 0 6px;">
      If the button does not work, open: <a href="${confirmUrl}" style="color:${ACCENT};">${confirmUrl}</a>
    </p>
    <p style="font-family:${SANS};font-size:12px;color:${INK_MUTED};margin:24px 0 0;border-top:1px solid ${LINE};padding-top:14px;">
      Didn't request this? Ignore this email, or <a href="${unsubscribeUrl}" style="color:${ACCENT};">unsubscribe</a> — we will never email you again.
    </p>
  </div>
</body>
</html>`;
  return { subject: "Confirm your Continuum Brief subscription", html };
}

let resendClient: Resend | null = null;

export type ConfirmationSendResult = "sent" | "no_resend" | "failed";

/**
 * Sends the double-opt-in email. Graceful without RESEND_API_KEY: returns
 * "no_resend" and the contact simply stays pending_confirmation until
 * `pnpm contacts:send-confirmations` runs with a working key.
 */
export async function sendConfirmationEmail(
  email: string,
  token: string,
): Promise<ConfirmationSendResult> {
  if (!process.env.RESEND_API_KEY) {
    return "no_resend";
  }
  resendClient ??= new Resend(process.env.RESEND_API_KEY);
  const { subject, html } = buildConfirmationEmail(token);
  try {
    const { error } = await resendClient.emails.send({
      from: "Continuum Alternatives <digest@continuumalternatives.com>",
      to: email,
      subject,
      html,
    });
    return error ? "failed" : "sent";
  } catch {
    return "failed";
  }
}
