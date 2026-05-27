import { ReactNode, CSSProperties } from "react";

type PillColor = "default" | "mint" | "blue" | "danger" | "gold";

interface PillProps {
  color?: PillColor;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const styles: Record<PillColor, string> = {
  default: "bg-surface-2 text-text-dim border-border-2",
  mint:    "bg-mint-faint text-mint border-mint/30",
  blue:    "bg-blue-faint text-blue border-blue/30",
  danger:  "bg-danger-faint text-danger border-danger/30",
  gold:    "bg-[var(--gold-faint)] text-gold border-gold/30",
};

export function Pill({ color = "default", children, className = "", style }: PillProps) {
  return (
    <span
      style={style}
      className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-bold border ${styles[color]} ${className}`}
    >
      {children}
    </span>
  );
}
