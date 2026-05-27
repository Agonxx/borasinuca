import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui";
import { redirect } from "next/navigation";
import { MatchAdminActions } from "./MatchAdminActions";

interface Match {
  id: number;
  format: string;
  team_a: string[];
  team_b: string[];
  winner_side: "A" | "B" | null;
  played_at: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    .replace(".", "")
    .replace(",", " ·");
}

function TeamRow({ playerIds, profiles }: { playerIds: string[]; profiles: Record<string, string> }) {
  return (
    <div className="flex flex-col gap-1">
      {playerIds.map((id) => (
        <div key={id} className="flex items-center gap-1">
          <Avatar name={profiles[id] ?? "?"} size={18} />
          <span className="text-[11px] font-medium">{(profiles[id] ?? "?").split(" ")[0]}</span>
        </div>
      ))}
    </div>
  );
}

export default async function PartidasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("player_id", user.id)
    .limit(1)
    .single();

  if (!membership) redirect("/onboarding");

  const isAdmin = membership.role === "owner" || membership.role === "admin";

  const [{ data: matches }, { data: members }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, format, team_a, team_b, winner_side, played_at")
      .eq("group_id", membership.group_id)
      .order("played_at", { ascending: false })
      .limit(50),
    supabase
      .from("group_members")
      .select("player_id, profiles(id, name)")
      .eq("group_id", membership.group_id),
  ]);

  const profileMap: Record<string, string> = {};
  (members ?? []).forEach((m) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    if (p) profileMap[m.player_id] = (p as { name: string }).name;
  });

  const allMatches: Match[] = matches ?? [];

  // Bolões existentes (para saber quais partidas já têm bolão)
  const matchIds = allMatches.map((m) => m.id);
  const { data: bolaos } = matchIds.length > 0
    ? await supabase
        .from("bolaos")
        .select("match_id, status")
        .in("match_id", matchIds)
    : { data: [] };

  const bolaoByMatch: Record<number, string> = {};
  (bolaos ?? []).forEach((b) => { bolaoByMatch[b.match_id] = b.status; });

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="text-[18px] font-bold">Partidas</div>
        <span className="text-[11px] text-text-faint">{allMatches.length} registradas</span>
      </div>

      {allMatches.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-2 text-center">
          <div className="text-3xl">🎱</div>
          <div className="text-[13px] text-text-dim">Nenhuma partida ainda</div>
          <div className="text-[11px] text-text-faint">As partidas registradas aparecerão aqui</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {allMatches.map((match) => {
            const onA = match.team_a.includes(user.id);
            const onB = match.team_b.includes(user.id);
            const played = onA || onB;
            const won =
              played && match.winner_side
                ? (onA && match.winner_side === "A") || (onB && match.winner_side === "B")
                : null;
            const isPending = !match.winner_side;
            const bolaoStatus = bolaoByMatch[match.id];

            return (
              <div
                key={match.id}
                className="bg-surface border border-border rounded-[14px] px-3 py-3 flex flex-col gap-2"
              >
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold font-mono bg-surface-3 border border-border-2 px-1.5 py-0.5 rounded-md text-text-dim">
                      {match.format}
                    </span>
                    {isPending && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--gold-faint)] text-gold border border-gold/30">
                        PENDENTE
                      </span>
                    )}
                    {played && won !== null && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{
                          background: won ? "var(--mint-faint)" : "var(--danger-faint)",
                          color: won ? "#4fd1a3" : "#ef4757",
                        }}
                      >
                        {won ? "V" : "D"}
                      </span>
                    )}
                    {bolaoStatus && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-surface-3 border border-border-2 text-text-faint">
                        🎲 {bolaoStatus === "settled" ? "bolão liquidado" : "bolão aberto"}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-text-faint">{formatDate(match.played_at)}</span>
                </div>

                {/* Teams */}
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 rounded-[10px] p-2"
                    style={{
                      background: match.winner_side === "A" ? "var(--mint-faint)" : "var(--surface-2)",
                      border: match.winner_side === "A" ? "1px solid rgba(79,209,163,0.3)" : "1px solid var(--border)",
                    }}
                  >
                    <div className="text-[9px] font-bold text-text-faint uppercase tracking-wider mb-1">
                      {match.winner_side === "A" ? "👑 Time A" : "Time A"}
                    </div>
                    <TeamRow playerIds={match.team_a} profiles={profileMap} />
                  </div>

                  <div className="text-[11px] font-bold text-text-faint self-center">VS</div>

                  <div
                    className="flex-1 rounded-[10px] p-2"
                    style={{
                      background: match.winner_side === "B" ? "var(--mint-faint)" : "var(--surface-2)",
                      border: match.winner_side === "B" ? "1px solid rgba(79,209,163,0.3)" : "1px solid var(--border)",
                    }}
                  >
                    <div className="text-[9px] font-bold text-text-faint uppercase tracking-wider mb-1">
                      {match.winner_side === "B" ? "👑 Time B" : "Time B"}
                    </div>
                    <TeamRow playerIds={match.team_b} profiles={profileMap} />
                  </div>
                </div>

                {/* Admin actions — only on pending matches */}
                {isAdmin && isPending && (
                  <MatchAdminActions
                    matchId={match.id}
                    hasBolao={!!bolaoStatus}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
