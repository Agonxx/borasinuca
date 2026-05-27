import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/ui/AppHeader";
import { BottomNav } from "@/components/ui/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let coins: number | undefined;
  let userName: string | undefined;
  let isAdmin = false;

  if (user) {
    const [{ data: memberData }, { data: profileData }] = await Promise.all([
      supabase.from("group_members").select("coins, role").eq("player_id", user.id).limit(1).single(),
      supabase.from("profiles").select("name").eq("id", user.id).single(),
    ]);
    coins = memberData?.coins;
    userName = profileData?.name ?? user.user_metadata?.name ?? user.email?.split("@")[0];
    isAdmin = memberData?.role === "owner" || memberData?.role === "admin";
  }

  return (
    <div className="flex flex-col h-full max-w-[430px] mx-auto bg-bg">
      <AppHeader saldo={coins} userName={userName} />
      <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
