import Link from "next/link";
import { LandingLogo } from "./logo";

/** Aceternity template footer, ported faithfully — four link columns. */

const COLUMNS: { title: string; links: { title: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { title: "Terminal", href: "/v2" },
      { title: "News", href: "/v2/news" },
      { title: "Universe", href: "/v2/universe" },
      { title: "Reports", href: "/v2/reports" },
      { title: "Products", href: "/v2/products" },
    ],
  },
  {
    title: "Company",
    links: [
      { title: "About", href: "/v2/about" },
      { title: "Coverage", href: "/v2/coverage" },
      { title: "Solutions", href: "/v2/solutions/deal-sourcing" },
      { title: "Workspace", href: "/v2/workspace" },
    ],
  },
  {
    title: "Legal",
    links: [
      { title: "Methodology", href: "/methodology" },
      { title: "Community guidelines", href: "/community-guidelines" },
      { title: "Docs", href: "/docs" },
    ],
  },
  {
    title: "Access",
    links: [
      { title: "Log in", href: "/v2/workspace" },
      { title: "Pricing", href: "/#pricing" },
      { title: "Subscribe", href: "/subscribe" },
    ],
  },
];

export function LandingFooter() {
  return (
    <div className="relative w-full overflow-hidden border-t border-neutral-100 bg-white px-8 py-20 dark:border-white/[0.1] dark:bg-neutral-950">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between text-sm text-neutral-500 sm:flex-row md:px-8">
        <div>
          <div className="mb-4 mr-0 md:mr-4 md:flex">
            <LandingLogo />
          </div>
          <div className="ml-2 mt-2">
            &copy; Continuum Alternatives {new Date().getFullYear()}. All rights reserved.
          </div>
          <div className="ml-2 mt-2 max-w-xs text-xs text-neutral-400">
            Prototype surface on design fixtures — entities and figures shown are
            illustrative until the data cutover.
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 items-start gap-10 sm:mt-0 md:mt-0 lg:grid-cols-4">
          {COLUMNS.map((column) => (
            <div key={column.title} className="flex w-full flex-col justify-center space-y-4">
              <p className="font-bold text-neutral-600 dark:text-neutral-300">{column.title}</p>
              <ul className="list-none space-y-4 text-neutral-600 dark:text-neutral-300">
                {column.links.map((link) => (
                  <li key={link.title} className="list-none">
                    <Link className="transition-colors hover:text-neutral-800 dark:hover:text-neutral-100" href={link.href}>
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
