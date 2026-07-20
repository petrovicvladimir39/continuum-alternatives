import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-ground">
      <div className="mx-auto flex h-[52px] max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="font-serif text-[18px] font-medium text-ink">Continuum</span>
          <span className="text-[15px] text-ink-secondary">Alternatives</span>
        </Link>
        <nav>
          <Link href="/digest" className="text-[13px] text-ink-secondary hover:text-accent">
            Digest
          </Link>
        </nav>
      </div>
    </header>
  );
}
