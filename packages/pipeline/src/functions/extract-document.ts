import { extractDocument } from "../extraction/extract";
import { inngest } from "../inngest";

/**
 * Extraction on stored documents, event-driven. The throttle is the batch
 * guard: scheduled extraction processes at most 20 documents per hour;
 * excess events queue and drain in later windows.
 */
export const extractDocumentFn = inngest.createFunction(
  {
    id: "extract-document",
    throttle: { limit: 20, period: "1h" },
  },
  { event: "document/stored" },
  async ({ event, step }) => {
    const documentId = String(event.data.documentId);
    return step.run("extract", () => extractDocument(documentId));
  },
);
