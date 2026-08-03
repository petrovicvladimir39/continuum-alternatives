import type { Metadata } from "next";
import { NplSimulator } from "@/components/v2/products/npl-simulator";

export const metadata: Metadata = { title: "NPL Simulator — Products" };

export default function NplSimulatorPage() {
  return <NplSimulator />;
}
