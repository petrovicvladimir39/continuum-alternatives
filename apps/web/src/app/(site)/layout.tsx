import type { ReactNode } from "react";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1200px] flex-1 px-6">{children}</div>;
}
