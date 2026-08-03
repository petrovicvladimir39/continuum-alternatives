import { redirect } from "next/navigation";

/** Products index → the screener (nav mirrors this). */
export default function ProductsIndexPage() {
  redirect("/v2/products/company-intelligence");
}
