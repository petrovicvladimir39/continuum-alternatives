import Stripe from "stripe";
import { FOUNDING_CAP_DEFAULT } from "@continuum/shared";

/**
 * Stripe plumbing (Phase 29A) — server-only. PRE-CONFIG MODE is a first-
 * class state: without STRIPE_SECRET_KEY + STRIPE_PRICE_FOUNDING every
 * payment surface renders an honest "Memberships open soon" and nothing
 * crashes. No surface ever fakes a price, a seat count, or a checkout.
 */

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_FOUNDING);
}

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient === null) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
  }
  return stripeClient;
}

export function foundingCap(): number {
  const raw = Number.parseInt(process.env.FOUNDING_CAP ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : FOUNDING_CAP_DEFAULT;
}

export type FoundingPrice = {
  /** Formatted like "€90 / year" — deterministic Intl formatting, no LLM. */
  display: string;
  amount: number;
  currency: string;
  interval: string;
};

let priceCache: { value: FoundingPrice; fetchedAt: number } | null = null;
const PRICE_TTL_MS = 5 * 60 * 1000;

/**
 * The rendered price comes from the LIVE Stripe price object (the config is
 * the source of truth; no hardcoded number can drift from what checkout
 * charges). Null in pre-config mode or on API failure — callers fall back
 * to the "open soon" state rather than showing a wrong price.
 */
export async function getFoundingPrice(): Promise<FoundingPrice | null> {
  if (!stripeConfigured()) {
    return null;
  }
  if (priceCache !== null && Date.now() - priceCache.fetchedAt < PRICE_TTL_MS) {
    return priceCache.value;
  }
  try {
    const price = await getStripe().prices.retrieve(process.env.STRIPE_PRICE_FOUNDING!);
    if (price.unit_amount === null || price.currency === undefined) {
      return null;
    }
    const amount = price.unit_amount / 100;
    const currency = price.currency.toUpperCase();
    const formatted = new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
    const interval = price.recurring?.interval ?? "one-time";
    const value: FoundingPrice = {
      display: interval === "one-time" ? formatted : `${formatted} / ${interval}`,
      amount,
      currency,
      interval,
    };
    priceCache = { value, fetchedAt: Date.now() };
    return value;
  } catch {
    return null;
  }
}
