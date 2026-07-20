import "./env";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  ALT_TAXONOMY,
  CLASS_ACCENTS,
  canTransitionArticle,
  contrastRatio,
  inferArticleClassification,
  sanitizeArticleMarkdown,
  shouldGuardArticle,
} from "@continuum/shared";

/**
 * Verify: Phase 27 editorial layer — accent usage law, contrast, sanitizer,
 * guard applicability, draft state machine, compose classification votes.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

async function main(): Promise<void> {
  console.log("— accent usage law (grep) —");
  // Class accent tokens/hexes may appear ONLY in the sanctioned files:
  // globals.css (definitions), class-accent.tsx (the three slots),
  // styleguide (documentation specimens), shared editorial.ts (email hex
  // registry), digest-email.ts (email kicker inline style).
  const root = path.resolve(process.cwd(), "../..");
  const ALLOWED = new Set([
    "apps/web/src/app/globals.css",
    "apps/web/src/components/editorial/class-accent.tsx",
    "apps/web/src/app/(site)/styleguide/page.tsx",
    "packages/shared/src/editorial.ts",
    "packages/pipeline/src/digest-email.ts",
    "packages/pipeline/src/verify-editorial.ts",
  ]);
  const newHexes = Object.values(CLASS_ACCENTS).filter(
    (hex) => hex !== "#1d7a5f" && hex !== "#96690f", // shared with capital-type system by design
  );
  const violations: string[] = [];
  const scan = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (["node_modules", ".next", "dist", ".git", "drizzle"].includes(entry)) {
        continue;
      }
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        scan(full);
      } else if (/\.(ts|tsx|css)$/.test(entry)) {
        const rel = path.relative(root, full).replaceAll("\\", "/");
        if (ALLOWED.has(rel)) {
          continue;
        }
        const text = readFileSync(full, "utf8").toLowerCase();
        if (text.includes("--color-class-") || newHexes.some((hex) => text.includes(hex))) {
          violations.push(rel);
        }
      }
    }
  };
  scan(path.join(root, "apps/web/src"));
  scan(path.join(root, "packages"));
  check(violations.length === 0, `class accents confined to sanctioned slots (stray: ${violations.join(", ") || "none"})`);
  const slotFile = readFileSync(
    path.join(root, "apps/web/src/components/editorial/class-accent.tsx"),
    "utf8",
  );
  check(
    !/backgroundColor(?!: accent \/)/.test(slotFile.replace('style={{ backgroundColor: accent }}', "TOP_RULE_ONLY")) ||
      (slotFile.match(/backgroundColor/g) ?? []).length === 1,
    "inside the slot file, background use is the 2px rule alone",
  );

  console.log("\n— contrast (all nine accents AA on ground) —");
  for (const [slug, hex] of Object.entries(CLASS_ACCENTS)) {
    const ratio = contrastRatio(hex, "#fafaf8");
    check(ratio >= 4.5, `${slug} ${hex} → ${ratio.toFixed(2)}:1`);
  }
  check(Object.keys(CLASS_ACCENTS).length === ALT_TAXONOMY.length, "one accent per asset class (nine)");
  check(
    !Object.values(CLASS_ACCENTS).includes("#17456b"),
    "interaction accent stays exclusively interactive",
  );

  console.log("\n— markdown-subset sanitizer —");
  check(
    sanitizeArticleMarkdown("<script>alert(1)</script>Hello") === "Hello",
    "script tags stripped",
  );
  check(
    sanitizeArticleMarkdown("# Header\n\nBody text") === "Header\n\nBody text",
    "headers demoted to text",
  );
  check(
    sanitizeArticleMarkdown("- item one\n- item two") === "item one\nitem two",
    "list markers stripped",
  );
  check(
    sanitizeArticleMarkdown("![img](https://x.test/a.png) caption") === "img caption",
    "images stripped to alt text",
  );
  check(
    sanitizeArticleMarkdown("[ok](https://example.org) and [bad](javascript:void0)") ===
      "[ok](https://example.org) and bad",
    "non-http(s) links collapse to text",
  );
  check(
    sanitizeArticleMarkdown("**bold** stays") === "**bold** stays",
    "bold survives",
  );
  check(
    sanitizeArticleMarkdown("a\n\n\n\n\nb") === "a\n\nb",
    "blank-line runs collapse to paragraph breaks",
  );
  check(
    sanitizeArticleMarkdown('<img src=x onerror="alert(1)">safe') === "safe",
    "html injection removed",
  );

  console.log("\n— guard applicability matrix —");
  check(shouldGuardArticle("desk_compose"), "desk_compose → guards apply");
  check(!shouldGuardArticle("operator"), "operator → guards do not apply (the operator is the editor)");
  const composeTs = readFileSync(path.join(root, "packages/pipeline/src/articles-compose.ts"), "utf8");
  check(composeTs.includes('authoredBy: "desk_compose"'), "compose path stamps desk_compose");

  console.log("\n— draft → publish state machine —");
  check(canTransitionArticle("draft", "published", "operator"), "operator draft → published");
  check(!canTransitionArticle("draft", "published", "desk_compose"), "machine output never uses draft path");
  check(canTransitionArticle("proposed", "published", "desk_compose"), "compose proposals still publish via review");
  check(!canTransitionArticle("published", "draft", "operator"), "no un-publishing to draft");
  check(!canTransitionArticle("draft", "draft", "operator"), "no self-transition");

  console.log("\n— compose classification majority vote —");
  check(inferArticleClassification([]) === null, "no classifications → neutral");
  check(
    JSON.stringify(
      inferArticleClassification([
        { assetClass: "private_credit", strategy: "npl" },
        { assetClass: "private_credit", strategy: "npl" },
        { assetClass: "private_equity", strategy: "lbo" },
      ]),
    ) === JSON.stringify({ assetClass: "private_credit", strategy: "npl" }),
    "strategy majority wins",
  );
  check(
    JSON.stringify(
      inferArticleClassification([
        { assetClass: "private_credit", strategy: "npl" },
        { assetClass: "private_credit", strategy: "distressed_debt" },
        { assetClass: "private_credit", strategy: "" },
        { assetClass: "private_credit", strategy: "" },
      ]),
    ) === JSON.stringify({ assetClass: "private_credit", strategy: null }),
    "no strategy majority → class-level fallback",
  );
  check(
    inferArticleClassification([
      { assetClass: "private_credit", strategy: "npl" },
      { assetClass: "private_equity", strategy: "lbo" },
    ]) === null,
    "tied classes → neutral (never a fake classification)",
  );

  if (failures > 0) {
    console.error(`\nverify-editorial: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-editorial: PASS — editorial layer green");
  await new Promise((resolve) => setTimeout(resolve, 200));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
