interface StatProps {
  label: string;
  value: string;
  delta?: string;
  deltaColor?: "mint" | "danger" | "dim";
  big?: boolean;
}

export function Stat({ label, value, delta, deltaColor = "dim", big = false }: StatProps) {
  const deltaColors = {
    mint:   "text-mint",
    danger: "text-danger",
    dim:    "text-text-dim",
  };

  return (
    <div className="bg-surface-2 border border-border rounded-[var(--radius)] p-3 flex flex-col gap-1">
      <div className="text-[10px] font-semibold text-text-faint uppercase tracking-[0.6px]">
        {label}
      </div>
      <div className={`font-bold text-text leading-tight ${big ? "text-[18px]" : "text-[15px]"}`}>
        {value}
      </div>
      {delta && (
        <div className={`text-[11px] font-medium ${deltaColors[deltaColor]}`}>
          {delta}
        </div>
      )}
    </div>
  );
}
