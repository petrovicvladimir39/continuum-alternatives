"use client";

/**
 * Aceternity template pricing, ported faithfully (outer rounded-3xl shell,
 * inner shadow-input card, check list, featured tier). Tiers are PROTOTYPE
 * fixtures — final pricing is an operator decision.
 */

import React from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LandingButton } from "./button";

type Plan = {
  id: string;
  name: string;
  price: number | string;
  subText?: string;
  currency: string;
  features: string[];
  featured?: boolean;
  buttonText: string;
  href: string;
  additionalFeatures?: string[];
};

const PLANS: Plan[] = [
  {
    id: "reader",
    name: "Reader",
    price: 0,
    subText: "/month",
    currency: "€",
    features: [
      "The public wire, updated daily",
      "Universe map across 39 countries",
      "Weekly digest by email",
      "Three saved searches",
    ],
    buttonText: "Start reading",
    href: "/v2",
  },
  {
    id: "professional",
    name: "Professional",
    price: 149,
    subText: "/month",
    currency: "€",
    featured: true,
    features: [
      "Full fact history with citations",
      "Real-time alerts and watchlists",
      "Exports (CSV, API sandbox)",
      "All nine asset-class verticals",
    ],
    additionalFeatures: ["Everything in Reader"],
    buttonText: "Start Professional",
    href: "/v2/workspace",
  },
  {
    id: "institutional",
    name: "Institutional",
    price: 890,
    subText: "/month",
    currency: "€",
    features: [
      "Team seats and shared workspaces",
      "Full API with register provenance",
      "Custom coverage requests",
      "Quarterly analyst briefings",
    ],
    additionalFeatures: ["Everything in Reader", "Everything in Professional"],
    buttonText: "Talk to us",
    href: "/v2/about",
  },
];

export function LandingPricing() {
  return (
    <div
      id="pricing"
      className="relative isolate w-full bg-white px-4 py-0 dark:bg-neutral-950 sm:py-20 lg:px-4"
    >
      <h2 className="pt-4 text-center text-lg font-bold text-neutral-800 dark:text-neutral-100 md:text-4xl">
        Simple pricing for serious coverage
      </h2>
      <p className="mx-auto mt-4 max-w-md text-center text-base text-neutral-600 dark:text-neutral-300">
        Start free on the public wire; upgrade when the map becomes part of your
        process.
      </p>

      <div className="mx-auto mt-20 grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLANS.map((tier) => (
          <PricingCard plan={tier} key={tier.id} />
        ))}
      </div>
    </div>
  );
}

function PricingCard({ plan }: { plan: Plan }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-gray-50 p-1 dark:border-neutral-800 dark:bg-neutral-900 sm:p-4 md:p-4">
      <div className="flex h-full flex-col justify-start gap-4">
        <div className="w-full rounded-2xl bg-white p-4 shadow-input dark:bg-neutral-800 dark:shadow-[0px_-1px_0px_0px_var(--color-neutral-700)]">
          <div className="flex items-center justify-between">
            <p className="font-medium text-neutral-700 dark:text-neutral-100">{plan.name}</p>
            {plan.featured && (
              <div className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">
                Featured
              </div>
            )}
          </div>
          <div className="mt-6 flex items-end gap-1">
            <span className="text-lg font-bold text-neutral-500 dark:text-neutral-200">
              {plan.currency}
            </span>
            <span className="text-4xl font-bold text-neutral-800 dark:text-neutral-50 md:text-6xl">
              {plan.price}
            </span>
            {plan.subText && (
              <span className="mb-1 text-sm text-neutral-500 dark:text-neutral-200">
                {plan.subText}
              </span>
            )}
          </div>
          <LandingButton
            as={Link}
            href={plan.href}
            variant={plan.featured ? "dark" : "primary"}
            className="mt-8 w-full"
          >
            {plan.buttonText}
          </LandingButton>
        </div>
        <div className="p-4">
          {plan.features.map((feature) => (
            <Step key={feature}>{feature}</Step>
          ))}
          {plan.additionalFeatures?.map((feature) => (
            <Step additional key={feature}>
              {feature}
            </Step>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step({ children, additional }: { children: React.ReactNode; additional?: boolean }) {
  return (
    <div className="flex items-start justify-start gap-2 py-2">
      <div
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
          additional ? "bg-orange-500" : "bg-neutral-700 dark:bg-neutral-200",
        )}
      >
        {additional ? (
          <Plus className="h-3 w-3 text-white [stroke-width:4px]" />
        ) : (
          <Check className="h-3 w-3 text-white dark:text-neutral-800 [stroke-width:4px]" />
        )}
      </div>
      <div className="text-sm font-medium text-black dark:text-white">{children}</div>
    </div>
  );
}
