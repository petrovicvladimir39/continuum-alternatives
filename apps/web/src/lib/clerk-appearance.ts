import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;

/**
 * Clerk Appearance mapped COMPLETELY to the styleguide (Phase 24A):
 * ground/surface/ink palette, accent for primary actions, Instrument Sans
 * via the layout font variable, radius ≤ 4px, elevation as 1px borders
 * ONLY — no shadows, no gradients, no Clerk default purple, no rounded-xl.
 * Anything Clerk paints that can't be reached through `variables` is forced
 * through `elements` overrides below.
 */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#17456b", // --color-accent
    colorPrimaryForeground: "#ffffff", // --color-accent-ink
    colorForeground: "#141311", // --color-ink
    colorMutedForeground: "#5c5952", // --color-ink-secondary
    colorMuted: "#fafaf8", // --color-ground
    colorBackground: "#fafaf8", // --color-ground
    colorInput: "#ffffff", // --color-surface
    colorInputForeground: "#141311",
    colorBorder: "#e7e4dc", // --color-line — elevation is 1px borders only
    colorRing: "#d2cec3", // --color-line-strong
    colorShadow: "transparent", // no shadows, ever
    colorDanger: "#a4442a", // --color-distressed
    colorSuccess: "#1d7a5f", // --color-equity
    colorWarning: "#96690f", // --color-credit
    colorNeutral: "#5c5952",
    borderRadius: "4px", // --radius-md, the styleguide maximum
    fontFamily: "var(--font-sans), -apple-system, 'Segoe UI', sans-serif",
    fontFamilyButtons: "var(--font-sans), -apple-system, 'Segoe UI', sans-serif",
    fontSize: "14px",
  },
  elements: {
    // Elevation is 1px borders only — kill every shadow Clerk ships.
    card: { boxShadow: "none", border: "1px solid #e7e4dc", borderRadius: "4px", backgroundColor: "#ffffff" },
    cardBox: { boxShadow: "none", borderRadius: "4px" },
    rootBox: { boxShadow: "none" },
    formButtonPrimary: {
      boxShadow: "none",
      backgroundImage: "none",
      backgroundColor: "#17456b",
      borderRadius: "2px", // --radius-sm for actions
      textTransform: "none",
      fontWeight: 500,
      "&:hover": { backgroundColor: "#123a5b", boxShadow: "none" },
    },
    formFieldInput: {
      boxShadow: "none",
      border: "1px solid #e7e4dc",
      borderRadius: "2px",
      "&:focus": { boxShadow: "none", borderColor: "#d2cec3" },
    },
    footer: { background: "none", backgroundColor: "transparent" },
    footerAction: { background: "none" },
    headerTitle: { fontFamily: "var(--font-serif), Georgia, serif", fontWeight: 500 },
    socialButtonsBlockButton: { boxShadow: "none", border: "1px solid #e7e4dc", borderRadius: "2px" },
    dividerLine: { backgroundColor: "#e7e4dc" },
    badge: { boxShadow: "none", borderRadius: "2px" },
    userButtonPopoverCard: { boxShadow: "none", border: "1px solid #e7e4dc", borderRadius: "4px" },
    avatarBox: { borderRadius: "2px" },
  },
};
