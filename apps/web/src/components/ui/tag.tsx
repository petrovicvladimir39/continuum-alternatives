import type { HTMLAttributes } from "react";

type TagProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "neutral" | "equity" | "credit" | "distressed";
};

const variants = {
  neutral: "border border-line text-ink-secondary",
  equity: "bg-equity-bg text-equity",
  credit: "bg-credit-bg text-credit",
  distressed: "bg-distressed-bg text-distressed",
};

export function Tag({ variant = "neutral", className, ...props }: TagProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium",
        variants[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
