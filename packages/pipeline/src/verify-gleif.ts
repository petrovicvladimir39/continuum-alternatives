import "./env";
import { deflateRawSync } from "node:zlib";
import { db, entities, entityTags, organizations, aliases, eq, inArray, RegisterImporter } from "@continuum/db";
import { gleifRecordToRow, parseRrCsv, splitCap, unzipFirstMatch, type GleifApiRecord } from "./gleif";
import { parseAmfCsv, parseCssfAifm, parseLbCsv, nbsCityFromAddress, nbsSelectRows } from "./registers";

/**
 * Verify: GLEIF + register harvest layer (reset build Part 2).
 * Pure fixtures for parsing/filtering + a real-DB round trip proving the
 * LEI deterministic key and harvester idempotency.
 */

let failures = 0;
function check(condition: boolean, label: string): void {
  console.log(`${condition ? "ok   " : "FAIL "} ${label}`);
  if (!condition) {
    failures += 1;
  }
}

function gleifRecord(overrides: {
  lei?: string;
  name?: string;
  country?: string;
  city?: string;
  category?: string;
  status?: string;
}): GleifApiRecord {
  return {
    id: overrides.lei ?? "TESTLEI0000000000001",
    attributes: {
      lei: overrides.lei ?? "TESTLEI0000000000001",
      entity: {
        legalName: { name: overrides.name ?? "Test Fund SICAV" },
        legalAddress: { city: overrides.city ?? "Luxembourg", country: overrides.country ?? "LU" },
        category: overrides.category ?? "FUND",
        legalForm: { id: "UDY2" },
        status: overrides.status ?? "ACTIVE",
      },
      registration: { status: "ISSUED" },
    },
  };
}

/** Build a minimal single-entry zip (deflate) around `content` for the unzip fixture. */
function makeZip(entryName: string, content: string): Buffer {
  const nameBuf = Buffer.from(entryName, "utf8");
  const data = deflateRawSync(Buffer.from(content, "utf8"));
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8); // deflate
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(Buffer.byteLength(content), 22);
  local.writeUInt16LE(nameBuf.length, 26);
  const localOffset = 0;
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(8, 10); // method
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(Buffer.byteLength(content), 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt32LE(localOffset, 42);
  const centralOffset = 30 + nameBuf.length + data.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(46 + nameBuf.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([local, nameBuf, data, central, nameBuf, eocd]);
}

async function main(): Promise<void> {
  console.log("— GLEIF record → import row (LEI category filter) —");
  const fund = gleifRecordToRow(gleifRecord({}), { requireCategory: "FUND" });
  check(fund !== null, "ACTIVE FUND record passes");
  check(fund?.registryId === "TESTLEI0000000000001", "LEI becomes registryId");
  check(fund?.tags.includes("register_verified") === true, "register_verified tag present");
  check(fund?.tags.includes("lei") === true, "lei tag present");
  check(fund?.city === "Luxembourg", "city from legal address");
  check(
    gleifRecordToRow(gleifRecord({ category: "GENERAL" }), { requireCategory: "FUND" }) === null,
    "GENERAL record rejected when FUND required",
  );
  check(
    gleifRecordToRow(gleifRecord({ category: "GENERAL" })) !== null,
    "GENERAL record accepted without category requirement (manager path)",
  );
  check(
    gleifRecordToRow(gleifRecord({ status: "INACTIVE" })) === null,
    "INACTIVE entity rejected",
  );
  check(gleifRecordToRow(gleifRecord({ name: "" })) === null, "empty name rejected");

  console.log("\n— RR relationship CSV parse —");
  const rrCsv = [
    "Relationship.StartNode.NodeID,Relationship.StartNode.NodeIDType,Relationship.EndNode.NodeID,Relationship.RelationshipType,Relationship.RelationshipStatus",
    "FUND1LEI,LEI,MGR1LEI,IS_FUND-MANAGED_BY,ACTIVE",
    "FUND2LEI,LEI,PARENTLEI,IS_ULTIMATELY_CONSOLIDATED_BY,ACTIVE",
    "FUND3LEI,LEI,MGR2LEI,IS_FUND-MANAGED_BY,INACTIVE",
    "FUND4LEI,LEI,MGR1LEI,IS_FUND-MANAGED_BY,ACTIVE",
  ].join("\r\n");
  const pairs = parseRrCsv(rrCsv);
  check(pairs.length === 2, `only ACTIVE IS_FUND-MANAGED_BY rows kept (got ${pairs.length})`);
  check(
    pairs[0]?.fundLei === "FUND1LEI" && pairs[0]?.managerLei === "MGR1LEI",
    "start node = fund, end node = manager",
  );

  console.log("\n— zip extraction (golden-copy shaped) —");
  const zipped = makeZip("test-golden-copy.csv", rrCsv);
  const unzipped = unzipFirstMatch(zipped, ".csv");
  check(unzipped.name === "test-golden-copy.csv", "entry located by extension");
  check(unzipped.data.toString("utf8") === rrCsv, "deflate round-trip is byte-faithful");

  console.log("\n— cap split —");
  const quotas = splitCap(10, ["A", "B", "C"]);
  check(quotas.get("A") === 4 && quotas.get("B") === 3 && quotas.get("C") === 3, "remainder to the front");

  console.log("\n— CSSF AIFM file parse —");
  const cssfText = [
    "A\tNNNNNNNN\tAIFM_NAME\tSTATUS\tF\tMMMMMMMM\tAIF_NAME\tCCCCCCCC\tAIF_SUBFUND_NAME\tSTART",
    "-\t--------\t---------\t------\t-\t--------\t--------\t--------\t----------------\t-----",
    "A\t00000001\tQUINT:ESSENCE CAPITAL S.A.\tREG\tO\t00006535\tQUINT:ESSENCE CONCEPT\t00000001\tA6\t2013-07-29",
    "A\t00000001\tQUINT:ESSENCE CAPITAL S.A.\tREG\tO\t00006535\tQUINT:ESSENCE CONCEPT\t00000002\tA 12\t2013-07-29",
    "A\t00000002\tOTHER MANAGER S.A.\tAUT\tO\t00007000\tOTHER FUND FCP\t00000001\tMain\t2020-01-01",
  ].join("\n");
  const cssf = parseCssfAifm(cssfText, 100);
  check(cssf.rows.length === 4, `2 AIFMs + 2 AIFs deduped from 3 data rows (got ${cssf.rows.length})`);
  check(cssf.rows[0]?.registryId === "CSSF:A00000001", "AIFM registryId namespaced");
  check(cssf.rows.every((r) => r.country === "LU"), "all rows LU");
  check(
    (cssf.managesByRegistryId?.length ?? 0) === 3 &&
      cssf.managesByRegistryId?.[0]?.managerKey === "CSSF:A00000001" &&
      cssf.managesByRegistryId?.[0]?.fundKey === "CSSF:F00006535",
    "manages links AIFM → AIF",
  );
  const cssfCapped = parseCssfAifm(cssfText, 2);
  check(cssfCapped.rows.length === 2, "cap respected");

  console.log("\n— AMF CSV parse —");
  const amfCsv = [
    '"no_amf";"entite_nom";"forme_juridique";"pays_siege";"site_internet";"telephone";"siret";"no_registre_national";"lei";"date_debut_autorisation";"nature_autorisation";"statut";"libelle_type_activite";"libelle_activite";"libelle_sous_activite";"date_de_publication"',
    '"GP-1";"ALPHA GESTION";"SAS";"FR";"www.alpha.fr";"";"";"";"969500TESTLEI0000001";"2015-01-01";"agrément";"Vivant";"x";"y";"";"2026-07-20"',
    '"GP-1";"ALPHA GESTION";"SAS";"FR";"www.alpha.fr";"";"";"";"969500TESTLEI0000001";"2015-01-01";"agrément";"Vivant";"x";"z";"";"2026-07-20"',
    '"GP-2";"BETA CAPITAL";"SA";"FR";"";"";"";"";"";"2010-01-01";"agrément";"Retiré";"x";"y";"";"2026-07-20"',
    '"GP-3";"GAMMA PARTNERS";"SA";"FR";"";"";"";"";"";"2012-01-01";"agrément";"Vivant";"x";"y";"";"2026-07-20"',
  ].join("\n");
  const amf = parseAmfCsv(amfCsv, 100);
  check(amf.length === 2, `dedupe by no_amf + statut Vivant filter (got ${amf.length})`);
  check(amf[0]?.registryId === "969500TESTLEI0000001", "LEI preferred as registryId");
  check(amf[0]?.tags.includes("lei") === true, "lei tag when LEI present");
  check(amf[0]?.website === "https://www.alpha.fr", "website normalized to https");
  check(amf[1]?.registryId === "AMF:GP-3", "AMF number fallback key");

  console.log("\n— Bank of Lithuania CSV parse —");
  const lbCsv = [
    "Title;Type;Business form;Company code;Registration code;Licence type/kind;Authorization code;valid from;valid till",
    "UAB Test Asset Management;Management company;Private limited company;123456789;N/A;;;;",
    "FOREIGN INSURER SE;Insurer;Insurance undertakings of other EU Member States providing services without a branch;;N/A;;;;",
    "AB Test Bankas;Bank;Public limited company;987654321;N/A;;;;",
    "UAB Random Consulting;Consulting;Private limited company;111;N/A;;;;",
  ].join("\n");
  const lb = parseLbCsv(lbCsv);
  check(lb.length === 2, `type filter + passporting exclusion (got ${lb.length})`);
  check(lb[0]?.registryId === "LB:123456789", "company code key");

  console.log("\n— NBS selection —");
  check(nbsCityFromAddress("Dvořákovo nábrežie 4, 81102 Bratislava") === "Bratislava", "city from address");
  const nbsRows = nbsSelectRows(
    [
      { id: "1", name: "Test Správcovská", address: "X, 81102 Bratislava", country: "SK", licenses: [{ scope: "správcovská spoločnosť" }] },
      { id: "2", name: "Foreign Bank", address: "Y", country: "DE", licenses: [{ scope: "banka" }] },
      { id: "3", name: "Agent Only", address: "Z", country: "SK", licenses: [{ scope: "samostatný finančný agent" }] },
      { id: "4", name: "Test Banka", address: "W, 01001 Žilina", country: "SK", licenses: [{ scope: "banka, úverová inštitúcia" }] },
    ],
    10,
  );
  check(nbsRows.length === 2, `SK-only, agent-excluded, scope-matched (got ${nbsRows.length})`);
  check(nbsRows[0]?.name === "Test Správcovská", "asset managers ranked before banks");

  console.log("\n— LEI deterministic key + idempotency (real DB round trip) —");
  const lei = "VERIFYLEI00000000001";
  // Clean any leftover from a previous run.
  const leftover = await db
    .select({ entityId: organizations.entityId })
    .from(organizations)
    .where(eq(organizations.registryId, lei));
  const leftoverIds = leftover.map((r) => r.entityId).filter((x): x is string => x !== null);
  if (leftoverIds.length > 0) {
    await db.delete(organizations).where(inArray(organizations.entityId, leftoverIds));
    await db.delete(entityTags).where(inArray(entityTags.entityId, leftoverIds));
    await db.delete(aliases).where(inArray(aliases.entityId, leftoverIds));
    await db.delete(entities).where(inArray(entities.id, leftoverIds));
  }

  const importer1 = new RegisterImporter();
  await importer1.init();
  const row = gleifRecordToRow(
    gleifRecord({ lei, name: "Verify Harvest Fund SICAV-RAIF", city: "Luxembourg" }),
    { requireCategory: "FUND" },
  )!;
  const first = await importer1.importRow(row);
  await importer1.flush();
  check(first.outcome === "created", `first import creates (got ${first.outcome})`);
  const createdId = importer1.entityIdFor(lei);
  check(createdId !== undefined, "registryId map knows the new LEI");

  const createdEntity = (
    await db.select().from(entities).where(eq(entities.id, createdId!))
  )[0];
  check(createdEntity?.status === "active", "register-grade row activated directly");

  const second = await importer1.importRow(row);
  check(second.outcome === "merged_registry", "same-run re-import is idempotent (LEI key)");

  const importer2 = new RegisterImporter();
  await importer2.init();
  const third = await importer2.importRow(row);
  check(
    third.outcome === "merged_registry" && third.entityId === createdId,
    "fresh importer resolves deterministically via LEI, skipping fuzzy",
  );

  // Same name, DIFFERENT LEI → must not merge (distinct register identities).
  const otherLei = "VERIFYLEI00000000002";
  const rowOther = { ...row, registryId: otherLei };
  const fourth = await importer2.importRow(rowOther);
  await importer2.flush();
  check(fourth.outcome === "created", "same name + different LEI creates a separate entity");
  const otherId = importer2.entityIdFor(otherLei);
  check(otherId !== undefined && otherId !== createdId, "distinct entity ids");

  // Cleanup.
  const cleanupIds = [createdId, otherId].filter((x): x is string => x !== undefined);
  await db.delete(organizations).where(inArray(organizations.entityId, cleanupIds));
  await db.delete(entityTags).where(inArray(entityTags.entityId, cleanupIds));
  await db.delete(aliases).where(inArray(aliases.entityId, cleanupIds));
  await db.delete(entities).where(inArray(entities.id, cleanupIds));

  if (failures > 0) {
    console.error(`\nverify-gleif: FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nverify-gleif: PASS — harvest parsing, keys, and idempotency green");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
