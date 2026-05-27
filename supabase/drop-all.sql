-- Drop tudo — rodar antes de recriar o schema
drop table if exists public.bets             cascade;
drop table if exists public.bolaos           cascade;
drop table if exists public.group_invites    cascade;
drop table if exists public.matches          cascade;
drop table if exists public.seasons          cascade;
drop table if exists public.group_members    cascade;
drop table if exists public.groups           cascade;
drop table if exists public.profiles         cascade;

drop trigger   if exists on_auth_user_created on auth.users;
drop function  if exists public.handle_new_user();
drop function  if exists public.get_my_group_ids();
drop function  if exists public.is_group_admin(uuid);
drop function  if exists public.find_group_by_invite_code(text);
drop function  if exists public.place_bet(uuid, text, int);
drop function  if exists public.settle_bolao(uuid, text);
