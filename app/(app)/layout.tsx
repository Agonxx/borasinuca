import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/ui/AppHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import { getUser, getMembership } from "@/lib/data";
import { perfStart } from "@/lib/perf";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const lap = perfStart("layout");
  const user = await getUser();
  lap("getUser");

  let coins: number | undefined;
  let userName: string | undefined;
  let isAdmin = false;

  if (user) {
    const [membership, { data: profileData }] = await Promise.all([
      getMembership(user.id),
      createClient().then(sb => sb.from("profiles").select("name").eq("id", user.id).single()),
    ]);
    lap("membership+profile");
    coins = membership?.coins;
    isAdmin = membership?.role === "owner" || membership?.role === "admin";
    userName = profileData?.name ?? user.user_metadata?.name ?? user.email?.split("@")[0];
  }
  lap("done");

  return (
    <div className="flex flex-col h-full max-w-[430px] mx-auto bg-bg">
      <AppHeader saldo={coins} userName={userName} />
      <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
