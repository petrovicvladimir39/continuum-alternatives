import "./env";
import { digitViolations, guardArticle, nameViolations, type ComposeInputs } from "./articles-guards";

/**
 * Verify: News Desk mechanical guards (reset build Part 6). Pure fixtures —
 * the guards are the anti-fabrication layer between the model and the queue.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

const INPUTS: ComposeInputs = {
  factTitles: [
    "Adria Capital opens insolvency proceedings over Hotel Panorama",
    "Hotel Panorama assets scheduled for auction at EUR 4,500,000",
  ],
  excerpts: [
    "Стечајни поступак над Hotel Panorama d.o.o. отворен је решењем суда, а имовина је процењена на 4.500.000 евра.",
    "The court in Novi Sad confirmed the opening decision on 12 June 2026.",
  ],
  sourceNames: ["ALSU — Serbian Bankruptcy Supervision Agency"],
  entityNames: ["Adria Capital", "Hotel Panorama"],
};

const GOOD_BODY = [
  "Adria Capital has moved against Hotel Panorama, with insolvency proceedings now open according to ALSU — Serbian Bankruptcy Supervision Agency records. The court in Novi Sad confirmed the opening decision on 12 June 2026, placing the hotel's assets under the supervision of the estate.",
  "The assets are scheduled for auction at EUR 4,500,000, a figure taken directly from the filing. The proceeding follows the standard course for hospitality assets of this size, and the record will be updated as filings arrive.",
  "For the distressed desk, the auction date is the next marker to watch. Hotel Panorama remains the estate's principal asset.",
].join("\n\n");

async function main(): Promise<void> {
  console.log("— digit guard —");
  check(digitViolations("sold for 4.500.000 евра on 12 June", INPUTS).length === 0, "input numbers pass");
  check(
    digitViolations("a EUR 7,000,000 deal", INPUTS).length > 0,
    "invented number flagged",
  );
  check(digitViolations("a 5% rise", INPUTS).length === 0, "single digits ignored (only 2+ runs guarded)");
  check(
    digitViolations("expected in 06.2026", {
      ...INPUTS,
      excerpts: [...INPUTS.excerpts, "рочиште је заказано за 22.06.2026. године"],
    }).length === 0,
    "date reformat (substring of an input number) passes",
  );

  console.log("\n— entity-name guard —");
  check(nameViolations("Adria Capital moved on Hotel Panorama.", INPUTS).length === 0, "input names pass");
  check(
    nameViolations("The deal drew interest from Blackstone Credit Partners.", INPUTS).length > 0,
    "invented firm name flagged",
  );
  check(
    nameViolations("In March the process continued. According to the filing, nothing changed.", INPUTS)
      .length === 0,
    "sentence-start capitalized words not false-flagged",
  );
  check(
    nameViolations("The court in Novi Sad confirmed the decision.", INPUTS).length === 0,
    "place names present in excerpts pass",
  );

  console.log("\n— full guard —");
  const good = guardArticle(
    { headline: "Hotel Panorama heads to auction at EUR 4,500,000", deck: "Insolvency opened; court confirmation on 12 June 2026 puts the asset on the block.", bodyMd: GOOD_BODY },
    INPUTS,
  );
  check(good.ok, `clean draft passes${good.ok ? "" : ` (got: ${(good as { reason: string }).reason})`}`);

  check(
    !guardArticle({ headline: "H".repeat(91), deck: "d", bodyMd: GOOD_BODY }, INPUTS).ok,
    "headline over 90 dropped",
  );
  check(
    !guardArticle({ headline: "ok", deck: "d".repeat(161), bodyMd: GOOD_BODY }, INPUTS).ok,
    "deck over 160 dropped",
  );
  check(
    !guardArticle({ headline: "ok", deck: "", bodyMd: "too short, according to the filing." }, INPUTS).ok,
    "body under 400 dropped",
  );
  check(
    !guardArticle({ headline: "ok", deck: "", bodyMd: GOOD_BODY + " x".repeat(700) }, INPUTS).ok,
    "body over 1600 dropped",
  );
  check(
    !guardArticle(
      { headline: "ok", deck: "", bodyMd: GOOD_BODY.replaceAll(/according to/gi, "as noted by") },
      INPUTS,
    ).ok,
    "missing in-prose attribution dropped",
  );
  check(
    !guardArticle(
      { headline: "ok", deck: "", bodyMd: `${GOOD_BODY}\n\nSources: ALSU filing` },
      INPUTS,
    ).ok,
    "model-written citation footer dropped",
  );
  check(
    !guardArticle(
      { headline: "Fund closes at EUR 9,900,000", deck: "", bodyMd: GOOD_BODY },
      INPUTS,
    ).ok,
    "invented headline number dropped",
  );

  if (failures > 0) {
    console.error(`\nverify-articles: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-articles: PASS — News Desk guards green");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
