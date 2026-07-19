import { assetType, dealType, eventFormat, type EntityKind } from "@continuum/db";

export type DetailFieldDef = {
  key: string;
  label: string;
  input: "text" | "int" | "date" | "datetime" | "select";
  options?: readonly string[];
  hint?: string;
};

export const DETAIL_FIELDS: Record<EntityKind, DetailFieldDef[]> = {
  organization: [
    { key: "legalName", label: "Legal name", input: "text" },
    { key: "registryId", label: "Registry ID", input: "text" },
    { key: "taxId", label: "Tax ID", input: "text" },
    { key: "hqCity", label: "HQ city", input: "text" },
    { key: "foundedYear", label: "Founded year", input: "int" },
    { key: "website", label: "Website", input: "text" },
    { key: "employeeRange", label: "Employee range", input: "text" },
  ],
  person: [
    { key: "displayName", label: "Display name", input: "text", hint: "defaults to entity name" },
    { key: "roleTitle", label: "Role title", input: "text" },
    { key: "linkedinUrl", label: "LinkedIn URL", input: "text" },
  ],
  fund_vehicle: [
    { key: "managerSlug", label: "Manager (entity slug)", input: "text" },
    { key: "vintageYear", label: "Vintage year", input: "int" },
    { key: "targetSize", label: "Target size", input: "text" },
    { key: "currency", label: "Currency", input: "text" },
    { key: "strategy", label: "Strategy", input: "text" },
    { key: "status", label: "Status", input: "text" },
  ],
  deal: [
    { key: "dealType", label: "Deal type", input: "select", options: dealType.enumValues },
    { key: "announcedOn", label: "Announced on", input: "date" },
    { key: "amount", label: "Amount", input: "text" },
    { key: "currency", label: "Currency", input: "text" },
    { key: "dealStatus", label: "Deal status", input: "text" },
  ],
  asset: [
    { key: "assetType", label: "Asset type", input: "select", options: assetType.enumValues },
    { key: "nominalValue", label: "Nominal value", input: "text" },
    { key: "currency", label: "Currency", input: "text" },
  ],
  event: [
    { key: "eventFormat", label: "Format", input: "select", options: eventFormat.enumValues },
    { key: "startsAt", label: "Starts at", input: "datetime" },
    { key: "endsAt", label: "Ends at", input: "datetime" },
    { key: "venue", label: "Venue", input: "text" },
    { key: "city", label: "City", input: "text" },
    { key: "eventUrl", label: "Event URL", input: "text" },
  ],
};
