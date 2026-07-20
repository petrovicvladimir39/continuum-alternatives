import "./env";
import {
  FOOTER_PLATFORM_LINKS,
  NAV_ITEMS,
  reportCoverSvg,
  timeAgo,
  validateReportGate,
  visibleHomeSections,
} from "@continuum/shared";

let failures = 0;

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`ok    ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${message}`);
  }
}

function main() {
  console.log("— nav / footer IA —");
  const navLabels = NAV_ITEMS.map((item) => item.label);
  check(
    JSON.stringify(navLabels) ===
      JSON.stringify(["News", "Map", "Auctions", "Rankings", "Reports", "Digest"]),
    `primary nav order is News·Map·Auctions·Rankings·Reports·Digest (got ${navLabels.join("·")})`,
  );
  const footerLabels = FOOTER_PLATFORM_LINKS.map((item) => item.label);
  check(
    footerLabels.includes("About") && footerLabels.includes("Search"),
    "footer platform column adds About + Search",
  );
  check(
    NAV_ITEMS.every((item) => item.href.startsWith("/")),
    "all nav hrefs are internal paths",
  );

  console.log("\n— timeAgo (pure) —");
  const now = "2026-07-20T12:00:00Z";
  check(timeAgo("2026-07-20T11:58:00Z", now) === "2m ago", "minutes");
  check(timeAgo("2026-07-20T10:00:00Z", now) === "2h ago", "hours");
  check(timeAgo("2026-07-18T12:00:00Z", now) === "2d ago", "days");
  check(timeAgo("2026-05-20T12:00:00Z", now) === "2mo ago", "months");
  check(timeAgo("2026-07-20T12:05:00Z", now) === "0m ago", "future clamps to 0m");

  console.log("\n— homepage population rules (hidden-when-empty) —");
  const full = visibleHomeSections({
    lead: true,
    latestCount: 8,
    channelColumnCounts: [5, 3, 0],
    auctionsCount: 5,
    hasDigest: true,
  });
  check(
    ["stat-strip", "lead", "latest", "channel-band", "auctions-rail", "bottom-band"].every(
      (section) => full.includes(section),
    ),
    "fully-populated page shows every section",
  );
  const empty = visibleHomeSections({
    lead: false,
    latestCount: 0,
    channelColumnCounts: [0, 0, 0],
    auctionsCount: 0,
    hasDigest: false,
  });
  check(
    JSON.stringify(empty) === JSON.stringify(["stat-strip", "bottom-band"]),
    "empty record hides lead/latest/channels/auctions — zero empty states",
  );
  check(
    !visibleHomeSections({
      lead: true,
      latestCount: 1,
      channelColumnCounts: [0, 0, 0],
      auctionsCount: 0,
      hasDigest: true,
    }).includes("channel-band"),
    "all-empty channel columns hide the band",
  );

  console.log("\n— report gate validation —");
  const valid = { name: "Ana Analyst", email: "ana@example.com", role: "Investor", consent: true };
  check(validateReportGate(valid).ok, "valid submission passes");
  check(!validateReportGate({ ...valid, consent: false }).ok, "missing consent rejected");
  check(!validateReportGate({ ...valid, email: "not-an-email" }).ok, "bad email rejected");
  check(!validateReportGate({ ...valid, name: "A" }).ok, "one-letter name rejected");
  check(!validateReportGate({ ...valid, role: " " }).ok, "empty role rejected");
  const gateError = validateReportGate({ ...valid, consent: false });
  check(
    !gateError.ok && gateError.error.toLowerCase().includes("consent"),
    "consent error names the problem",
  );

  console.log("\n— report cover SVG determinism —");
  const coverA1 = reportCoverSvg({ title: "Serbian Insolvency Monitor", date: "Q3 2026" });
  const coverA2 = reportCoverSvg({ title: "Serbian Insolvency Monitor", date: "Q3 2026" });
  const coverB = reportCoverSvg({ title: "CEE Private Capital Map", date: "In preparation" });
  check(coverA1 === coverA2, "same input → byte-identical SVG");
  check(coverA1 !== coverB, "different titles → different covers");
  check(
    coverA1.includes("Serbian") && coverA1.includes("Q3 2026") && coverA1.includes("Continuum"),
    "cover carries title, date, wordmark",
  );
  check(
    !coverA1.includes("Gradient") && !coverA1.includes("filter") && !coverA1.includes("<image"),
    "no gradients, filters, or images (tokens only)",
  );
  check(
    coverA1.includes("#17456B") || coverA1.includes("#141311"),
    "background is accent or ink",
  );
  check(
    /fill="#(17456B|141311)"/.test(coverA1) && /fill="#(17456B|141311)"/.test(coverB),
    "both variants draw from the two allowed backgrounds",
  );
  check(
    reportCoverSvg({ title: "A & B <Test>", date: "2026" }).includes("A &amp; B &lt;Test>"),
    "title text is XML-escaped",
  );

  if (failures > 0) {
    console.error(`\nverify-site: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nverify-site: PASS — IA, homepage rules, gate, and covers green");
}

main();
