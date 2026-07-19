import "./env";
import { db, documents, like } from "@continuum/db";
import { processDocumentFile, terminateOcrWorkers } from "./extract-text";
import { parseAlsuProdaje, parseAlsuStecajevi } from "./registries";
import { existingCaseRefs } from "./registry";

let failures = 0;

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`ok    ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${message}`);
  }
}

// Captured verbatim from https://alsu.gov.rs/ci/stecajni-postupak/stecajevi/ (2026-07-20).
const STECAJEVI_FIXTURE = `<div class="results"><a href="https://alsu.gov.rs/ci/stecajni-postupak/page/9269" class="ste-item-link"><div class="ste-item"><span class="post_in_category_date">Датум отварања: 07.07.2026</span><h3>AB CORSA</h3><span class="info_title">Суд:</span>&nbsp;Привредни суд у Београду</br><span class="info_title">Број судског решења:</span>&nbsp;11.Ст.112/2026</br><span class="info_title">Стечајни управник:</span>&nbsp;Игор Ивановић</br><span class="info_title">Општина:</span>&nbsp;Београд-Нови Београд</br><span class="info_title">Град:</span>&nbsp;Београд</br><span class="info_title">Матични број:</span>&nbsp;21727571</br><span class="info_title">Статус стечајног поступка:</span>&nbsp;У току</br></div></a>
<a href="https://alsu.gov.rs/ci/stecajni-postupak/page/9256" class="ste-item-link"><div class="ste-item"><span class="post_in_category_date">Датум отварања: 03.07.2026</span><h3>NEKTON</h3><span class="info_title">Суд:</span>&nbsp;Привредни суд у Новом Саду</br><span class="info_title">Број судског решења:</span>&nbsp;3. Ст. 52/2026</br><span class="info_title">Стечајни управник:</span>&nbsp;Ивица Августинов</br><span class="info_title">Општина:</span>&nbsp;Нови Сад - град</br><span class="info_title">Град:</span>&nbsp;Нови Сад</br><span class="info_title">Матични број:</span>&nbsp;20892668</br><span class="info_title">Статус стечајног поступка:</span>&nbsp;У току</br></div></a></div>`;

// Captured verbatim from https://alsu.gov.rs/ci/stecajni-postupak/oglasi-prodaje/ (2026-07-20).
const PRODAJE_FIXTURE = `<div class="oglasi-grid"><article class="oglas-card status-aktivna"><a href="https://alsu.gov.rs/ci/stecajni-postupak/oglasi-prodaje/oglas/page/13002" class="full-link"></a><div class="oglas-datumi"><span class="sale-date">14.08.2026</span><span class="pub-date">Објављено: 10.07.2026</span></div><h4>MARK-TRADE-CO</h4><span class="info_title">Матични број:</span>&nbsp;08736901<br><span class="info_title">Метод продаје:</span>&nbsp;Јавно прикупљање понуда<br><span class="info_title">Место:</span>&nbsp;Нови Сад<br><span class="info_title">Процењена вредност:</span>&nbsp;11.886.957,64<br><span class="info_title">Статус продаје:</span> Активна</article><article class="oglas-card status-druga"><a href="https://alsu.gov.rs/ci/stecajni-postupak/oglasi-prodaje/oglas/page/12996" class="full-link"></a><div class="oglas-datumi"><span class="sale-date">24.07.2026</span><span class="pub-date">Објављено: 22.06.2026</span></div><h4>WELTEX</h4><span class="info_title">Матични број:</span>&nbsp;<br><span class="info_title">Метод продаје:</span>&nbsp;Непосредна погодба<br><span class="info_title">Место:</span>&nbsp;Чачак<br><span class="info_title">Вредност:</span>&nbsp;87.638.500,00<br><span class="info_title">Статус продаје:</span> Отказана</article></div>`;

// 240x60 white PNG with "TEST 123" in black Arial bold (generated fixture).
const OCR_PNG_BASE64 =
  "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";

function buildMinimalPdf(text: string): Buffer {
  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objects[3] =
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>";
  const stream = `BT /F1 18 Tf 40 700 Td (${text}) Tj ET`;
  objects[4] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i <= 5; i += 1) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefPos = pdf.length;
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

async function cleanup() {
  await db.delete(documents).where(like(documents.url, "https://cli-test.invalid/%"));
}

async function main() {
  console.log("— ALSU parsers (fixtures captured from live probes) —");
  const cases = parseAlsuStecajevi(STECAJEVI_FIXTURE);
  check(cases.length === 2, `stecajevi: 2 rows parsed (got ${cases.length})`);
  check(cases[0]?.title === "AB CORSA", "stecajevi: debtor name as title");
  check(
    cases[0]?.meta.caseRef === "11.Ст.112/2026",
    `stecajevi: caseRef (${cases[0]?.meta.caseRef})`,
  );
  check(cases[0]?.meta.court === "Привредни суд у Београду", "stecajevi: court captured raw");
  check(cases[0]?.meta.registryId === "21727571", "stecajevi: matični broj captured");
  check(cases[0]?.meta.openedOn === "07.07.2026", "stecajevi: opening date raw string");
  check(cases[0]?.meta.administrator === "Игор Ивановић", "stecajevi: administrator captured");
  check(cases[0]?.meta.status === "У току", "stecajevi: status captured");
  check(
    cases[1]?.meta.caseRef === "3. Ст. 52/2026",
    "stecajevi: caseRef with spaces kept verbatim",
  );
  check(
    cases[1]?.url === "https://alsu.gov.rs/ci/stecajni-postupak/page/9256",
    "stecajevi: detail url extracted",
  );

  const sales = parseAlsuProdaje(PRODAJE_FIXTURE);
  check(sales.length === 2, `prodaje: 2 cards parsed (got ${sales.length})`);
  check(sales[0]?.title === "MARK-TRADE-CO", "prodaje: debtor name as title");
  check(sales[0]?.meta.saleDate === "14.08.2026", "prodaje: sale date captured");
  check(sales[0]?.meta.publishedOn === "10.07.2026", "prodaje: publication date captured");
  check(sales[0]?.meta.saleMethod === "Јавно прикупљање понуда", "prodaje: sale method raw");
  check(sales[0]?.meta.estimatedValue === "11.886.957,64", "prodaje: estimated value raw string");
  check(sales[1]?.meta.value === "87.638.500,00", "prodaje: value raw string");
  check(sales[1]?.meta.saleStatus === "Отказана", "prodaje: cancelled status captured");
  check(sales[1]?.meta.registryId === undefined, "prodaje: empty matični broj omitted");

  console.log("\n— PDF text extraction (unpdf) —");
  const pdfText = "Continuum registry verification fixture with a proper text layer 12345";
  const pdf = buildMinimalPdf(pdfText);
  const extracted = await processDocumentFile(pdf, "application/pdf");
  check(extracted.extraction === "pdf-text", `pdf: extraction=pdf-text (${extracted.extraction})`);
  check(
    extracted.text.includes("Continuum registry verification") && extracted.text.includes("12345"),
    `pdf: text layer extracted ("${extracted.text.slice(0, 60)}…")`,
  );

  const scanned = buildMinimalPdf("x");
  const scannedResult = await processDocumentFile(scanned, "application/pdf");
  check(
    scannedResult.extraction === "needs-ocr" && scannedResult.text === "",
    "pdf: <50 chars marks needs-ocr with empty text (rasterization BACKLOG)",
  );

  console.log("\n— image OCR (tesseract.js) —");
  const png = Buffer.from(OCR_PNG_BASE64, "base64");
  const ocr = await processDocumentFile(png, "image/png", "eng");
  await terminateOcrWorkers();
  check(ocr.extraction === "ocr", "png: extraction=ocr");
  check(
    ocr.text.includes("TEST") && ocr.text.includes("123"),
    `png: OCR read the fixture text (got "${ocr.text}")`,
  );

  console.log("\n— caseRef dedup —");
  await cleanup();
  await db.insert(documents).values({
    url: "https://cli-test.invalid/filing/1",
    title: "cli-test filing",
    docType: "filing",
    fetchedAt: new Date(),
    meta: { caseRef: "99.Ст.999/2026", debtorName: "CLI TEST DEBTOR" },
  });
  const known = await existingCaseRefs(["99.Ст.999/2026", "1.Ст.1/2026"]);
  check(known.has("99.Ст.999/2026"), "dedup: stored caseRef detected as existing");
  check(!known.has("1.Ст.1/2026"), "dedup: unseen caseRef stays fresh");
  await cleanup();

  if (failures > 0) {
    console.error(`\nverify-registry: ${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nverify-registry: PASS — registry + extraction checks green");
}

main().catch(async (error) => {
  await terminateOcrWorkers();
  console.error(error);
  process.exit(1);
});
