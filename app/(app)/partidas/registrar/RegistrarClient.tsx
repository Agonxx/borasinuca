"use client";

import { useState, useTransition } from "react";
import { Avatar, Btn } from "@/components/ui";
import { registerResult } from "@/lib/actions/match";

interface Match {
  id: number;
  format: string;
  team_a: string[];
  team_b: string[];
  played_at: string;
}

interface Props {
  matches: Match[];
  profileMap: Record<string, string>;
  initialMatchId?: number;
}

function TeamCard({
  players,
  label,
  profiles,
  selected,
  onClick,
}: {
  players: string[];
  label: string;
  profiles: Record<string, string>;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col gap-2 rounded-[14px] border-2 p-3 text-left transition-all ${
        selected ? "border-mint bg-mint-faint" : "border-border-2 bg-surface hover:border-mint/40"
      }`}
    >
      <div className="text-[9px] font-bold uppercase tracking-widest text-text-faint">
        {selected ? `👑 ${label}` : label}
      </div>
      {players.map((id) => (
        <div key={id} className="flex items-center gap-1.5">
          <Avatar name={profiles[id] ?? "?"} size={22} />
          <span className="text-[12px] font-semibold">{(profiles[id] ?? "?").split(" ")[0]}</span>
        </div>
      ))}
    </button>
  );
}

export function RegistrarClient({ matches, profileMap, initialMatchId }: Props) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(
    initialMatchId ? matches.find((m) => m.id === initialMatchId) ?? matches[0] ?? null : matches[0] ?? null
  );
  const [winner, setWinner] = useState<"A" | "B" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!selectedMatch || !winner) return;
    setError(null);
    const fd = new FormData();
    fd.set("match_id", String(selectedMatch.id));
    fd.set("winner_side", winner);
    startTransition(async () => {
      const result = await registerResult(fd);
      if (result?.error) setError(result.error);
    });
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center py-16">
        <div className="text-3xl">✅</div>
        <div className="text-[14px] font-semibold">Sem partidas pendentes</div>
        <div className="text-[12px] text-text-dim">Todas as partidas já têm resultado registrado</div>
        <a href="/partidas" className="text-[12px] text-mint font-bold mt-2">
          Ver partidas →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <div>
        <div className="text-[20px] font-bold leading-tight">Registrar resultado</div>
        <div className="text-[12px] text-text-dim mt-0.5">
          Selecione a partida e marque o vencedor
        </div>
      </div>

      {/* Match selector — só mostra se tiver mais de 1 */}
      {matches.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] font-bold text-text-faint uppercase tracking-[1px]">
            Partida ({matches.length} pendentes)
          </div>
          <div className="flex flex-col gap-1.5">
            {matches.map((m) => {
              const teamA = m.team_a.map((id) => (profileMap[id] ?? "?").split(" ")[0]).join(" + ");
              const teamB = m.team_b.map((id) => (profileMap[id] ?? "?").split(" ")[0]).join(" + ");
              const isSel = selectedMatch?.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setSelectedMatch(m); setWinner(null); }}
                  className={`flex items-center gap-2 rounded-[12px] border px-3 py-2 text-left transition-all ${
                    isSel ? "border-mint bg-mint-faint" : "border-border-2 bg-surface hover:bg-surface-3"
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold text-text-faint bg-surface-3 px-1.5 py-0.5 rounded-md">
                    {m.format}
                  </span>
                  <span className="text-[12px] font-semibold flex-1 truncate">
                    {teamA} vs {teamB}
                  </span>
                  {isSel && <span className="text-mint text-[12px]">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Team cards */}
      {selectedMatch && (
        <>
          <div className="text-[10px] font-bold text-text-faint uppercase tracking-[1px]">
            Quem venceu?
          </div>
          <div className="flex gap-3">
            <TeamCard
              label="Time A"
              players={selectedMatch.team_a}
              profiles={profileMap}
              selected={winner === "A"}
              onClick={() => setWinner((w) => (w === "A" ? null : "A"))}
            />
            <div className="flex items-center font-bold text-text-faint text-[13px] self-center">VS</div>
            <TeamCard
              label="Time B"
              players={selectedMatch.team_b}
              profiles={profileMap}
              selected={winner === "B"}
              onClick={() => setWinner((w) => (w === "B" ? null : "B"))}
            />
          </div>
        </>
      )}

      {error && (
        <div className="text-[12px] text-danger bg-danger-faint border border-danger/20 rounded-[8px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Btn
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!winner || !selectedMatch || isPending}
          onClick={handleSubmit}
        >
          {isPending ? "Registrando..." : `✅ Confirmar resultado`}
        </Btn>
        <a
          href="/partidas"
          className="text-center text-[12px] text-text-faint hover:text-text py-2"
        >
          Cancelar
        </a>
      </div>
    </div>
  );
}
