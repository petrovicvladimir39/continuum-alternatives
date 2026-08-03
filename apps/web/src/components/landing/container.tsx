import React from "react";
import { cn } from "@/lib/utils";

/** Aceternity template container. */
export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full max-w-7xl", className)}>{children}</div>;
}
