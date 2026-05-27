"use client";

interface TopTabsProps {
  items: string[];
  active: number;
  onChange?: (index: number) => void;
}

export function TopTabs({ items, active, onChange }: TopTabsProps) {
  return (
    <div className="flex border-b border-border bg-bg shrink-0">
      {items.map((item, i) => (
        <button
          key={item}
          onClick={() => onChange?.(i)}
          className={`flex-1 py-3 text-[13px] font-semibold transition-colors relative cursor-pointer
            ${i === active ? "text-mint" : "text-text-dim hover:text-text"}`}
        >
          {item}
          {i === active && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-mint" />
          )}
        </button>
      ))}
    </div>
  );
}
