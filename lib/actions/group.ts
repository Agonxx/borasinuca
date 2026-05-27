"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function ensureProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string; user_metadata?: Record<string, string> }
) {
  const name =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Jogador";

  await supabase
    .from("profiles")
    .upsert({ id: user.id, name }, { onConflict: "id", ignoreDuplicates: false });
}

export async function createGroup(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome do grupo é obrigatório" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // Garante que o perfil existe (segurança caso o trigger não tenha disparado)
  await ensureProfile(supabase, user);

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({ name, owner_id: user.id })
    .select("id")
    .single();

  if (groupError || !group) {
    console.error("[createGroup] groups insert:", groupError);
    return { error: groupError?.message ?? "Erro ao criar grupo" };
  }

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, player_id: user.id, role: "owner", coins: 100 });

  if (memberError) {
    console.error("[createGroup] group_members insert:", memberError);
    return { error: memberError.message };
  }

  const now = new Date();
  const monthName = now.toLocaleString("pt-BR", { month: "long", year: "numeric" });
  await supabase
    .from("seasons")
    .insert({ group_id: group.id, name: monthName.charAt(0).toUpperCase() + monthName.slice(1) });

  redirect("/home");
}

export async function joinGroup(formData: FormData) {
  const code = (formData.get("code") as string)?.trim().toUpperCase().replace(/-/g, "");
  if (!code) return { error: "Código é obrigatório" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  await ensureProfile(supabase, user);

  // security definer function bypassa RLS — usuário não-membro não consegue ver groups diretamente
  const { data: groups, error: groupError } = await supabase
    .rpc("find_group_by_invite_code", { code });

  const group = groups?.[0];
  if (groupError || !group) return { error: "Código inválido — confirma com quem te convidou" };

  const { data: existing } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("player_id", user.id)
    .single();

  if (existing) redirect("/home");

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, player_id: user.id, role: "player", coins: 100 });

  if (memberError) {
    console.error("[joinGroup] group_members insert:", memberError);
    return { error: memberError.message };
  }

  redirect("/home");
}
