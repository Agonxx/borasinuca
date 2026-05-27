import { ReactNode } from "react";

interface CardProps {
  title?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, headerRight, children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-[var(--radius)] p-[14px] flex flex-col gap-[10px] ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-mint uppercase tracking-[0.8px]">
            {title}
          </span>
          {headerRight}
        </div>
      )}
      {children}
    </div>
  );
}
