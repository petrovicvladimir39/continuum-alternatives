export const SHARED_PACKAGE = "placeholder";

export { slugify, normalizeAlias } from "./normalize";
export { ENTITY_TAGS, type EntityTag } from "./taxonomy";

/**
 * Audience channel vocabulary. Used by timeline_facts.audience_channels and
 * contacts.channels in @continuum/db; the only valid channel values platform-wide.
 */
export const CHANNELS = [
  "distressed",
  "private_credit",
  "vc_founders",
  "pe",
  "lp_institutional",
  "vendors",
] as const;

export type Channel = (typeof CHANNELS)[number];
