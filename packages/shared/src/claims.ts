/**
 * Claim helpers (Phase 33A) — pure, fixture-tested.
 *
 * Email-domain matching is deliberately conservative: exact host equality
 * after stripping www/protocol/path, or the email domain being a proper
 * suffix subdomain of the website host (mail.acme.com vs acme.com). Free
 * webmail domains never match — a gmail address proves nothing about an
 * organization. Even a match only AUTO-FILES the claim; it still lands
 * pending for the operator.
 */

const WEBMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com",
  "yahoo.com", "proton.me", "protonmail.com", "icloud.com", "gmx.com",
  "gmx.de", "web.de", "aol.com", "mail.com", "yandex.com",
]);

export function websiteHost(website: string): string | null {
  const match = /^(?:https?:\/\/)?(?:www\.)?([^/:?#]+)/i.exec(website.trim());
  if (match === null) {
    return null;
  }
  const host = match[1]!.toLowerCase();
  return host.includes(".") ? host : null;
}

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) {
    return null;
  }
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain.includes(".") ? domain : null;
}

/** True when the member's email domain evidences the org's website domain. */
export function emailMatchesWebsite(email: string, website: string | null): boolean {
  if (website === null) {
    return false;
  }
  const domain = emailDomain(email);
  const host = websiteHost(website);
  if (domain === null || host === null || WEBMAIL_DOMAINS.has(domain)) {
    return false;
  }
  return domain === host || domain.endsWith(`.${host}`) || host.endsWith(`.${domain}`);
}
