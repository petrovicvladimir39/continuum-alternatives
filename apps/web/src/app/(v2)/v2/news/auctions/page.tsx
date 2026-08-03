import type { Metadata } from "next";
import { MOCK_AUCTIONS } from "@continuum/shared";
import { FilteredFeed } from "@/components/v2/news/filtered-feed";
import { fmtDate } from "@/lib/v2/format";

export const metadata: Metadata = { title: "Auctions — News" };

const STATUS_LABEL: Record<string, string> = {
  live: "LIVE",
  second_round: "2ND ROUND",
  closing: "CLOSING",
};

export default function AuctionsPage() {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-6">
      <h1 className="type-h1">Auctions</h1>
      <p className="type-small mt-1 text-ink-secondary">
        Live NPL portfolio sales and distressed processes across the map. Deadlines are
        provenance-backed from process letters and gazettes.
      </p>

      <table className="mt-5 w-full border-collapse border border-line">
        <thead>
          <tr className="border-b border-line-strong bg-surface text-left">
            <th className="type-label px-3 py-2 font-medium">Process</th>
            <th className="type-label px-3 py-2 font-medium">Seller</th>
            <th className="type-label px-3 py-2 font-medium">Type</th>
            <th className="type-label px-3 py-2 text-right font-medium">Size</th>
            <th className="type-label px-3 py-2 text-right font-medium">Bid deadline</th>
            <th className="type-label px-3 py-2 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_AUCTIONS.map((a) => (
            <tr key={a.id} className="border-b border-line bg-surface transition-colors last:border-b-0 hover:bg-muted/50">
              <td className="type-body px-3 py-2.5">{a.title}</td>
              <td className="type-small px-3 py-2.5 text-ink-secondary">{a.seller}</td>
              <td className="type-small px-3 py-2.5 text-ink-secondary">
                {a.assetType} · {a.country}
              </td>
              <td className="type-data px-3 py-2.5 text-right">{a.sizeText}</td>
              <td className="type-data px-3 py-2.5 text-right">{fmtDate(a.deadline)}</td>
              <td className="type-mono px-3 py-2.5 text-right text-ink-muted">{STATUS_LABEL[a.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="type-label mt-8 border-b border-line pb-2">Auction signals</h2>
      <div className="mt-4">
        <FilteredFeed factTypes={["auction_update", "npl_sale"]} />
      </div>
    </div>
  );
}
