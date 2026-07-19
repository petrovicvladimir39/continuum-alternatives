export const PIPELINE_PACKAGE = "placeholder";

export { inngest } from "./inngest";
export { fetchSource, type FetchSourceResult } from "./fetch";
export { sendAlert } from "./alert";
export { ingestHourly, ingestSource } from "./functions/ingest-hourly";

import { ingestHourly, ingestSource } from "./functions/ingest-hourly";

/** Every pipeline function, for the Next.js serve route. */
export const functions = [ingestHourly, ingestSource];
