"use client";

import { useState, useTransition } from "react";
import { Avatar, Btn } from "@/components/ui";
import { registerMatch } from "@/lib/actions/match";

type Step = "select" | "drawn";
type Mode = "auto" | "manual";
type Format = "1x1" | "2x1" | "2x2";
type Side = "A" | "B";

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

function detectFormat(a: number, b: number): Format | null {
  if (a === 1 && b === 1) return "1x1";
  if ((a === 2 && b === 1) || (a === 1 && b === 2)) return "2x1";
  if (a === 2 && b === 2) return "2x2";
  return null;
}

function TeamCard({
  label, players, isWinner, onClick,
}: {
  label: string; players: Player[]; isWinner: boolean | null; onClick: () => void;
}) {
  const base = "flex-1 flex flex-col items-start gap-2 rounded-[16px] border-2 p-3 cursor-pointer transition-all";
  const style =
    isWinner === true  ? `${base} border-mint bg-mint-faint` :
    isWinner === false ? `${base} border-border bg-surface opacity-40` :
                        `${base} border-border-2 bg-surface hover:border-mint/40 hover:bg-surface-3`;
  return (
    <button type="button" className={style} onClick={onClick}>
      <div className="text-[9px] font-bold uppercase tracking-widest text-text-faint w-full">
        {isWinner === true ? `👑 ${label}` : label}
      </div>
      {players.map((p) => (
        <div key={p.id} className="flex items-center gap-1.5 w-full">
          <Avatar name={p.name} size={24} />
          <span className="text-[12px] font-semibold">{p.name.split(" ")[0]}</span>
        </div>
      ))}
    </button>
  );
}

export function SortearClient({ players, groupId, currentUserId }: Props) {
  const [mode, setMode] = useState<Mode>("auto");
  const [step, setStep] = useState<Step>("select");

  // Auto mode state
  const [selected, setSelected] = useState<Set<string>>(new Set([currentUserId]));
  const [format, setFormat] = useState<Format>("2x2");

  // Manual mode state
  const [assign, setAssign] = useState<Record<string, Side>>({});

  // Drawn state (shared)
  const [teamA, setTeamA] = useState<Player[]>([]);
  const [teamB, setTeamB] = useState<Player[]>([]);
  const [drawnFormat, setDrawnFormat] = useState<Format>("2x2");
  const [winner, setWinner] = useState<Side | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Auto mode helpers
  const selectedList = players.filter((p) => selected.has(p.id));
  const needed = FORMAT_SLOTS[format];
  const canDraw = selectedList.length >= needed;

  function togglePlayer(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleDraw() {
    if (!canDraw) return;
    const [a, b] = drawTeams(selectedList, format);
    setTeamA(a); setTeamB(b); setDrawnFormat(format);
    setWinner(null); setStep("drawn");
  }

  function handleRedraw() {
    const [a, b] = drawTeams(selectedList, format);
    setTeamA(a); setTeamB(b); setWinner(null);
  }

  // Manual mode helpers
  function setSide(playerId: string, side: Side) {
    setAssign((prev) => {
      const next = { ...prev };
      if (next[playerId] === side) delete next[playerId]; else next[playerId] = side;
      return next;
    });
  }

  const manualA = players.filter((p) => assign[p.id] === "A");
  const manualB = players.filter((p) => assign[p.id] === "B");
  const manualFormat = detectFormat(manualA.length, manualB.length);

  function handleConfirmManual() {
    if (!manualFormat) return;
    setTeamA(manualA); setTeamB(manualB); setDrawnFormat(manualFormat);
    setWinner(null); setStep("drawn");
  }

  function handleSwitchMode(m: Mode) {
    setMode(m);
    setStep("select");
    setWinner(null);
    setError(null);
    if (m === "manual") setAssign({});
  }

  function submit(winnerSide: Side | null) {
    setError(null);
    const fd = new FormData();
    fd.set("group_id", groupId);
    fd.set("team_a", JSON.stringify(teamA.map((p) => p.id)));
    fd.set("team_b", JSON.stringify(teamB.map((p) => p.id)));
    fd.set("format", drawnFormat);
    if (winnerSide) fd.set("winner_side", winnerSide);
    startTransition(async () => {
      const result = await registerMatch(fd);
      if (result?.error) setError(result.error);
    });
  }

  // ── Mode toggle ──────────────────────────────────────────
  const ModeToggle = (
    <div className="flex bg-surface-2 rounded-[10px] p-0.5">
      {(["auto", "manual"] as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => handleSwitchMode(m)}
          className={`flex-1 py-1.5 rounded-[8px] text-[11px] font-bold transition-all ${
            mode === m ? "bg-surface text-text shadow-sm" : "text-text-faint"
          }`}
        >
          {m === "auto" ? "🎲 Aleatório" : "✋ Manual"}
        </button>
      ))}
    </div>
  );

  // ── Drawn step (shared) ──────────────────────────────────
  if (step === "drawn") {
    return (
      <div className="flex flex-col gap-4 px-4 py-5">
        <div>
          <div className="text-[20px] font-bold leading-tight">Times montados</div>
          <div className="text-[12px] text-text-dim mt-0.5">
            Toque no vencedor — ou crie a partida e registre depois
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-surface border border-border-2 font-mono font-bold text-mint">
            {drawnFormat}
          </span>
          <span className="text-text-faint">{FORMAT_DESC[drawnFormat]}</span>
        </div>

        <div className="flex gap-2 items-stretch">
          <TeamCard label="Time A" players={teamA}
            isWinner={winner === null ? null : winner === "A"}
            onClick={() => setWinner((w) => (w === "A" ? null : "A"))} />
          <div className="flex items-center justify-center text-[14px] font-bold text-text-faint self-center px-0.5">VS</div>
          <TeamCard label="Time B" players={teamB}
            isWinner={winner === null ? null : winner === "B"}
            onClick={() => setWinner((w) => (w === "B" ? null : "B"))} />
        </div>

        {error && (
          <div className="text-[12px] text-danger bg-danger-faint border border-danger/20 rounded-[8px] px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {winner && (
            <Btn type="button" variant="primary" size="lg" className="w-full"
              disabled={isPending} onClick={() => submit(winner)}>
              {isPending ? "Registrando..." : `✅ Registrar — Time ${winner} venceu`}
            </Btn>
          )}
          <Btn type="button" variant={winner ? "outline" : "primary"} size="lg" className="w-full"
            disabled={isPending} onClick={() => submit(null)}>
            {isPending ? "Criando..." : "📋 Criar partida (resultado depois)"}
          </Btn>
          {mode === "auto" && (
            <Btn type="button" variant="outline" size="md" className="w-full"
              disabled={isPending} onClick={handleRedraw}>
              🎲 Sortear de novo
            </Btn>
          )}
          <Btn type="button" variant="ghost" size="md" className="w-full"
            disabled={isPending} onClick={() => setStep("select")}>
            {mode === "manual" ? "Remontar times" : "Mudar jogadores"}
          </Btn>
        </div>
      </div>
    );
  }

  // ── Auto select step ─────────────────────────────────────
  if (mode === "auto") {
    return (
      <div className="flex flex-col gap-5 px-4 py-5">
        <div>
          <div className="text-[20px] font-bold leading-tight">Quem vai jogar?</div>
          <div className="text-[12px] text-text-dim mt-0.5">Selecione os presentes e escolha o formato</div>
        </div>

        {ModeToggle}

        <div className="grid grid-cols-2 gap-2">
          {players.map((p) => {
            const sel = selected.has(p.id);
            return (
              <button key={p.id} type="button" onClick={() => togglePlayer(p.id)}
                className={`flex items-center gap-2.5 rounded-[12px] border p-3 text-left transition-all ${
                  sel ? "border-mint bg-mint-faint" : "border-border-2 bg-surface hover:bg-surface-3"
                }`}>
                <Avatar name={p.name} size={32} ring={sel} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold truncate">{p.name.split(" ")[0]}</div>
                  {sel && <div className="text-[10px] text-mint font-bold leading-none">✓</div>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-bold text-text-faint uppercase tracking-[1px]">Formato</div>
          <div className="flex gap-2">
            {(["1x1", "2x1", "2x2"] as Format[]).map((f) => (
              <button key={f} type="button" onClick={() => setFormat(f)}
                className={`flex-1 flex flex-col items-center py-2.5 rounded-[12px] border transition-all ${
                  format === f ? "border-mint bg-mint-faint text-mint" : "border-border-2 bg-surface text-text-dim hover:bg-surface-3"
                }`}>
                <span className="text-[14px] font-bold font-mono">{f}</span>
                <span className="text-[9px] mt-0.5 opacity-70">{FORMAT_DESC[f]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {!canDraw && (
            <div className="text-[12px] text-text-faint text-center">
              Selecione pelo menos <span className="text-mint font-bold">{needed}</span> jogadores para o formato {format}
            </div>
          )}
          {canDraw && selectedList.length > needed && (
            <div className="text-[11px] text-text-faint text-center">
              {selectedList.length} selecionados · <span className="text-mint">{needed} vagas sorteadas</span>, {selectedList.length - needed} ficam de fora
            </div>
          )}
          <Btn type="button" variant="primary" size="lg" className="w-full"
            disabled={!canDraw} onClick={handleDraw}>
            🎲 Sortear {needed} vagas
          </Btn>
        </div>
      </div>
    );
  }

  // ── Manual select step ───────────────────────────────────
  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <div>
        <div className="text-[20px] font-bold leading-tight">Montar times</div>
        <div className="text-[12px] text-text-dim mt-0.5">Escolha o time de cada jogador</div>
      </div>

      {ModeToggle}

      <div className="flex flex-col gap-2">
        {players.map((p) => {
          const side = assign[p.id];
          return (
            <div key={p.id} className="flex items-center gap-3 bg-surface border border-border rounded-[12px] px-3 py-2.5">
              <Avatar name={p.name} size={30} />
              <span className="text-[13px] font-semibold flex-1 truncate">{p.name.split(" ")[0]}</span>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setSide(p.id, "A")}
                  className={`w-9 h-8 rounded-[8px] text-[11px] font-bold border transition-all ${
                    side === "A"
                      ? "border-mint bg-mint-faint text-mint"
                      : "border-border-2 bg-surface-2 text-text-faint hover:border-mint/40"
                  }`}>A</button>
                <button type="button" onClick={() => setSide(p.id, "B")}
                  className={`w-9 h-8 rounded-[8px] text-[11px] font-bold border transition-all ${
                    side === "B"
                      ? "border-blue bg-blue-faint text-blue"
                      : "border-border-2 bg-surface-2 text-text-faint hover:border-blue/40"
                  }`}>B</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview dos times */}
      {(manualA.length > 0 || manualB.length > 0) && (
        <div className="flex gap-3">
          <div className="flex-1 bg-mint-faint border border-mint/20 rounded-[12px] px-3 py-2">
            <div className="text-[9px] font-bold text-mint uppercase tracking-wider mb-1">Time A</div>
            {manualA.length === 0
              ? <div className="text-[11px] text-text-faint">vazio</div>
              : manualA.map((p) => (
                  <div key={p.id} className="text-[11px] font-semibold">{p.name.split(" ")[0]}</div>
                ))}
          </div>
          <div className="flex items-center text-[11px] font-bold text-text-faint self-center">VS</div>
          <div className="flex-1 bg-blue-faint border border-blue/20 rounded-[12px] px-3 py-2">
            <div className="text-[9px] font-bold text-blue uppercase tracking-wider mb-1">Time B</div>
            {manualB.length === 0
              ? <div className="text-[11px] text-text-faint">vazio</div>
              : manualB.map((p) => (
                  <div key={p.id} className="text-[11px] font-semibold">{p.name.split(" ")[0]}</div>
                ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {!manualFormat && (manualA.length > 0 || manualB.length > 0) && (
          <div className="text-[11px] text-text-faint text-center">
            Formato inválido — use 1×1, 2×1 ou 2×2
          </div>
        )}
        <Btn type="button" variant="primary" size="lg" className="w-full"
          disabled={!manualFormat} onClick={handleConfirmManual}>
          ✅ Confirmar times
          {manualFormat && <span className="ml-1.5 opacity-70 text-[10px] font-mono">{manualFormat}</span>}
        </Btn>
      </div>
    </div>
  );
}
