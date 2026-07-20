export const SHARED_PACKAGE = "placeholder";

export {
  slugify,
  normalizeAlias,
  companyNameCore,
  transliterateDisplay,
  hasCyrillic,
  monogramFor,
} from "./normalize";
export { ENTITY_TAGS, type EntityTag } from "./taxonomy";
export {
  EUROPE_COUNTRIES,
  EUROPE_COUNTRY_NAMES,
  EUROPE_MAP_BOUNDS,
  isEuropeCountry,
} from "./countries";
export {
  canAccessAccount,
  canAccessAdmin,
  resolveAccessRole,
  type AccessRole,
} from "./auth";
export { parseRegionalAmount, parseRegionalDate } from "./parse";
export { stripBaseLabels, isCountryLabelLayer, type MapStyleLike } from "./map-style";
export { NAV_TREE, navLeaves, type NavLeaf, type NavNode } from "./nav";
export {
  parseAsk,
  removeChipFromQuery,
  normalizeAskToken,
  type AskFilters,
  type AskMatch,
  type AskGrounder,
} from "./ask";
export { VERTICALS, verticalBySlug, type Vertical, type VerticalModule } from "./verticals";
export {
  CLASS_ACCENTS,
  IMPORTANT_FACT_TYPES,
  capViewHits,
  routeAlert,
  canTransitionArticle,
  contrastRatio,
  inferArticleClassification,
  sanitizeArticleMarkdown,
  shouldGuardArticle,
} from "./editorial";
export {
  ALT_TAXONOMY,
  CLASS_LEVEL,
  KEYWORD_RULES,
  TAG_TAXONOMY_MAP,
  assetClassBySlug,
  classifiedLabel,
  frontHrefFor,
  mapLegacyFundStrategy,
  meetsCoverageThreshold,
  strategyBySlug,
  type AssetClassDef,
  type KeywordRule,
  type StrategyDef,
} from "./alt-taxonomy";
export {
  buildIcsCalendar,
  exclusiveEnd,
  parseIcsCalendar,
  type IcsEvent,
  type ParsedIcs,
} from "./ical";
export {
  isPostingBanned,
  POST_MAX_CHARS,
  POST_MAX_LINKS,
  POST_MIN_CHARS,
  POSTS_PER_MEMBER_PER_DAY,
  validatePostBody,
  type PostValidation,
} from "./community";
export {
  BRIEF_GLOBAL_DAILY_BUDGET_USD,
  BRIEF_MEMBER_MONTHLY_CAP,
  ENTITLEMENTS,
  EXPORTS_PER_DAY,
  FOUNDING_ACTIVE_STATUSES,
  FOUNDING_CAP_DEFAULT,
  canAddWatch,
  canEnableViewAlert,
  canExport,
  canGenerateBrief,
  canUseFrequency,
  checkoutOpen,
  foundingSeatsLeft,
  subscriptionSyncFromEvent,
  tierFromSubscription,
  type Entitlements,
  type MemberTier,
  type SubscriptionSync,
} from "./entitlements";
export {
  FOOTER_PLATFORM_LINKS,
  composeTodayStrip,
  diversifyRail,
  pickRotatedLead,
  sitemapChunkPlan,
  type SitemapChunk,
  timeAgo,
  visibleHomeSections,
  validateReportGate,
  reportCoverSvg,
  type HomeSectionInput,
  type ReportGateInput,
} from "./site";

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
