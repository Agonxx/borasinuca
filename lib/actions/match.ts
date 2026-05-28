"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function registerMatch(formData: FormData) {
  const groupId = formData.get("group_id") as string;
  const teamA = JSON.parse(formData.get("team_a") as string) as string[];
  const teamB = JSON.parse(formData.get("team_b") as string) as string[];
  const format = formData.get("format") as string;
  const winnerSide = (formData.get("winner_side") as "A" | "B") || null;

  if (!groupId || !teamA?.length || !teamB?.length || !format) {
    return { error: "Dados incompletos" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("group_id", groupId)
    .eq("archived", false)
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  const { error: matchError } = await supabase
    .from("matches")
    .insert({
      group_id: groupId,
      season_id: season?.id ?? null,
      format,
      team_a: teamA,
      team_b: teamB,
      winner_side: winnerSide ?? null,
      registered_by: user.id,
    });

  if (matchError) {
    console.error("[registerMatch]", matchError);
    return { error: matchError.message };
  }

  redirect("/partidas");
}

export async function registerResult(formData: FormData) {
  const matchId = parseInt(formData.get("match_id") as string);
  const winnerSide = formData.get("winner_side") as "A" | "B";

  if (!matchId || !winnerSide) return { error: "Dados inválidos" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error: updateError } = await supabase
    .from("matches")
    .update({ winner_side: winnerSide })
    .eq("id", matchId);

  if (updateError) {
    console.error("[registerResult]", updateError);
    return { error: updateError.message };
  }

  // Liquidar bolões abertos ou fechados desta partida
  const { data: bolaos } = await supabase
    .from("bolaos")
    .select("id")
    .eq("match_id", matchId)
    .in("status", ["open", "closed"]);

  for (const bolao of bolaos ?? []) {
    const { error: rpcError } = await supabase.rpc("settle_bolao", {
      p_bolao_id: bolao.id,
      p_winner_side: winnerSide,
    });
    if (rpcError) console.error("[settle_bolao]", rpcError);
  }

  revalidatePath("/partidas");
  revalidatePath("/bolao");
  revalidatePath("/home");
  revalidatePath("/ranking");
  redirect("/partidas");
}
