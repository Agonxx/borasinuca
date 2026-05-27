"use client";

import { useState, useTransition } from "react";
import { createBolao } from "@/lib/actions/bolao";

interface Props {
  matchId: number;
  hasBolao: boolean;
}

export function MatchAdminActions({ matchId, hasBolao }: Props) {
  const [isPending, startTransition] = useTransition();
  const [created, setCreated] = useState(hasBolao);
  const [error, setError] = useState<string | null>(null);

  function handleCreateBolao() {
    setError(null);
    const fd = new FormData();
    fd.set("match_id", String(matchId));
    startTransition(async () => {
      const result = await createBolao(fd);
      if (result?.error) setError(result.error);
      else setCreated(true);
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <a
        href={`/partidas/registrar?match_id=${matchId}`}
        className="text-[10px] font-bold px-2.5 py-1 rounded-[8px] bg-surface-3 border border-border-2 text-text-dim hover:text-mint hover:border-mint/30 transition-colors"
      >
        ✏️ Resultado
      </a>
      {created ? (
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-[8px] bg-mint-faint border border-mint/20 text-mint">
          🎲 Bolão aberto
        </span>
      ) : (
        <button
          type="button"
          onClick={handleCreateBolao}
          disabled={isPending}
          className="text-[10px] font-bold px-2.5 py-1 rounded-[8px] bg-surface-3 border border-border-2 text-text-dim hover:text-gold hover:border-gold/30 transition-colors disabled:opacity-40"
        >
          🎲 Criar bolão
        </button>
      )}
      {error && <span className="text-[10px] text-danger">{error}</span>}
    </div>
  );
}
