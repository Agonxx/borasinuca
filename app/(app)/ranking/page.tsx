import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui";
import { redirect } from "next/navigation";

interface Match {
  team_a: string[];
  team_b: string[];
  winner_side: "A" | "B" | null;
}

function calcStats(matches: Match[], userId: string) {
  let wins = 0, losses = 0, streak = 0, cur = 0;
  const sorted = [...matches]
    .filter(m => m.winner_side && (m.team_a.includes(userId) || m.team_b.includes(userId)))
    .reverse();

  for (const m of sorted) {
    const onA = m.team_a.includes(userId);
    const won = (onA && m.winner_side === "A") || (!onA && m.winner_side === "B");
    if (won) { wins++; cur++; } else { losses++; cur = 0; }
  }
  streak = cur;
  const wr = wins + losses > 0 ? Math.round(wins / (wins + losses) * 100) : 0;
  return { wins, losses, wr, streak, games: wins + losses };
}

function calcH2H(matches: Match[], me: string, other: string) {
  let myWins = 0, otherWins = 0;
  for (const m of matches) {
    if (!m.winner_side) continue;
    const meOnA = m.team_a.includes(me);
    const meOnB = m.team_b.includes(me);
    const otherOnA = m.team_a.includes(other);
    const otherOnB = m.team_b.includes(other);
    const facedOff = (meOnA && otherOnB) || (meOnB && otherOnA);
    if (!facedOff) continue;
    const mySide: "A" | "B" = meOnA ? "A" : "B";
    if (m.winner_side === mySide) myWins++; else otherWins++;
  }
  return { myWins, otherWins, total: myWins + otherWins };
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("player_id", user.id)
    .limit(1)
    .single();

  if (!membership) redirect("/onboarding");

  const [{ data: members }, { data: matches }] = await Promise.all([
    supabase
      .from("group_members")
      .select("player_id, role, coins, profiles(id, name)")
      .eq("group_id", membership.group_id),
    supabase
      .from("matches")
      .select("team_a, team_b, winner_side")
      .eq("group_id", membership.group_id),
  ]);

  const allMatches: Match[] = matches ?? [];

  const ranked = (members ?? [])
    .map((m) => {
      const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      const name = (p as { name: string } | null)?.name ?? "?";
      const stats = calcStats(allMatches, m.player_id);
      return { id: m.player_id, name, role: m.role, coins: m.coins, ...stats };
    })
    .sort((a, b) => b.coins - a.coins || b.wins - a.wins);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="text-[18px] font-bold">Ranking</div>
        <span className="text-[11px] text-text-faint">{ranked.length} jogadores</span>
      </div>

      <div className="flex flex-col gap-2">
        {ranked.map((player, i) => {
          const isMe = player.id === user.id;
          const h2h = !isMe ? calcH2H(allMatches, user.id, player.id) : null;

          return (
            <div
              key={player.id}
              className={`rounded-[14px] border px-3 py-3 ${
                isMe ? "border-mint bg-mint-faint" : "border-border bg-surface"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Position */}
                <div className="w-7 text-center shrink-0">
                  {i < 3 ? (
                    <span className="text-[17px]">{MEDALS[i]}</span>
                  ) : (
                    <span className="text-[12px] font-bold text-text-faint">{i + 1}</span>
                  )}
                </div>

                <Avatar name={player.name} size={36} ring={isMe} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[13px] font-bold truncate">{player.name.split(" ")[0]}</span>
                    {(player.role === "owner" || player.role === "admin") && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--gold-faint)] text-gold border border-gold/30 shrink-0">
                        {player.role === "owner" ? "DONO" : "ADMIN"}
                      </span>
                    )}
                    {player.streak > 0 && (
                      <span className="text-[9px] font-bold text-orange-400 shrink-0">
                        🔥{player.streak}
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-text-dim mt-0.5">
                    {player.games > 0
                      ? `${player.wins}V ${player.losses}D · ${player.wr}% · ${player.games} jogos`
                      : "Sem partidas"}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className="text-[15px] font-bold"
                    style={{ color: isMe ? "#4fd1a3" : "#f4c95d" }}
                  >
                    {player.coins}
                  </span>
                  <span className="text-[12px]">🪙</span>
                </div>
              </div>

              {/* H2H vs me */}
              {h2h && h2h.total > 0 && (
                <div className="mt-2 ml-10 flex items-center gap-1.5">
                  <span className="text-[9px] text-text-faint uppercase tracking-wider">vs você</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-[6px]"
                    style={{
                      background: h2h.myWins >= h2h.otherWins ? "var(--mint-faint)" : "var(--danger-faint)",
                      color: h2h.myWins >= h2h.otherWins ? "#4fd1a3" : "#ef4757",
                    }}
                  >
                    {h2h.myWins}-{h2h.otherWins}
                  </span>
                  <span className="text-[9px] text-text-faint">{h2h.total} confronto{h2h.total > 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
