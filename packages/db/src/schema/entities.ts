import { char, customType, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const geographyPoint = customType<{ data: string }>({
  dataType() {
    return "geography(Point,4326)";
  },
});

export const entityKind = pgEnum("entity_kind", [
  "organization",
  "person",
  "fund_vehicle",
  "deal",
  "asset",
  "event",
]);

export const entities = pgTable("entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: entityKind("kind").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  country: char("country", { length: 2 }),
  geo: geographyPoint("geo"),
  status: text("status").default("active"),
  summary: text("summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
