import type { TableHTMLAttributes } from "react";

export const numericCell = "text-right tabular-nums";

export function DataTable({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={[
        "w-full border-collapse text-left text-[13px] leading-[1.45]",
        "[&_th]:px-3 [&_th]:py-2 [&_th]:text-[11px] [&_th]:leading-[1.3] [&_th]:font-medium [&_th]:tracking-wide [&_th]:uppercase [&_th]:text-ink-muted",
        "[&_td]:px-3 [&_td]:py-2",
        "[&_tr]:border-b [&_tr]:border-line",
        "[&_tbody_tr:hover]:bg-[#F4F2EC]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
