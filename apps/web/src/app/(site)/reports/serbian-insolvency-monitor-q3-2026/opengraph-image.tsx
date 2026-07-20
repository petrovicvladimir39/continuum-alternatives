import { OG_SIZE, ogReportImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Serbian Insolvency Monitor — Continuum report";

export default async function OpengraphImage() {
  return ogReportImage({ title: "Serbian Insolvency Monitor", date: "Q3 2026" });
}
