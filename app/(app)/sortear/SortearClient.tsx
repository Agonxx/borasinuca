"use client";

import { useState, useTransition } from "react";
import { Avatar, Btn } from "@/components/ui";
import { registerMatch } from "@/lib/actions/match";

type Step = "select" | "drawn";
type Format = "1x1" | "2x1" | "2x2";

interface Player { id: string; name: string; }
interface Props {
  players: Player[];
  groupId: string;
  currentUserId: string;
}

const FORMAT_SLOTS: Record<Format, number> = { "1x1": 2, "2x1": 3, "2x2": 4 };
const FORMAT_DESC: Record<Format, string> = { "1x1": "Individual", "2x1": "Dupla vs Solo", "2x2": "Duplas" };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawTeams(players: Player[], format: Format): [Player[], Player[]] {
  const s = shuffle(players).slice(0, FORMAT_SLOTS[format]);
  if (format === "1x1") return [[s[0]], [s[1]]];
  if (format === "2x1") return [[s[0], s[1]], [s[2]]];
  return [[s[0], s[1]], [s[2], s[3]]];
}

function TeamCard({
  label,
  players,
  isWinner,
  onClick,
}: {
  label: string;
  players: Player[];
  isWinner: boolean | null;
  onClick: () => void;
}) {
  const base = "flex-1 flex flex-col items-start gap-2 rounded-[16px] border-2 p-3 cursor-pointer transition-all";
  const style =
    isWinner === true
      ? `${base} border-mint bg-mint-faint`
      : isWinner === false
      ? `${base} border-border bg-surface opacity-40`
      : `${base} border-border-2 bg-surface hover:border-mint/40 hover:bg-surface-3`;

  return (
    <button type="button" className={style} onClick={onClick}>
      <div className="text-[9px] font-bold uppercase tracking-widest text-text-faint w-full">
        {isWinner === true ? `👑 ${label}` : label}
      </div>
      {players.map((p) => (
        <div key={p.id} className="flex items-center gap-1.5 w-full">
          <Avatar name={p.name} size={24} />
          <span className="text-[12px] font-semibold truncate">{p.name.split(" ")[0]}</span>
        </div>
      ))}
    </button>
  );
}

export function SortearClient({ players, groupId, currentUserId }: Props) {
  const [step, setStep] = useState<Step>("select");
  const [selected, setSelected] = useState<Set<string>>(new Set([currentUserId]));
  const [format, setFormat] = useState<Format>("2x2");
  const [teamA, setTeamA] = useState<Player[]>([]);
  const [teamB, setTeamB] = useState<Player[]>([]);
  const [winner, setWinner] = useState<"A" | "B" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedList = players.filter((p) => selected.has(p.id));
  const needed = FORMAT_SLOTS[format];
  const canDraw = selectedList.length >= needed;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDraw() {
    if (!canDraw) return;
    const [a, b] = drawTeams(selectedList, format);
    setTeamA(a);
    setTeamB(b);
    setWinner(null);
    setStep("drawn");
  }

  function handleRedraw() {
    const [a, b] = drawTeams(selectedList, format);
    setTeamA(a);
    setTeamB(b);
    setWinner(null);
  }

  function submit(winnerSide: "A" | "B" | null) {
    setError(null);
    const fd = new FormData();
    fd.set("group_id", groupId);
    fd.set("team_a", JSON.stringify(teamA.map((p) => p.id)));
    fd.set("team_b", JSON.stringify(teamB.map((p) => p.id)));
    fd.set("format", format);
    if (winnerSide) fd.set("winner_side", winnerSide);
    startTransition(async () => {
      const result = await registerMatch(fd);
      if (result?.error) setError(result.error);
    });
  }

  /* ── Tela de seleção ── */
  if (step === "select") {
    return (
      <div className="flex flex-col gap-5 px-4 py-5">
        <div>
          <div className="text-[20px] font-bold leading-tight">Quem vai jogar?</div>
          <div className="text-[12px] text-text-dim mt-0.5">
            Selecione os presentes e escolha o formato
          </div>
        </div>

        {/* Jogadores */}
        <div className="grid grid-cols-2 gap-2">
          {players.map((p) => {
            const sel = selected.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`flex items-center gap-2.5 rounded-[12px] border p-3 text-left transition-all ${
                  sel
                    ? "border-mint bg-mint-faint"
                    : "border-border-2 bg-surface hover:bg-surface-3"
                }`}
              >
                <Avatar name={p.name} size={32} ring={sel} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold truncate">{p.name.split(" ")[0]}</div>
                  {sel && <div className="text-[10px] text-mint font-bold leading-none">✓</div>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Formato */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-bold text-text-faint uppercase tracking-[1px]">Formato</div>
          <div className="flex gap-2">
            {(["1x1", "2x1", "2x2"] as Format[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`flex-1 flex flex-col items-center py-2.5 rounded-[12px] border transition-all ${
                  format === f
                    ? "border-mint bg-mint-faint text-mint"
                    : "border-border-2 bg-surface text-text-dim hover:bg-surface-3"
                }`}
              >
                <span className="text-[14px] font-bold font-mono">{f}</span>
                <span className="text-[9px] mt-0.5 opacity-70">{FORMAT_DESC[f]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Validação e botão */}
        <div className="flex flex-col gap-2">
          {!canDraw && (
            <div className="text-[12px] text-text-faint text-center">
              Selecione pelo menos <span className="text-mint font-bold">{needed}</span> jogadores para o formato {format}
              {selectedList.length > 0 && selectedList.length < needed && (
                <span className="text-text-dim"> ({needed - selectedList.length} faltando)</span>
              )}
            </div>
          )}
          {canDraw && selectedList.length > needed && (
            <div className="text-[11px] text-text-faint text-center">
              {selectedList.length} selecionados · <span className="text-mint">{needed} vagas sorteadas</span>, {selectedList.length - needed} ficam de fora
            </div>
          )}
          <Btn
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!canDraw}
            onClick={handleDraw}
          >
            🎲 Sortear {needed} vagas
          </Btn>
        </div>
      </div>
    );
  }

  /* ── Tela de resultado do sorteio ── */
  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <div>
        <div className="text-[20px] font-bold leading-tight">Times sorteados</div>
        <div className="text-[12px] text-text-dim mt-0.5">
          Toque no vencedor — ou crie a partida e registre depois
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 text-[11px]">
        <span className="px-2 py-0.5 rounded-full bg-surface border border-border-2 font-mono font-bold text-mint">
          {format}
        </span>
        <span className="text-text-faint">{FORMAT_DESC[format]}</span>
      </div>

      {/* Times */}
      <div className="flex gap-2 items-stretch">
        <TeamCard
          label="Time A"
          players={teamA}
          isWinner={winner === null ? null : winner === "A"}
          onClick={() => setWinner((w) => (w === "A" ? null : "A"))}
        />
        <div className="flex items-center justify-center text-[14px] font-bold text-text-faint px-1 self-center">
          VS
        </div>
        <TeamCard
          label="Time B"
          players={teamB}
          isWinner={winner === null ? null : winner === "B"}
          onClick={() => setWinner((w) => (w === "B" ? null : "B"))}
        />
      </div>

      {error && (
        <div className="text-[12px] text-danger bg-danger-faint border border-danger/20 rounded-[8px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {/* Com resultado — só aparece quando vencedor selecionado */}
        {winner && (
          <Btn
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isPending}
            onClick={() => submit(winner)}
          >
            {isPending ? "Registrando..." : `✅ Registrar — Time ${winner} venceu`}
          </Btn>
        )}

        {/* Sem resultado — sempre disponível */}
        <Btn
          type="button"
          variant={winner ? "outline" : "primary"}
          size="lg"
          className="w-full"
          disabled={isPending}
          onClick={() => submit(null)}
        >
          {isPending ? "Criando..." : "📋 Criar partida (resultado depois)"}
        </Btn>

        <Btn
          type="button"
          variant="outline"
          size="md"
          className="w-full"
          disabled={isPending}
          onClick={handleRedraw}
        >
          🎲 Sortear de novo
        </Btn>

        <Btn
          type="button"
          variant="ghost"
          size="md"
          className="w-full"
          disabled={isPending}
          onClick={() => setStep("select")}
        >
          Mudar jogadores
        </Btn>
      </div>
    </div>
  );
}
