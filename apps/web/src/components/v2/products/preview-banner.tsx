/**
 * HONESTY GATE — PREVIEW products (term-intelligence, benchmarks, ESG)
 * have no backend. Every such page carries this banner so nothing implies
 * live data at cutover.
 */
export function PreviewBanner({ product }: { product: string }) {
  return (
    <div className="border border-dashed border-line-strong px-4 py-2.5">
      <span className="type-mono text-ink-secondary">
        PREVIEW · {product.toUpperCase()} — PROTOTYPE, DATA LAYER IN DEVELOPMENT. NUMBERS BELOW ARE
        ILLUSTRATIVE FIXTURES, NOT THE RECORD.
      </span>
    </div>
  );
}
