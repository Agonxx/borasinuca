import { createClient } from "@/lib/supabase/server";
import { SortearClient } from "./SortearClient";
import { redirect } from "next/navigation";

export default async function SortearPage() {
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
        <div className="text-[14px] font-semibold">Só admins podem sortear</div>
        <div className="text-[12px] text-text-dim">Peça ao dono do grupo para fazer o sorteio</div>
      </div>
    );
  }

  const { data: members } = await supabase
    .from("group_members")
    .select("player_id, profiles(id, name)")
    .eq("group_id", membership.group_id);

  const players = (members ?? [])
    .map((m) => {
      const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return { id: m.player_id, name: (p as { name: string } | null)?.name ?? "?" };
    })
    .filter((p) => p.name !== "?");

  return (
    <SortearClient
      players={players}
      groupId={membership.group_id}
      currentUserId={user.id}
    />
  );
}
