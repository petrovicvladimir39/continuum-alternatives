import { asc, eq } from "drizzle-orm";
import { db } from "../client";
import { timelineFacts } from "../schema";
import { requireEntityBySlug } from "./entities";
import type { ReviewStatusName } from "./edges";

export type TimelineFactRow = typeof timelineFacts.$inferSelect;

export async function addFact(input: {
  entitySlug: string;
  factType: string;
  occurredOn: string;
  title: string;
  body?: string;
  channels?: string[];
  confidence?: string;
  status?: ReviewStatusName;
}): Promise<string> {
  const entity = await requireEntityBySlug(input.entitySlug);
  const inserted = await db
    .insert(timelineFacts)
    .values({
      entityId: entity.id,
      factType: input.factType,
      occurredOn: input.occurredOn,
      title: input.title,
      body: input.body ?? null,
      audienceChannels: input.channels ?? [],
      confidence: input.confidence ?? "1.00",
      status: input.status ?? "approved",
    })
    .returning({ id: timelineFacts.id });
  const row = inserted[0];
  if (!row) {
    throw new Error("Timeline fact insert returned no row");
  }
  return row.id;
}

export async function getTimeline(slug: string): Promise<TimelineFactRow[]> {
  const entity = await requireEntityBySlug(slug);
  return db
    .select()
    .from(timelineFacts)
    .where(eq(timelineFacts.entityId, entity.id))
    .orderBy(asc(timelineFacts.occurredOn), asc(timelineFacts.recordedAt));
}
