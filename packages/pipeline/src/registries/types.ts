import type { sources } from "@continuum/db";

export type RegistryItem = {
  url: string;
  title: string;
  publishedAt?: string;
  meta: Record<string, string>;
};

export type RegistryHandler = (
  source: typeof sources.$inferSelect,
) => Promise<{ items: RegistryItem[] }>;
