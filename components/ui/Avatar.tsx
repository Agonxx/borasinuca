import { CSSProperties } from "react";

interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
  ring?: boolean;
  className?: string;
}

const PALETTE = [
  "#5b8cff",
  "#4fd1a3",
  "#f4c95d",
  "#ef9b57",
  "#c87bf0",
  "#ff85a1",
  "#ef4757",
  "#3db58a",
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ name, size = 32, color, ring = false, className = "" }: AvatarProps) {
  const bg = color ?? colorFromName(name);
  const fontSize = Math.round(size * 0.38);

  const style: CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    borderRadius: "50%",
    background: bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize,
    fontWeight: 700,
    color: "#062a1f",
    ...(ring
      ? { outline: "2px solid #4fd1a3", outlineOffset: "2px" }
      : {}),
  };

  return (
    <div style={style} className={className} aria-label={name}>
      {initials(name)}
    </div>
  );
}
