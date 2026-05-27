import { IconCoin } from "./icons";
import { Avatar } from "./Avatar";

interface AppHeaderProps {
  saldo?: number;
  userName?: string;
}

function EightBall({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="19" fill="#111" stroke="#333" strokeWidth="1" />
      <circle cx="20" cy="20" r="10" fill="white" />
      <circle cx="20" cy="20" r="6" fill="#111" />
      <text x="20" y="24" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold" fontFamily="Arial">8</text>
      <circle cx="13" cy="11" r="3" fill="white" opacity="0.15" />
    </svg>
  );
}

export function AppHeader({ saldo, userName }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-bg border-b border-border shrink-0">
      <div className="flex items-center gap-2">
        <EightBall size={28} />
        <div
          className="text-[18px] font-bold text-mint leading-none"
          style={{ fontFamily: "var(--font-bricolage), var(--font-outfit), sans-serif", letterSpacing: -0.5 }}
        >
          BoraSinuca
        </div>
      </div>

      <div className="flex items-center gap-2">
        {saldo !== undefined && (
          <div className="flex items-center gap-1.5 bg-[var(--gold-faint)] border border-gold/30 rounded-full px-3 py-1.5">
            <IconCoin />
            <span className="text-[13px] font-bold text-gold" style={{ fontVariantNumeric: "tabular-nums" }}>
              {saldo}
            </span>
          </div>
        )}
        {userName && (
          <a href="/auth/logout" title="Sair da conta" className="opacity-80 hover:opacity-100 transition-opacity">
            <Avatar name={userName} size={30} />
          </a>
        )}
      </div>
    </header>
  );
}
