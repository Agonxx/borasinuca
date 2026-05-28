import { createClient } from "@/lib/supabase/server";
import { BolaoClient } from "./BolaoClient";
import { redirect } from "next/navigation";
import { getUser, getMembership } from "@/lib/data";
import { perfStart } from "@/lib/perf";

interface BolaoWithMatch {
  id: string;
  status: "open" | "settled";
  closes_at: string | null;
  created_at: string;
  match_id: number;
  match: {
    id: number;
    format: string;
    team_a: string[];
    team_b: string[];
    winner_side: "A" | "B" | null;
    group_id: string;
  };
}

export default async function BolaoPage() {
  const lap = perfStart("bolao");
  const user = await getUser();
  lap("getUser");
  if (!user) return null;

  const supabase = await createClient();
  const membership = await getMembership(user.id);
  lap("membership");
  if (!membership) redirect("/onboarding");

  // Paralelo: membros + bolões com dados da partida embutidos (1 query ao invés de 3)
  const [membersResult, bolaosResult] = await Promise.all([
    supabase
      .from("group_members")
      .select("player_id, profiles(id, name)")
      .eq("group_id", membership.group_id),
    supabase
      .from("bolaos")
      .select(
        "id, status, closes_at, created_at, match_id, match:matches!inner(id, format, team_a, team_b, winner_side, group_id)"
      )
      .eq("matches.group_id", membership.group_id)
      .in("status", ["open", "settled"])
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  lap("members+bolaos (parallel)");

  const profileMap: Record<string, string> = {};
  (membersResult.data ?? []).forEach((m) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    if (p) profileMap[m.player_id] = (p as { name: string }).name;
  });

  const bolaos = (bolaosResult.data ?? [])
    .map((b) => ({ ...b, match: Array.isArray(b.match) ? b.match[0] : b.match }))
    .filter((b): b is BolaoWithMatch => !!b.match);
  const bolaoIds = bolaos.map((b) => b.id);

  const { data: myBets } =
    bolaoIds.length > 0
      ? await supabase
          .from("bets")
          .select("bolao_id, pick_side, stake, result, payout")
          .eq("player_id", user.id)
          .in("bolao_id", bolaoIds)
      : { data: [] };
  lap("myBets");

  const betMap: Record<
    string,
    { pick_side: string; stake: number; result: string | null; payout: number | null }
  > = {};
  (myBets ?? []).forEach((b) => {
    betMap[b.bolao_id] = b;
  });
  lap("done");

  return (
    <BolaoClient
      bolaos={bolaos}
      betMap={betMap}
      profileMap={profileMap}
      userCoins={membership.coins}
    />
  );
}
