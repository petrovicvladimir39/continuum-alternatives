import { alsuProdajeHandler, alsuStecajeviHandler } from "./alsu";
import type { RegistryHandler } from "./types";

export const REGISTRY_HANDLERS: Record<string, RegistryHandler> = {
  "alsu-stecajevi": alsuStecajeviHandler,
  "alsu-prodaje": alsuProdajeHandler,
};

export type { RegistryHandler, RegistryItem } from "./types";
export { parseAlsuProdaje, parseAlsuStecajevi } from "./alsu";
