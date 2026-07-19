import { tmpdir } from "node:os";
import path from "node:path";
import { extractText } from "unpdf";
import { createWorker, type Worker } from "tesseract.js";
import { CONTENT_TEXT_CAP } from "./crawl-shared";

export type ExtractedDocument = {
  text: string;
  extraction: "pdf-text" | "ocr" | "needs-ocr";
};

// One worker per language set, reused across a run; terminate at run end.
const workers = new Map<string, Worker>();

async function getOcrWorker(langs: string): Promise<Worker> {
  const existing = workers.get(langs);
  if (existing) {
    return existing;
  }
  const worker = await createWorker(langs.split("+"), undefined, {
    cachePath: path.join(tmpdir(), "continuum-tesseract"),
  });
  workers.set(langs, worker);
  return worker;
}

export async function terminateOcrWorkers(): Promise<void> {
  for (const [key, worker] of workers) {
    workers.delete(key);
    await worker.terminate();
  }
}

/**
 * Extracts text from a fetched binary. Text-layer PDFs go through unpdf;
 * PDFs with fewer than 50 chars of text are image-only scans — rasterization
 * is BACKLOG, so they store empty text flagged needs-ocr. Standalone images
 * are OCRed with tesseract.js.
 */
export async function processDocumentFile(
  buffer: Buffer,
  mime: string,
  ocrLangs = "srp+srp_latn+eng",
): Promise<ExtractedDocument> {
  if (mime === "application/pdf") {
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
    const merged = text.replace(/\s+/g, " ").trim();
    if (merged.length < 50) {
      // BACKLOG: rasterize scanned PDFs and OCR the page images.
      return { text: "", extraction: "needs-ocr" };
    }
    return { text: merged.slice(0, CONTENT_TEXT_CAP), extraction: "pdf-text" };
  }
  if (mime === "image/png" || mime === "image/jpeg") {
    const worker = await getOcrWorker(ocrLangs);
    const result = await worker.recognize(buffer);
    return {
      text: result.data.text.replace(/\s+/g, " ").trim().slice(0, CONTENT_TEXT_CAP),
      extraction: "ocr",
    };
  }
  throw new Error(`Unsupported mime type for extraction: ${mime}`);
}
