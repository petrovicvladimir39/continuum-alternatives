import "./env";
import {
  aliases,
  contacts as contactsTable,
  db,
  digestItems,
  digests,
  entities,
  entityTags,
  eq,
  inArray,
  like,
  organizations,
  timelineFacts,
} from "@continuum/db";
import { createEntity } from "@continuum/db";
import { buildDigestEmail } from "./digest-email";
import { composeDigest, digestSubject, persistDraft, rankFacts, selectRecipients } from "./digest";
import type { ContactRow, DigestFact } from "./digest";

let failures = 0;

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`ok    ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${message}`);
  }
}

const FIXTURE_DATE = "2020-06-15"; // far in the past — never collides with real digests

async function cleanup() {
  const entityRows = await db
    .select({ id: entities.id })
    .from(entities)
    .where(like(entities.name, "CLI Test%"));
  const ids = entityRows.map((row) => row.id);
  if (ids.length > 0) {
    const factRows = await db
      .select({ id: timelineFacts.id })
      .from(timelineFacts)
      .where(inArray(timelineFacts.entityId, ids));
    const factIds = factRows.map((row) => row.id);
    if (factIds.length > 0) {
      await db.delete(digestItems).where(inArray(digestItems.factId, factIds));
    }
    await db.delete(timelineFacts).where(inArray(timelineFacts.entityId, ids));
    await db.delete(entityTags).where(inArray(entityTags.entityId, ids));
    await db.delete(aliases).where(inArray(aliases.entityId, ids));
    await db.delete(organizations).where(inArray(organizations.entityId, ids));
    await db.delete(entities).where(inArray(entities.id, ids));
  }
  await db.delete(digests).where(eq(digests.digestDate, FIXTURE_DATE));
  await db.delete(contactsTable).where(like(contactsTable.email, "cli-test-%"));
}

function fact(overrides: Partial<DigestFact>): DigestFact {
  return {
    factId: "00000000-0000-0000-0000-000000000000",
    factType: "insolvency_opened",
    title: "t",
    occurredOn: "2020-06-14",
    confidence: "0.95",
    channels: ["distressed"],
    entityName: "E",
    entitySlug: "e",
    sourceName: null,
    ...overrides,
  };
}

async function main() {
  console.log("— pure ranking —");
  const ranked = rankFacts([
    fact({ factId: "1", factType: "servicing_mandate", confidence: "0.99" }),
    fact({ factId: "2", factType: "insolvency_opened", confidence: "0.60" }),
    fact({ factId: "3", factType: "insolvency_opened", confidence: "0.95" }),
    fact({
      factId: "4",
      factType: "asset_sale_announced",
      confidence: "0.95",
      channels: ["distressed", "private_credit"],
    }),
  ]);
  const distressed = ranked.find((section) => section.channel === "distressed");
  check(
    distressed?.items.map((item) => item.factId).join(",") === "3,2,4,1",
    `priority→confidence ordering (${distressed?.items.map((item) => item.factId).join(",")})`,
  );
  const privateCredit = ranked.find((section) => section.channel === "private_credit");
  check(
    privateCredit?.items.length === 1 && privateCredit.items[0]?.factId === "4",
    "multi-channel fact appears in each of its channels",
  );

  const many = rankFacts(
    Array.from({ length: 12 }, (_, i) =>
      fact({ factId: `m${i}`, occurredOn: `2020-06-${String(i + 1).padStart(2, "0")}` }),
    ),
  );
  check(many[0]?.items.length === 10, `cap 10 per channel (got ${many[0]?.items.length})`);

  check(
    digestSubject("2026-07-20") === "Continuum Brief — 20 Jul 2026",
    "subject format d MMM yyyy",
  );

  console.log("\n— composition window + dedup (the backfill guard) —");
  await cleanup();
  const org = await createEntity({ kind: "organization", name: "CLI Test Digest Org" });
  const mkFact = async (occurredOn: string, title: string) => {
    const inserted = await db
      .insert(timelineFacts)
      .values({
        entityId: org.id,
        factType: "insolvency_opened",
        occurredOn,
        title,
        audienceChannels: ["distressed"],
        confidence: "0.95",
        status: "approved",
        data: { entities: [org.id] },
      })
      .returning({ id: timelineFacts.id });
    return inserted[0]!.id;
  };
  const inWindow = await mkFact("2020-06-14", "CLI Test in-window fact");
  await mkFact("2020-01-10", "CLI Test old backfill fact");

  const composition = await composeDigest(FIXTURE_DATE);
  const composedIds = composition.sections.flatMap((section) =>
    section.items.map((item) => item.factId),
  );
  check(composedIds.includes(inWindow), "in-window fact composed");
  check(
    !composition.sections.some((section) =>
      section.items.some((item) => item.title === "CLI Test old backfill fact"),
    ),
    "7-day window excludes old occurred_on (backfill guard)",
  );

  await persistDraft({
    digestDate: FIXTURE_DATE,
    subject: composition.subject,
    sections: composition.sections.map((section) => ({
      ...section,
      items: section.items.filter((item) => item.factId === inWindow),
    })),
  });
  const recomposed = await composeDigest(FIXTURE_DATE);
  check(
    !recomposed.sections.some((section) => section.items.some((item) => item.factId === inWindow)),
    "facts included in a prior digest are not re-composed",
  );

  console.log("\n— recipients + email —");
  const contact = (overrides: Partial<ContactRow>): ContactRow =>
    ({
      id: "c",
      email: "cli-test-x@example.com",
      name: null,
      role: null,
      org: null,
      channels: ["distressed"],
      consentSource: "operator",
      consentedAt: new Date(),
      unsubscribedAt: null,
      // Phase 23: delivery requires the double-opt-in confirmed state.
      status: "active",
      confirmationToken: "00000000-0000-0000-0000-000000000000",
      createdAt: new Date(),
      ...overrides,
    }) as ContactRow;
  const recipients = selectRecipients(
    [
      contact({ id: "a", channels: ["distressed"] }),
      contact({ id: "b", channels: ["vc_founders"] }),
      contact({ id: "c", channels: ["distressed"], unsubscribedAt: new Date(), status: "unsubscribed" }),
      contact({ id: "d", channels: ["private_credit", "pe"] }),
      contact({ id: "e", channels: ["distressed"], status: "pending_confirmation" }),
    ],
    ["distressed", "private_credit"],
  );
  check(
    recipients.map((r) => r.id).join(",") === "a,d",
    `channel intersection + status filter (${recipients.map((r) => r.id).join(",")})`,
  );

  const email = buildDigestEmail(
    {
      digestDate: FIXTURE_DATE,
      subject: digestSubject(FIXTURE_DATE),
      sections: [
        {
          channel: "distressed",
          items: [{ ...fact({ factId: "f1", title: "Distressed item" }), rank: 1 }],
        },
        {
          channel: "pe",
          items: [{ ...fact({ factId: "f2", title: "PE item", channels: ["pe"] }), rank: 1 }],
        },
      ],
    },
    ["distressed"],
  );
  check(email.html.includes("Distressed item"), "email renders subscriber-channel items");
  check(!email.html.includes("PE item"), "email omits non-subscribed channels");
  check(
    email.html.includes(`/digest/${FIXTURE_DATE}#item-f1`),
    "items link to public archive anchors",
  );
  check(email.html.includes("Georgia"), "serif headings use the email-safe Georgia stand-in");

  await cleanup();
  const leftover = await db.select().from(digests).where(eq(digests.digestDate, FIXTURE_DATE));
  check(leftover.length === 0, "cleanup removed fixtures");

  if (failures > 0) {
    console.error(`\nverify-digest: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nverify-digest: PASS — digest engine checks green");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
