"use client";

import { useState, useTransition } from "react";
import { Avatar, Btn } from "@/components/ui";
import { placeBet } from "@/lib/actions/bolao";

type BolaoStatus = "open" | "settled";

interface MatchInfo {
  id: number;
  format: string;
  team_a: string[];
  team_b: string[];
  winner_side: "A" | "B" | null;
}

interface BolaoRow {
  id: string;
  status: BolaoStatus;
  closes_at: string | null;
  created_at: string;
  match: MatchInfo;
}

interface MyBet {
  pick_side: string;
  stake: number;
  result: string | null;
  payout: number | null;
}

interface Props {
  bolaos: BolaoRow[];
  betMap: Record<string, MyBet>;
  profileMap: Record<string, string>;
  userCoins: number;
}

const STAKE_OPTIONS = [1, 2, 3, 4, 5];

function PlayerName({ id, profiles }: { id: string; profiles: Record<string, string> }) {
  const name = profiles[id] ?? "?";
  return (
    <div className="flex items-center gap-1">
      <Avatar name={name} size={18} />
      <span className="text-[11px] font-medium">{name.split(" ")[0]}</span>
    </div>
  );
}

function BolaoCard({
  bolao,
  myBet,
  profiles,
  userCoins,
}: {
  bolao: BolaoRow;
  myBet: MyBet | undefined;
  profiles: Record<string, string>;
  userCoins: number;
}) {
  const [stake, setStake] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { match } = bolao;
  const isOpen = bolao.status === "open";
  const isSettled = bolao.status === "settled";

  function bet(side: "A" | "B") {
    setError(null);
    const fd = new FormData();
    fd.set("bolao_id", bolao.id);
    fd.set("pick_side", side);
    fd.set("stake", String(stake));
    startTransition(async () => {
      const result = await placeBet(fd);
      if (result?.error) setError(result.error);
      else setDone(true);
    });
  }

  return (
    <div className="bg-surface border border-border rounded-[16px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold font-mono bg-surface-3 border border-border-2 px-1.5 py-0.5 rounded-md text-text-dim">
            {match.format}
          </span>
          {isOpen && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-mint-faint text-mint border border-mint/20">
              ABERTO
            </span>
          )}
          {isSettled && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface-3 text-text-faint border border-border-2">
              ENCERRADO
            </span>
          )}
        </div>
        {bolao.closes_at && isOpen && (
          <span className="text-[9px] text-text-faint">
            até {new Date(bolao.closes_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="flex gap-2 px-3 pb-3">
        {/* Time A */}
        <div
          className={`flex-1 rounded-[10px] p-2 flex flex-col gap-1 border ${
            match.winner_side === "A"
              ? "border-mint/30 bg-mint-faint"
              : myBet?.pick_side === "A" && !isSettled
              ? "border-blue/30 bg-blue-faint"
              : "border-border bg-surface-2"
          }`}
        >
          <div className="text-[9px] font-bold text-text-faint uppercase tracking-wider">
            {match.winner_side === "A" ? "👑 Time A" : "Time A"}
          </div>
          {match.team_a.map((id) => (
            <PlayerName key={id} id={id} profiles={profiles} />
          ))}
        </div>

        <div className="flex items-center text-[11px] font-bold text-text-faint self-center px-0.5">VS</div>

        {/* Time B */}
        <div
          className={`flex-1 rounded-[10px] p-2 flex flex-col gap-1 border ${
            match.winner_side === "B"
              ? "border-mint/30 bg-mint-faint"
              : myBet?.pick_side === "B" && !isSettled
              ? "border-blue/30 bg-blue-faint"
              : "border-border bg-surface-2"
          }`}
        >
          <div className="text-[9px] font-bold text-text-faint uppercase tracking-wider">
            {match.winner_side === "B" ? "👑 Time B" : "Time B"}
          </div>
          {match.team_b.map((id) => (
            <PlayerName key={id} id={id} profiles={profiles} />
          ))}
        </div>
      </div>

      {/* Bet area */}
      {isOpen && !myBet && !done && (
        <div className="border-t border-border px-3 py-3 flex flex-col gap-2.5">
          {/* Stake picker */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-faint font-medium shrink-0">Stake:</span>
            <div className="flex gap-1.5">
              {STAKE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStake(s)}
                  className={`w-7 h-7 rounded-[8px] text-[11px] font-bold border transition-all ${
                    stake === s
                      ? "border-gold bg-[var(--gold-faint)] text-gold"
                      : "border-border-2 bg-surface-2 text-text-dim hover:border-gold/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-text-faint ml-auto">({userCoins} 🪙 disponíveis)</span>
          </div>

          {error && (
            <div className="text-[11px] text-danger bg-danger-faint border border-danger/20 rounded-[8px] px-2 py-1.5">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending || stake > userCoins}
              onClick={() => bet("A")}
              className="flex-1 py-2 rounded-[10px] text-[11px] font-bold border border-border-2 bg-surface-2 hover:border-mint/40 hover:bg-mint-faint transition-all disabled:opacity-40"
            >
              Time A +{stake}🪙
            </button>
            <button
              type="button"
              disabled={isPending || stake > userCoins}
              onClick={() => bet("B")}
              className="flex-1 py-2 rounded-[10px] text-[11px] font-bold border border-border-2 bg-surface-2 hover:border-mint/40 hover:bg-mint-faint transition-all disabled:opacity-40"
            >
              Time B +{stake}🪙
            </button>
          </div>
        </div>
      )}

      {/* Bet placed (pending result) */}
      {isOpen && (myBet || done) && (
        <div className="border-t border-border px-3 py-2.5 flex items-center gap-2">
          <span className="text-[11px] text-text-dim">Sua aposta:</span>
          <span className="text-[11px] font-bold text-blue">
            Time {myBet?.pick_side ?? "?"} · {myBet?.stake ?? stake}🪙
          </span>
          <span className="ml-auto text-[10px] text-text-faint">aguardando resultado</span>
        </div>
      )}

      {/* Settled result */}
      {isSettled && myBet && (
        <div className="border-t border-border px-3 py-2.5 flex items-center gap-2">
          {myBet.result === "won" ? (
            <>
              <span className="text-[12px]">🏆</span>
              <span className="text-[11px] font-bold text-mint">
                +{(myBet.payout ?? 0)}🪙 ganhos
              </span>
              <span className="text-[10px] text-text-faint ml-auto">
                apostou {myBet.stake}🪙 no Time {myBet.pick_side}
              </span>
            </>
          ) : myBet.result === "lost" ? (
            <>
              <span className="text-[12px]">💸</span>
              <span className="text-[11px] font-bold text-danger">
                -{myBet.stake}🪙 perdidos
              </span>
              <span className="text-[10px] text-text-faint ml-auto">
                apostou no Time {myBet.pick_side}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-text-faint">Resultado pendente</span>
          )}
        </div>
      )}
    </div>
  );
}

type Tab = "abertos" | "historico";

export function BolaoClient({ bolaos, betMap, profileMap, userCoins }: Props) {
  const [tab, setTab] = useState<Tab>("abertos");

  const open = bolaos.filter((b) => b.status === "open");
  const settled = bolaos.filter((b) => b.status === "settled" && betMap[b.id]);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="text-[18px] font-bold">Bolão</div>
        <div className="flex items-center gap-1 text-[12px] font-bold text-gold">
          {userCoins}🪙
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-2 rounded-[10px] p-0.5">
        {(["abertos", "historico"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-[8px] text-[11px] font-bold transition-all ${
              tab === t ? "bg-surface text-text shadow-sm" : "text-text-faint"
            }`}
          >
            {t === "abertos" ? `Apostas abertas${open.length > 0 ? ` (${open.length})` : ""}` : "Meus resultados"}
          </button>
        ))}
      </div>

      {/* Open bolões */}
      {tab === "abertos" && (
        <>
          {open.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2 text-center">
              <div className="text-3xl">🎱</div>
              <div className="text-[13px] text-text-dim">Sem bolões abertos</div>
              <div className="text-[11px] text-text-faint">
                O admin cria bolões a partir das partidas sorteadas
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {open.map((b) => (
                <BolaoCard
                  key={b.id}
                  bolao={b}
                  myBet={betMap[b.id]}
                  profiles={profileMap}
                  userCoins={userCoins}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* History */}
      {tab === "historico" && (
        <>
          {settled.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2 text-center">
              <div className="text-3xl">📋</div>
              <div className="text-[13px] text-text-dim">Sem apostas encerradas</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {settled.map((b) => (
                <BolaoCard
                  key={b.id}
                  bolao={b}
                  myBet={betMap[b.id]}
                  profiles={profileMap}
                  userCoins={userCoins}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
