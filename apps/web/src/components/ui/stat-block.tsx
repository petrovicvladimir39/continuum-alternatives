type StatBlockProps = {
  value: string;
  label: string;
  delta?: number;
};

export function StatBlock({ value, label, delta }: StatBlockProps) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-[22px] leading-[1.2] font-medium tabular-nums">{value}</span>
        {delta !== undefined ? (
          <span
            className={[
              "text-[13px] tabular-nums",
              delta < 0 ? "text-negative" : "text-positive",
            ].join(" ")}
          >
            {delta < 0 ? "−" : "+"}
            {Math.abs(delta)}%
          </span>
        ) : null}
      </div>
      <div className="type-label mt-1">{label}</div>
    </div>
  );
}
