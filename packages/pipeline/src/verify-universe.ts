import "./env";
import {
  findWarmPaths,
  MEMBER_NODE,
  normalizeAlias,
  parseConnectionsCsv,
  warmthWeight,
  type WarmEdge,
} from "@continuum/shared";
import {
  buildMemberGraph,
  countPrivateEdges,
  createContactRequest,
  contactRequestsToday,
  db,
  deleteAllPrivateEdges,
  findIntroIntermediary,
  importPrivateEdges,
  listContactRequestsFor,
  listOutbox,
  pathsToEntity,
  respondContactRequest,
  setAttendance,
  setAttendanceVisibility,
  setMemberAffiliation,
  sql,
  universeEntities,
  upsertMemberProfile,
} from "@continuum/db";

/**
 * Verify: Phase 32 — warm intros + universe + LinkedIn import.
 * The centerpiece is the ADVERSARIAL scoping check: member B's traversal
 * must never touch member A's private edges, asserted on SQL results.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

const FIX = "user_verify_universe_";
const SLUG = "verify-universe-fx-";

async function cleanup(): Promise<void> {
  const members = await db.execute(
    sql`SELECT id FROM member_profiles WHERE clerk_user_id LIKE ${FIX + "%"}`,
  );
  for (const row of members.rows) {
    const id = String(row.id);
    await db.execute(sql`DELETE FROM alert_outbox WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM contact_requests WHERE from_member_id = ${id} OR to_member_id = ${id}`);
    await db.execute(sql`DELETE FROM member_private_edges WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM event_attendance WHERE member_id = ${id}`);
    await db.execute(sql`DELETE FROM member_watchlist WHERE member_id = ${id}`);
  }
  await db.execute(sql`
    DELETE FROM edges WHERE source_entity_id IN (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
      OR target_entity_id IN (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`
    DELETE FROM aliases WHERE entity_id IN (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  await db.execute(sql`
    DELETE FROM events WHERE entity_id IN (SELECT id FROM entities WHERE slug LIKE ${SLUG + "%"})
  `);
  // Members BEFORE entities — organization_entity_id references them.
  await db.execute(sql`DELETE FROM member_profiles WHERE clerk_user_id LIKE ${FIX + "%"}`);
  await db.execute(sql`DELETE FROM entities WHERE slug LIKE ${SLUG + "%"}`);
}

async function fixtureEntity(suffix: string, name: string, kind = "organization"): Promise<string> {
  const result = await db.execute(sql`
    INSERT INTO entities (kind, name, slug, status)
    VALUES (${kind}::entity_kind, ${name}, ${SLUG + suffix}, 'active') RETURNING id
  `);
  const id = String(result.rows[0]!.id);
  // resolveEntity matches over the aliases table — production entities get
  // alias rows on creation, so fixtures do too.
  await db.execute(sql`
    INSERT INTO aliases (entity_id, alias, alias_normalized)
    VALUES (${id}::uuid, ${name}, ${normalizeAlias(name)})
  `);
  return id;
}

async function main(): Promise<void> {
  await cleanup();

  console.log("— LinkedIn CSV parse variants (email always dropped) —");
  const standard = parseConnectionsCsv(
    `First Name,Last Name,URL,Email Address,Company,Position,Connected On\n` +
      `Jana,Novak,https://x,jana@x.test,"Adria Capital, d.o.o.",Partner,18 Mar 2023\n` +
      `Marko,Ilic,,,,,\n`,
  );
  check(!("error" in standard), "standard export parses");
  if (!("error" in standard)) {
    check(standard.connections.length === 2, "rows with a name survive");
    check(standard.connections[0]!.display === "Jana Novak", "display = First Last");
    check(standard.connections[0]!.company === "Adria Capital, d.o.o.", "quoted comma company intact");
    check(standard.connections[0]!.connectedOn === "2023-03-18", `"18 Mar 2023" → ISO`);
    check(standard.emailColumnDropped, "email column detected — and DROPPED");
    check(!JSON.stringify(standard.connections).includes("jana@x.test"), "no email survives parsing");
  }
  const preamble = parseConnectionsCsv(
    `Notes:\n"When exporting your connection data, you may notice..."\n\n` +
      `First Name,Last Name,Company,Position,Connected On\nIva,Kos,Beta Fund,Analyst,2024-01-05\n`,
  );
  check(!("error" in preamble) && preamble.connections.length === 1, "Notes: preamble tolerated");
  const variant = parseConnectionsCsv(`Last Name,First Name,Position,Company\nKos,Iva,Analyst,Beta\n`);
  check(!("error" in variant) && variant.connections[0]!.display === "Iva Kos", "column order variant tolerated");
  check("error" in parseConnectionsCsv("just,some,random\ncsv,file,here\n"), "non-LinkedIn CSV refused");

  console.log("\n— pure path engine: warmth ordering + determinism —");
  const order = ["private_contact", "invested_in", "advised_on", "co_attendance", "unknown_kind"];
  check(
    order.every(
      (kind, index) => index === 0 || warmthWeight(kind) < warmthWeight(order[index - 1]!),
    ),
    "warmth: private contact > invested_in > advised_on > co-attendance > generic",
  );
  const fixtureEdges: WarmEdge[] = [
    { from: MEMBER_NODE, to: "A", kind: "private_contact", label: "your contact X", private: true, recency: "2026-06-01" },
    { from: MEMBER_NODE, to: "B", kind: "co_attendance", label: "co-attended E", private: false, recency: "2026-06-01" },
    { from: "A", to: "T", kind: "advised_on", label: "advised on", private: false, recency: null },
    { from: "B", to: "T", kind: "advised_on", label: "advised on", private: false, recency: null },
    { from: MEMBER_NODE, to: "C", kind: "affiliation", label: "your firm", private: false, recency: null },
    { from: "C", to: "D", kind: "manages", label: "manages", private: false, recency: null },
    { from: "D", to: "T", kind: "invested_in", label: "invested in", private: false, recency: null },
  ];
  const ranked = findWarmPaths({ edges: fixtureEdges, target: "T", now: new Date("2026-07-21T00:00:00Z") });
  check(ranked.length === 3, `three distinct paths found (${ranked.length})`);
  check(ranked[0]!.nodes.join(">") === `${MEMBER_NODE}>A>T`, "warmest: via the private contact");
  check(ranked[1]!.nodes.join(">") === `${MEMBER_NODE}>B>T`, "then co-attendance at equal hops");
  check(ranked[2]!.hops === 3, "3-hop affiliation chain ranks last");
  const rankedAgain = findWarmPaths({ edges: fixtureEdges, target: "T", now: new Date("2026-07-21T00:00:00Z") });
  check(JSON.stringify(ranked) === JSON.stringify(rankedAgain), "ranking is deterministic");
  const recencyEdges: WarmEdge[] = [
    { from: MEMBER_NODE, to: "A", kind: "private_contact", label: "old", private: true, recency: "2019-01-01" },
    { from: "A", to: "T", kind: "advised_on", label: "advised on", private: false, recency: null },
    { from: MEMBER_NODE, to: "B", kind: "private_contact", label: "new", private: true, recency: "2026-06-01" },
    { from: "B", to: "T", kind: "advised_on", label: "advised on", private: false, recency: null },
  ];
  const byRecency = findWarmPaths({ edges: recencyEdges, target: "T", now: new Date("2026-07-21T00:00:00Z") });
  check(byRecency[0]!.nodes.includes("B"), "equal warmth: newer edge wins");
  check(findWarmPaths({ edges: fixtureEdges, target: "NOWHERE", now: new Date() }).length === 0, "unreachable target → empty (honest)");

  console.log("\n— import + resolve + delete-all completeness —");
  const memberA = await upsertMemberProfile({ clerkUserId: `${FIX}a`, email: "u-a@test.test", displayName: "Ana Universe" });
  const memberB = await upsertMemberProfile({ clerkUserId: `${FIX}b`, email: "u-b@test.test", displayName: "Ben Universe" });
  const orgX = await fixtureEntity("orgx", "Verify Universe Advisors");
  const orgY = await fixtureEntity("orgy", "Verify Universe Capital");
  const target = await fixtureEntity("target", "Verify Universe Target");
  await db.execute(sql`
    INSERT INTO edges (edge_type, source_entity_id, target_entity_id, status)
    VALUES ('advised_on', ${orgX}::uuid, ${target}::uuid, 'approved')
  `);
  const report = await importPrivateEdges(memberA.id, [
    { display: "Jana Novak", company: "Verify Universe Advisors", position: "Partner", connectedOn: "2024-05-01" },
    { display: "No Org Contact", company: null, position: null, connectedOn: null },
    { display: "Unmatched Org", company: "Totally Unknown Firm 999", position: null, connectedOn: null },
  ]);
  check(report.imported === 3, "3 contacts imported");
  check(report.matched === 1, "1 matched to the corpus via resolveEntity");
  const reimport = await importPrivateEdges(memberA.id, [
    { display: "Jana Novak", company: "Verify Universe Advisors", position: "Partner", connectedOn: "2024-05-01" },
  ]);
  check(reimport.duplicates === 1 && reimport.imported === 0, "re-upload is idempotent");

  console.log("\n— ADVERSARIAL private-edge scoping (the privacy law) —");
  const graphA = await buildMemberGraph(memberA.id);
  check(
    graphA.edges.some((edge) => edge.kind === "private_contact" && edge.to === orgX),
    "owner's graph holds their private hop",
  );
  const graphB = await buildMemberGraph(memberB.id);
  check(graphB.edges.length === 0, "member B's graph is EMPTY — zero of A's edges leak (SQL-level)");
  check(
    !graphB.edges.some((edge) => edge.private || edge.to === orgX || edge.kind === "private_contact"),
    "B's edge list contains no private edge, no contact org, nothing of A's",
  );
  const pathsB = await pathsToEntity(memberB.id, target);
  check(pathsB.length === 0, "B has NO path to the target through A's contact");
  const pathsA = await pathsToEntity(memberA.id, target);
  check(pathsA.length > 0, "A reaches the target through their own contact");
  check(
    pathsA[0]!.chain === "You → Verify Universe Advisors — your contact Jana Novak, Partner → advised on → Verify Universe Target",
    `chain renders per spec (got: ${pathsA[0]!.chain})`,
  );
  check(pathsA[0]!.segments[0]!.isPrivate, "the private hop is marked (your contact)");

  console.log("\n— affiliation change effects —");
  await setMemberAffiliation(memberB.id, orgY);
  let graphB2 = await buildMemberGraph(memberB.id);
  check(
    graphB2.edges.some((edge) => edge.kind === "affiliation" && edge.to === orgY),
    "affiliation edge appears after confirmation",
  );
  await setMemberAffiliation(memberB.id, orgX);
  graphB2 = await buildMemberGraph(memberB.id);
  check(
    graphB2.edges.some((edge) => edge.kind === "affiliation" && edge.to === orgX) &&
      !graphB2.edges.some((edge) => edge.kind === "affiliation" && edge.to === orgY),
    "changing affiliation moves the start node",
  );
  const pathsB2 = await pathsToEntity(memberB.id, target);
  check(
    pathsB2.length > 0 && !pathsB2[0]!.segments.some((segment) => segment.isPrivate),
    "B now reaches the target via their PUBLIC affiliation — still zero private hops",
  );
  await setMemberAffiliation(memberB.id, null);
  check((await buildMemberGraph(memberB.id)).edges.length === 0, "clearing affiliation empties the graph");

  console.log("\n— co-attendance hop consent matrix —");
  const eventFx = await fixtureEntity("event", "Verify Universe Summit", "event");
  await db.execute(sql`
    INSERT INTO events (entity_id, event_format, starts_at, ends_at)
    VALUES (${eventFx}::uuid, 'in_person', now() + interval '30 days', now() + interval '31 days')
  `);
  await setMemberAffiliation(memberB.id, orgY);
  await setAttendance(memberA.id, eventFx, "attending");
  await setAttendance(memberB.id, eventFx, "attending");
  // Both invisible → no hop.
  let graphCo = await buildMemberGraph(memberA.id);
  check(!graphCo.edges.some((edge) => edge.kind === "co_attendance"), "invisible+invisible → NO hop");
  await setAttendanceVisibility(memberB.id, eventFx, true);
  graphCo = await buildMemberGraph(memberA.id);
  check(!graphCo.edges.some((edge) => edge.kind === "co_attendance"), "me invisible → NO hop (my consent required too)");
  await setAttendanceVisibility(memberA.id, eventFx, true);
  graphCo = await buildMemberGraph(memberA.id);
  check(
    graphCo.edges.some((edge) => edge.kind === "co_attendance" && edge.to === orgY),
    "visible+visible → co-attendance hop to their firm",
  );
  await setAttendanceVisibility(memberB.id, eventFx, false);
  graphCo = await buildMemberGraph(memberA.id);
  check(!graphCo.edges.some((edge) => edge.kind === "co_attendance"), "their opt-out removes the hop immediately");
  await setAttendanceVisibility(memberB.id, eventFx, true);

  console.log("\n— universe layers + warmth indicators —");
  const watchOnly = await fixtureEntity("watchonly", "Verify Universe Island");
  await db.execute(sql`INSERT INTO member_watchlist (member_id, entity_id) VALUES (${memberA.id}, ${watchOnly}::uuid)`);
  await db.execute(sql`INSERT INTO member_watchlist (member_id, entity_id) VALUES (${memberA.id}, ${target}::uuid)`);
  const universeA = await universeEntities(memberA.id);
  const byId = new Map(universeA.map((item) => [item.entityId, item]));
  check(byId.get(orgX)?.layer === "contact" && byId.get(orgX)?.warmth === "direct", "contact org: contact layer, direct");
  check(byId.get(orgY)?.layer === "event" && byId.get(orgY)?.warmth === "direct", "co-attendee firm: event layer, direct");
  check(byId.get(target)?.warmth === "two_hops", "watched entity one public edge from a direct org → 2 hops");
  check(byId.get(watchOnly)?.warmth === "watched_only", "unconnected watched entity → watched only");

  console.log("\n— intro-request eligibility + silent decline —");
  check((await findIntroIntermediary(orgX, memberA.id)) === null, "org without an affiliated member → no intermediary");
  const memberC = await upsertMemberProfile({ clerkUserId: `${FIX}c`, email: "u-c@test.test", displayName: "Cara Universe" });
  await setMemberAffiliation(memberC.id, orgX);
  check(
    (await findIntroIntermediary(orgX, memberA.id)) === null,
    "affiliated but NO participation signal → no affordance",
  );
  await setAttendance(memberC.id, eventFx, "interested");
  await setAttendanceVisibility(memberC.id, eventFx, true);
  const intermediary = await findIntroIntermediary(orgX, memberA.id);
  check(intermediary !== null && intermediary.memberId === memberC.id, "visibility opt-in unlocks the affordance");
  check((await findIntroIntermediary(orgX, memberC.id)) === null, "you are never your own intermediary");
  const introResult = await createContactRequest({
    fromMemberId: memberA.id,
    toMemberId: memberC.id,
    contextKind: "universe",
    introTargetEntityId: target,
    message: "Could you introduce me — diligence on their NPL book.",
  });
  check(introResult === "created", "intro request lands");
  check(
    (await createContactRequest({
      fromMemberId: memberA.id, toMemberId: memberC.id, contextKind: "universe",
      introTargetEntityId: target, message: "again",
    })) === "duplicate",
    "one per (from, to, target) — ever",
  );
  check((await contactRequestsToday(memberA.id)) === 1, "intro requests share the 31C daily counter");
  const caraView = (await listContactRequestsFor(memberC.id)).find((row) => row.contextKind === "universe");
  check(
    caraView !== undefined && caraView.introTargetName === "Verify Universe Target" && caraView.message !== null,
    "intermediary sees requester + target + note",
  );
  check(caraView !== undefined && caraView.counterpartEmail === null, "no email pending");
  await respondContactRequest(caraView!.id, memberC.id, false);
  check(
    !(await listOutbox(memberA.id, { unsentOnly: true })).some((item) => item.kind === "contact_request"),
    "decline is silent — no requester notification",
  );

  console.log("\n— delete-all: the one-click promise —");
  const before = await countPrivateEdges(memberA.id);
  check(before.total === 3, "3 private edges before");
  const deleted = await deleteAllPrivateEdges(memberA.id);
  check(deleted === 3, "delete-all removes every row");
  check((await countPrivateEdges(memberA.id)).total === 0, "row count 0 — immediately");
  const universeAfter = await universeEntities(memberA.id);
  check(!universeAfter.some((item) => item.layer === "contact"), "contact layer empty after delete");
  check((await pathsToEntity(memberA.id, target)).every((path) => !path.segments.some((s) => s.isPrivate)), "no private hop survives deletion");

  await cleanup();
  if (failures > 0) {
    console.error(`\nverify-universe: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-universe: PASS — private graph, paths, and intros green");
  await new Promise((resolve) => setTimeout(resolve, 200));
  process.exit(0);
}

main().catch(async (error) => {
  await cleanup();
  console.error(error);
  process.exit(1);
});
