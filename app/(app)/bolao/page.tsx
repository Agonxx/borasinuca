import { createClient } from "@/lib/supabase/server";
import { BolaoClient } from "./BolaoClient";
import { redirect } from "next/navigation";

export default async function BolaoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, coins")
    .eq("player_id", user.id)
    .limit(1)
    .single();

  if (!membership) redirect("/onboarding");

  // Build profile map
  const { data: members } = await supabase
    .from("group_members")
    .select("player_id, profiles(id, name)")
    .eq("group_id", membership.group_id);

  const profileMap: Record<string, string> = {};
  (members ?? []).forEach((m) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    if (p) profileMap[m.player_id] = (p as { name: string }).name;
  });

  // Fetch match IDs for this group
  const { data: groupMatches } = await supabase
    .from("matches")
    .select("id")
    .eq("group_id", membership.group_id);

  const matchIds = (groupMatches ?? []).map((m) => m.id);

  if (matchIds.length === 0) {
    return (
      <BolaoClient
        bolaos={[]}
        betMap={{}}
        profileMap={profileMap}
        userCoins={membership.coins}
      />
    );
  }

  // Fetch bolões for group matches
  const { data: bolaosRaw } = await supabase
    .from("bolaos")
    .select("id, status, closes_at, created_at, match_id")
    .in("match_id", matchIds)
    .in("status", ["open", "settled"])
    .order("created_at", { ascending: false })
    .limit(30);

  const bolaoMatchIds = [...new Set((bolaosRaw ?? []).map((b) => b.match_id))];
  const { data: matchDetails } = await supabase
    .from("matches")
    .select("id, format, team_a, team_b, winner_side")
    .in("id", bolaoMatchIds);

  const matchMap: Record<number, { id: number; format: string; team_a: string[]; team_b: string[]; winner_side: "A" | "B" | null }> = {};
  (matchDetails ?? []).forEach((m) => { matchMap[m.id] = m; });

  const bolaos = (bolaosRaw ?? [])
    .filter((b) => matchMap[b.match_id])
    .map((b) => ({ ...b, match: matchMap[b.match_id] }));

  // User's bets
  const bolaoIds = bolaos.map((b) => b.id);
  const { data: myBets } = bolaoIds.length > 0
    ? await supabase
        .from("bets")
        .select("bolao_id, pick_side, stake, result, payout")
        .eq("player_id", user.id)
        .in("bolao_id", bolaoIds)
    : { data: [] };

  const betMap: Record<string, { pick_side: string; stake: number; result: string | null; payout: number | null }> = {};
  (myBets ?? []).forEach((b) => { betMap[b.bolao_id] = b; });

  return (
    <BolaoClient
      bolaos={bolaos}
      betMap={betMap}
      profileMap={profileMap}
      userCoins={membership.coins}
    />
  );
}
