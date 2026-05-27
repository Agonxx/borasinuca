import { createClient } from "@/lib/supabase/server";
import { OnboardingClient } from "./OnboardingClient";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Jogador";

  return (
    <OnboardingClient
      userName={userName}
      userEmail={user?.email ?? ""}
    />
  );
}
