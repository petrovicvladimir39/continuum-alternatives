import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

const variants = {
  primary:
    "bg-accent text-accent-ink hover:bg-[color-mix(in_srgb,var(--color-accent)_94%,var(--color-ink))]",
  ghost: "border border-line text-ink hover:bg-ink/6",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={["rounded-sm px-3.5 py-1.5 text-[13px] font-medium", variants[variant], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
