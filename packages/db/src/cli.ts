import "./env";
import { CHANNELS } from "@continuum/shared";
import { Command } from "commander";
import { edgeType, entityKind } from "./schema";
import { createEdge, listEdges, type EdgeTypeName } from "./repo/edges";
import { createEntity, findEntities, getBySlug, type EntityKind } from "./repo/entities";
import { findPath } from "./repo/graph";
import { addFact, getTimeline } from "./repo/timeline";

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function act<A extends unknown[]>(
  fn: (...args: A) => Promise<void>,
): (...args: A) => Promise<void> {
  return async (...args: A) => {
    try {
      await fn(...args);
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    }
  };
}

function printTable(headers: string[], rows: string[][]) {
  const widths = headers.map((header, i) =>
    Math.max(header.length, ...rows.map((row) => (row[i] ?? "").length)),
  );
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i] ?? 0)).join("  ");
  console.log(line(headers));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const row of rows) {
    console.log(line(row));
  }
}

function parseKind(value: string): EntityKind {
  if (!(entityKind.enumValues as readonly string[]).includes(value)) {
    fail(`invalid --kind "${value}"; valid kinds: ${entityKind.enumValues.join(", ")}`);
  }
  return value as EntityKind;
}

function parseEdgeType(value: string): EdgeTypeName {
  if (!(edgeType.enumValues as readonly string[]).includes(value)) {
    fail(`invalid --type "${value}"; valid edge types: ${edgeType.enumValues.join(", ")}`);
  }
  return value as EdgeTypeName;
}

function parseChannels(value: string | undefined): string[] {
  if (value === undefined) {
    return [];
  }
  const channels = value
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  for (const channel of channels) {
    if (!(CHANNELS as readonly string[]).includes(channel)) {
      fail(`invalid channel "${channel}"; valid channels: ${CHANNELS.join(", ")}`);
    }
  }
  return channels;
}

function parseDate(value: string, flag: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(`invalid ${flag} "${value}"; expected YYYY-MM-DD`);
  }
  return value;
}

const program = new Command();
program.name("continuum-db").description("Continuum Alternatives data CLI");

program
  .command("entity:add")
  .requiredOption("--kind <kind>")
  .requiredOption("--name <name>")
  .option("--country <code>")
  .option("--tags <tags>", "comma-separated tags")
  .option("--summary <text>")
  .action(
    act(
      async (opts: {
        kind: string;
        name: string;
        country?: string;
        tags?: string;
        summary?: string;
      }) => {
        const entity = await createEntity({
          kind: parseKind(opts.kind),
          name: opts.name,
          ...(opts.country !== undefined ? { country: opts.country } : {}),
          ...(opts.tags !== undefined
            ? {
                tags: opts.tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              }
            : {}),
          ...(opts.summary !== undefined ? { summary: opts.summary } : {}),
        });
        console.log(`created ${entity.kind} "${entity.name}" with slug ${entity.slug}`);
      },
    ),
  );

program
  .command("entity:find")
  .argument("<query>")
  .action(
    act(async (query: string) => {
      const hits = await findEntities(query);
      if (hits.length === 0) {
        console.log("no entities found");
        return;
      }
      printTable(
        ["slug", "kind", "name", "country", "tags"],
        hits.map((hit) => [hit.slug, hit.kind, hit.name, hit.country ?? "", hit.tags.join(",")]),
      );
    }),
  );

program
  .command("entity:show")
  .argument("<slug>")
  .action(
    act(async (slug: string) => {
      const found = await getBySlug(slug);
      if (!found) {
        fail(`no entity with slug "${slug}"`);
      }
      const relations = await listEdges(slug, "both");
      const { entity, detail, tags } = found;
      printTable(
        ["field", "value"],
        [
          ["slug", entity.slug],
          ["kind", entity.kind],
          ["name", entity.name],
          ["country", entity.country ?? ""],
          ["status", entity.status ?? ""],
          ["summary", entity.summary ?? ""],
          ["tags", tags.join(",")],
          ["edges", String(relations.length)],
        ],
      );
      if (detail) {
        console.log("");
        printTable(
          ["detail field", "value"],
          Object.entries(detail)
            .filter(([key]) => key !== "entityId")
            .map(([key, value]) => [key, value === null ? "" : String(value)]),
        );
      }
    }),
  );

program
  .command("edge:add")
  .requiredOption("--type <edge_type>")
  .requiredOption("--source <slug>")
  .requiredOption("--target <slug>")
  .option("--deal <slug>")
  .option("--role <role>")
  .option("--date <date>", "started_on, YYYY-MM-DD")
  .option("--amount <amount>")
  .option("--currency <code>")
  .action(
    act(
      async (opts: {
        type: string;
        source: string;
        target: string;
        deal?: string;
        role?: string;
        date?: string;
        amount?: string;
        currency?: string;
      }) => {
        const id = await createEdge({
          edgeType: parseEdgeType(opts.type),
          sourceSlug: opts.source,
          targetSlug: opts.target,
          ...(opts.deal !== undefined ? { dealSlug: opts.deal } : {}),
          ...(opts.role !== undefined ? { role: opts.role } : {}),
          ...(opts.date !== undefined ? { startedOn: parseDate(opts.date, "--date") } : {}),
          ...(opts.amount !== undefined ? { amount: opts.amount } : {}),
          ...(opts.currency !== undefined ? { currency: opts.currency } : {}),
        });
        console.log(`created edge ${opts.source} -[${opts.type}]-> ${opts.target} (${id})`);
      },
    ),
  );

program
  .command("fact:add")
  .requiredOption("--entity <slug>")
  .requiredOption("--type <fact_type>")
  .requiredOption("--date <date>", "occurred_on, YYYY-MM-DD")
  .requiredOption("--title <title>")
  .option("--body <body>")
  .option("--channels <channels>", "comma-separated audience channels")
  .action(
    act(
      async (opts: {
        entity: string;
        type: string;
        date: string;
        title: string;
        body?: string;
        channels?: string;
      }) => {
        const id = await addFact({
          entitySlug: opts.entity,
          factType: opts.type,
          occurredOn: parseDate(opts.date, "--date"),
          title: opts.title,
          ...(opts.body !== undefined ? { body: opts.body } : {}),
          channels: parseChannels(opts.channels),
        });
        console.log(`recorded fact "${opts.title}" on ${opts.entity} (${id})`);
      },
    ),
  );

program
  .command("timeline:show")
  .argument("<slug>")
  .action(
    act(async (slug: string) => {
      const facts = await getTimeline(slug);
      if (facts.length === 0) {
        console.log("no timeline facts");
        return;
      }
      printTable(
        ["date", "type", "title", "channels", "status"],
        facts.map((fact) => [
          fact.occurredOn,
          fact.factType,
          fact.title,
          fact.audienceChannels.join(","),
          fact.status ?? "",
        ]),
      );
    }),
  );

program
  .command("graph:path")
  .argument("<slugA>")
  .argument("<slugB>")
  .option("--max-hops <n>", "maximum hops", "4")
  .action(
    act(async (slugA: string, slugB: string, opts: { maxHops: string }) => {
      const maxHops = Number.parseInt(opts.maxHops, 10);
      if (Number.isNaN(maxHops) || maxHops < 1) {
        fail(`invalid --max-hops "${opts.maxHops}"; expected a positive integer`);
      }
      const path = await findPath(slugA, slugB, maxHops);
      if (!path) {
        console.log(`no path from ${slugA} to ${slugB} within ${maxHops} hops`);
        return;
      }
      const parts: string[] = [];
      path.nodes.forEach((node, i) => {
        if (i > 0) {
          const step = path.steps[i - 1];
          parts.push(step?.direction === "<-" ? `<-[${step.edgeType}]-` : `-[${step?.edgeType}]->`);
        }
        parts.push(node.name);
      });
      console.log(`${path.hops} hop${path.hops === 1 ? "" : "s"}: ${parts.join(" ")}`);
    }),
  );

program.parseAsync(process.argv).catch((err: unknown) => {
  fail(err instanceof Error ? err.message : String(err));
});
