import { createClient } from "@/lib/supabase/server";
import { RegistrarClient } from "./RegistrarClient";
import { redirect } from "next/navigation";

interface SearchParams { match_id?: string }

export default async function RegistrarPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
        <div className="text-3xl">🔒</div>
        <div className="text-[14px] font-semibold">Só admins podem registrar resultados</div>
      </div>
    );
  }

  const [{ data: pendingMatches }, { data: members }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, format, team_a, team_b, played_at")
      .eq("group_id", membership.group_id)
      .is("winner_side", null)
      .order("played_at", { ascending: false }),
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

  const params = await searchParams;
  const initialMatchId = params.match_id ? parseInt(params.match_id) : undefined;

  return (
    <RegistrarClient
      matches={pendingMatches ?? []}
      profileMap={profileMap}
      initialMatchId={initialMatchId}
    />
  );
}
