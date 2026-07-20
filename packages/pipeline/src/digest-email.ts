import type { DigestSection } from "./digest";

/**
 * Hand-built single-column HTML email, inline styles only, mirroring the
 * styleguide: Georgia serif headings (the email-safe stand-in for Newsreader),
 * system sans body (Instrument Sans is not email-safe), near-monochrome
 * palette, hairline borders, no images. No template packages.
 */

const INK = "#141311";
const INK_SECONDARY = "#5C5952";
const INK_MUTED = "#8A867C";
const LINE = "#E7E4DC";
const ACCENT = "#17456B";
const GROUND = "#FAFAF8";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const CHANNEL_LABELS: Record<string, string> = {
  distressed: "Distressed",
  private_credit: "Private Credit",
  vc_founders: "VC & Founders",
  pe: "Private Equity",
  lp_institutional: "LPs & Institutions",
  vendors: "Vendors & Mandates",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildDigestEmail(
  digest: { digestDate: string; subject: string; sections: DigestSection[] },
  subscriberChannels: string[],
  unsubscribeToken?: string,
): { subject: string; html: string } {
  const archiveUrl = `https://continuumalternatives.com/digest/${digest.digestDate}`;
  const sections = digest.sections.filter((section) =>
    subscriberChannels.includes(section.channel),
  );

  const sectionHtml = sections
    .map(
      (section) => `
      <h2 style="font-family:${SERIF};font-weight:500;font-size:20px;color:${INK};margin:28px 0 4px;border-bottom:1px solid ${LINE};padding-bottom:6px;">${escapeHtml(CHANNEL_LABELS[section.channel] ?? section.channel)}</h2>
      ${section.items
        .map(
          (item) => `
        <p style="font-family:${SANS};font-size:14px;line-height:1.5;color:${INK};margin:12px 0 2px;">
          <a href="${archiveUrl}#item-${item.factId}" style="color:${ACCENT};text-decoration:none;">${escapeHtml(item.title)}</a>
        </p>
        <p style="font-family:${SANS};font-size:12px;line-height:1.4;color:${INK_MUTED};margin:0 0 10px;">
          ${escapeHtml(item.entityName)} · ${escapeHtml(item.occurredOn)}${item.sourceName ? ` · ${escapeHtml(item.sourceName)}` : ""}
        </p>`,
        )
        .join("")}`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:${GROUND};">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;background:${GROUND};">
    <h1 style="font-family:${SERIF};font-weight:500;font-size:26px;color:${INK};margin:0 0 4px;">Continuum Brief</h1>
    <p style="font-family:${SANS};font-size:13px;color:${INK_SECONDARY};margin:0 0 8px;border-bottom:1px solid ${LINE};padding-bottom:14px;">${escapeHtml(digest.subject)} · The map of European alternative assets</p>
    ${sectionHtml}
    <p style="font-family:${SANS};font-size:12px;color:${INK_MUTED};margin:32px 0 0;border-top:1px solid ${LINE};padding-top:14px;">
      Read online: <a href="${archiveUrl}" style="color:${ACCENT};">${archiveUrl}</a><br/>
      ${
        unsubscribeToken
          ? `<a href="https://continuumalternatives.com/unsubscribe/${unsubscribeToken}" style="color:${ACCENT};">Unsubscribe</a> — one click, immediate.`
          : `To unsubscribe, reply to this email or write to <a href="mailto:hello@continuumalternatives.com" style="color:${ACCENT};">hello@continuumalternatives.com</a>.`
      }
    </p>
  </div>
</body>
</html>`;
  return { subject: digest.subject, html };
}
