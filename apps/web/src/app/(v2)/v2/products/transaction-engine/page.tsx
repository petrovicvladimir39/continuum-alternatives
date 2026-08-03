import type { Metadata } from "next";
import { TransactionEngine } from "@/components/v2/products/transaction-engine";

export const metadata: Metadata = { title: "Transaction Engine — Products" };

export default function TransactionEnginePage() {
  return <TransactionEngine />;
}
