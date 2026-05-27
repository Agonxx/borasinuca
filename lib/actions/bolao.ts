"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createBolao(formData: FormData) {
  const matchId = parseInt(formData.get("match_id") as string);
  const closesAt = (formData.get("closes_at") as string) || null;

  if (!matchId) return { error: "Partida inválida" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("bolaos")
    .insert({ match_id: matchId, closes_at: closesAt });

  if (error) {
    console.error("[createBolao]", error);
    return { error: error.message };
  }

  revalidatePath("/partidas");
  revalidatePath("/bolao");
}

export async function placeBet(formData: FormData) {
  const bolaoId = formData.get("bolao_id") as string;
  const pickSide = formData.get("pick_side") as "A" | "B";
  const stake = parseInt(formData.get("stake") as string);

  if (!bolaoId || !pickSide || !stake) return { error: "Dados inválidos" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data, error } = await supabase.rpc("place_bet", {
    p_bolao_id: bolaoId,
    p_pick_side: pickSide,
    p_stake: stake,
  });

  if (error) {
    console.error("[placeBet]", error);
    return { error: error.message };
  }

  const result = data as { error?: string; ok?: boolean };
  if (result?.error) return { error: result.error };

  revalidatePath("/bolao");
}
