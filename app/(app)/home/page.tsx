import { createClient } from "@/lib/supabase/server";
import { Avatar, Card, Stat, Pill, CopyCode } from "@/components/ui";
import { getUser, getMembership, getAccessToken, getCachedGroupMembers, getCachedMatches } from "@/lib/data";
import { perfStart } from "@/lib/perf";

interface Profile { id: string; name: string }
interface GroupMember { role: string; coins: number; group_id: string }
interface Match {
  id: number;
  format: string;
  team_a: string[];
  team_b: string[];
  winner_side: "A" | "B" | null;
  played_at: string;
}
interface GroupInfo { id: string; name: string }

function calcStats(matches: Match[], userId: string) {
  let wins = 0, losses = 0, streak = 0, bestStreak = 0, currentStreak = 0;
  const sorted = [...matches].sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());

  for (const m of sorted) {
    if (!m.winner_side) continue;
    const onA = m.team_a.includes(userId);
    const onB = m.team_b.includes(userId);
    if (!onA && !onB) continue;
    const won = (onA && m.winner_side === "A") || (onB && m.winner_side === "B");
    if (won) { wins++; currentStreak++; bestStreak = Math.max(bestStreak, currentStreak); }
    else { losses++; currentStreak = 0; }
  }
  streak = currentStreak;
  const wr = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  return { wins, losses, wr, streak };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

function formatOpponent(match: Match, userId: string, profiles: Record<string, string>) {
  const onA = match.team_a.includes(userId);
  const myTeam = onA ? match.team_a : match.team_b;
  const oppTeam = onA ? match.team_b : match.team_a;
  const oppNames = oppTeam.map(id => profiles[id]?.split(" ")[0] ?? "?");
  const myTeamMates = myTeam.filter(id => id !== userId).map(id => profiles[id]?.split(" ")[0] ?? "?");
  const prefix = myTeamMates.length > 0 ? `c/ ${myTeamMates.join("+")} ` : "";
  return `${prefix}vs ${oppNames.join("+")}`;
}

export default async function HomePage() {
  const lap = perfStart("home");
  const [user, token] = await Promise.all([getUser(), getAccessToken()]);
  lap("getUser+token");
  if (!user) return null;

  const supabase = await createClient();

  // Dados do perfil e grupo
  const [{ data: profile }, membership] = await Promise.all([
    supabase.from("profiles").select("id, name").eq("id", user.id).single<Profile>(),
    getMembership(user.id),
  ]);
  lap("profile+membership");

  if (!profile || !membership) return null;

  const { data: groupInfo } = await supabase
    .from("groups")
    .select("id, name, invite_code")
    .eq("id", membership.group_id)
    .single<GroupInfo & { invite_code: string }>();
  lap("groupInfo");

  // Partidas do grupo + membros (cache cross-request, 30s TTL)
  const [allMatches, members] = await Promise.all([
    getCachedMatches(membership.group_id, token),
    getCachedGroupMembers(membership.group_id, token),
  ]);
  lap("matches+members (cache)");

  const profileMap: Record<string, string> = {};
  members.forEach((m) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    if (p) profileMap[m.player_id] = (p as { name: string }).name;
  });

  const stats = calcStats(allMatches, user.id);
  const myMatches = allMatches.filter(m => m.team_a.includes(user.id) || m.team_b.includes(user.id));
  const lastThree = myMatches.slice(0, 3);

  const isAdmin = membership.role === "owner" || membership.role === "admin";
  const firstName = profile.name.split(" ")[0];
  const memberCount = members.length;
  lap("done");

  return (
    <div className="flex flex-col gap-3 p-4 pb-4">
      {/* Greeting */}
      <div className="flex items-center gap-3">
        <Avatar name={profile.name} size={44} />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-text-faint uppercase tracking-[0.8px]">
            {groupInfo?.name ?? "Meu grupo"}
          </div>
          <div className="flex items-center gap-2 text-[18px] font-bold leading-tight">
            Salve, {firstName}
            {isAdmin && (
              <span className="inline-flex items-center px-2 py-[2px] rounded-full text-[9px] font-bold bg-[var(--gold-faint)] text-gold border border-gold/30">
                ADMIN
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Visão geral do grupo — só admin */}
      {isAdmin && (
        <div className="bg-surface border border-border rounded-[14px] px-4 py-3 flex flex-col gap-2">
          <div className="text-[10px] font-bold text-text-faint uppercase tracking-[1px]">Visão geral do grupo</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex flex-col items-center py-1.5 bg-surface-2 rounded-[10px]">
              <span className="text-[20px] font-bold">{memberCount}</span>
              <span className="text-[9px] text-text-faint uppercase tracking-wider mt-0.5">membros</span>
            </div>
            <div className="flex-1 flex flex-col items-center py-1.5 bg-surface-2 rounded-[10px]">
              <span className="text-[20px] font-bold">{allMatches.length}</span>
              <span className="text-[9px] text-text-faint uppercase tracking-wider mt-0.5">partidas</span>
            </div>
            <CopyCode code={groupInfo?.invite_code ?? "—"} />
          </div>
        </div>
      )}

      {/* Stats pessoais */}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Vitórias / Derrotas" value={`${stats.wins}-${stats.losses}`} big />
        <Stat
          label="Win Rate"
          value={`${stats.wr}%`}
          big
        />
        <Stat
          label="Sequência atual"
          value={stats.streak > 0 ? `🔥 ${stats.streak}` : `${stats.streak}`}
          big
        />
        <Stat
          label="Saldo bolão"
          value={`${membership.coins} 🪙`}
          delta={`de 100 inicial`}
          big
        />
      </div>

      {/* Últimas partidas */}
      {lastThree.length > 0 ? (
        <Card title="Suas últimas partidas">
          {lastThree.map((match, i) => {
            const onA = match.team_a.includes(user.id);
            const won = match.winner_side
              ? (onA && match.winner_side === "A") || (!onA && match.winner_side === "B")
              : null;
            return (
              <div
                key={match.id}
                className="flex items-center gap-3 py-2"
                style={{ borderTop: i === 0 ? "none" : "1px solid #243a55" }}
              >
                <div
                  className="w-1 h-7 rounded-sm shrink-0"
                  style={{
                    background: won === null ? "#243a55" : won ? "#4fd1a3" : "#ef4757",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">
                    {formatOpponent(match, user.id, profileMap)}
                  </div>
                  <div className="text-[11px] text-text-dim">
                    {formatDate(match.played_at)} · {match.format}
                  </div>
                </div>
                {won !== null && (
                  <div
                    className="text-[13px] font-bold shrink-0"
                    style={{ color: won ? "#4fd1a3" : "#ef4757" }}
                  >
                    {won ? "V" : "D"}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      ) : (
        <Card title="Suas últimas partidas">
          <div className="flex flex-col items-center py-4 gap-2 text-center">
            <div className="text-3xl">🎱</div>
            <div className="text-[13px] text-text-dim">Sem partidas ainda</div>
            <div className="text-[11px] text-text-faint">
              {isAdmin ? "Registre a primeira partida!" : "Aguardando o admin registrar partidas"}
            </div>
          </div>
        </Card>
      )}

      {/* Atalhos admin */}
      {isAdmin && (
        <div>
          <div className="text-[11px] font-bold text-text-faint uppercase tracking-[1px] mb-2">
            Atalhos do admin
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Sortear duplas", href: "/sortear", color: "mint" },
              { label: "Registrar partida", href: "/partidas/registrar", color: "blue" },
            ].map(({ label, href, color }) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-3 bg-surface border border-border rounded-[12px] p-3 hover:bg-surface-3 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 text-[18px]"
                  style={{
                    background: color === "mint" ? "var(--mint-faint)" : "var(--blue-faint)",
                    color: color === "mint" ? "#4fd1a3" : "#5b8cff",
                  }}
                >
                  {color === "mint" ? "🎲" : "📋"}
                </div>
                <div className="text-[12px] font-semibold">{label}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
