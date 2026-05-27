"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type BtnVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type BtnSize = "sm" | "md" | "lg";

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  leftIcon?: ReactNode;
  children?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 font-semibold transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none";

const variants: Record<BtnVariant, string> = {
  primary:
    "bg-mint text-bg font-bold rounded-[10px] shadow-[0_4px_14px_-6px_rgba(79,209,163,0.5)] hover:bg-mint-2",
  secondary:
    "bg-surface-2 text-text border border-border-2 rounded-[10px] hover:bg-surface-3",
  outline:
    "bg-transparent text-mint border border-mint rounded-[10px] hover:bg-mint-faint",
  ghost:
    "bg-transparent text-text-dim border border-border rounded-[10px] hover:bg-surface-2",
  danger:
    "bg-transparent text-danger border border-danger rounded-[10px] hover:bg-danger-faint",
};

const sizes: Record<BtnSize, string> = {
  sm: "h-8 px-3 text-[12px]",
  md: "h-9 px-4 text-[13px]",
  lg: "h-11 px-5 text-[14px] rounded-[12px]",
};

export function Btn({
  variant = "primary",
  size = "md",
  leftIcon,
  children,
  className = "",
  ...props
}: BtnProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {leftIcon && <span className="shrink-0 [&_svg]:size-4">{leftIcon}</span>}
      {children}
    </button>
  );
}
