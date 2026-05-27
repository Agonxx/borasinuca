-- Correção de políticas RLS em falta
-- Rodar no SQL Editor do Supabase

-- profiles: permitir insert do próprio usuário (necessário se trigger não disparar)
create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- seasons: permitir insert por admins
create policy "seasons: admins can insert"
  on public.seasons for insert
  with check (exists (
    select 1 from public.group_members
    where group_id = seasons.group_id
      and player_id = auth.uid()
      and role in ('owner', 'admin')
  ));
