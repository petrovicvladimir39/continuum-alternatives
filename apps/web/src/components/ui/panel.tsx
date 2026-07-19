import type { HTMLAttributes } from "react";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["rounded-md border border-line bg-surface p-4", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
