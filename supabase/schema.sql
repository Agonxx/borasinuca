-- BoraSinuca — schema completo
-- 1. Rodar drop-all.sql para limpar
-- 2. Rodar este arquivo no SQL Editor do Supabase

-- ─────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  avatar_color text,
  created_at   timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- GROUPS
-- ─────────────────────────────────────────────────────────────
create table public.groups (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  invite_code       text unique not null default upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  owner_id          uuid not null references public.profiles(id),
  initial_coins     int not null default 100,
  max_bet           int not null default 5,
  default_format    text not null default '2x2' check (default_format in ('1x1','2x1','2x2')),
  who_registers     text not null default 'admins' check (who_registers in ('admins','all')),
  who_creates_bolao text not null default 'admins' check (who_creates_bolao in ('admins','all')),
  created_at        timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- GROUP MEMBERS
-- ─────────────────────────────────────────────────────────────
create table public.group_members (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references public.groups(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  role      text not null default 'player' check (role in ('owner','admin','player')),
  coins     int not null default 100,
  joined_at timestamptz default now(),
  unique (group_id, player_id)
);

-- ─────────────────────────────────────────────────────────────
-- SEASONS
-- ─────────────────────────────────────────────────────────────
create table public.seasons (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  name       text not null,
  started_at timestamptz default now(),
  ended_at   timestamptz,
  archived   boolean not null default false
);

-- ─────────────────────────────────────────────────────────────
-- MATCHES
-- ─────────────────────────────────────────────────────────────
create table public.matches (
  id            bigint primary key generated always as identity,
  group_id      uuid not null references public.groups(id) on delete cascade,
  season_id     uuid references public.seasons(id),
  format        text not null check (format in ('1x1','2x1','2x2')),
  team_a        uuid[] not null,
  team_b        uuid[] not null,
  winner_side   text check (winner_side in ('A','B')),
  score_a       int,
  score_b       int,
  duration_min  int,
  registered_by uuid references public.profiles(id),
  played_at     timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- BOLÕES
-- ─────────────────────────────────────────────────────────────
create table public.bolaos (
  id         uuid primary key default gen_random_uuid(),
  match_id   bigint not null references public.matches(id) on delete cascade,
  status     text not null default 'open' check (status in ('open','closed','settled')),
  closes_at  timestamptz,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- BETS
-- ─────────────────────────────────────────────────────────────
create table public.bets (
  id         uuid primary key default gen_random_uuid(),
  bolao_id   uuid not null references public.bolaos(id) on delete cascade,
  player_id  uuid not null references public.profiles(id),
  pick_side  text not null check (pick_side in ('A','B')),
  stake      int not null check (stake between 1 and 5),
  result     text check (result in ('won','lost')),
  payout     int,
  created_at timestamptz default now(),
  unique (bolao_id, player_id)
);

-- ─────────────────────────────────────────────────────────────
-- GROUP INVITES
-- ─────────────────────────────────────────────────────────────
create table public.group_invites (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups(id) on delete cascade,
  email       text not null,
  invited_by  uuid references public.profiles(id),
  accepted_at timestamptz,
  created_at  timestamptz default now(),
  unique (group_id, email)
);

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.seasons       enable row level security;
alter table public.matches       enable row level security;
alter table public.bolaos        enable row level security;
alter table public.bets          enable row level security;
alter table public.group_invites enable row level security;

-- ─────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS (security definer — evita recursão RLS)
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_my_group_ids()
returns setof uuid language sql security definer stable set search_path = ''
as $$
  select group_id from public.group_members where player_id = auth.uid()
$$;

create or replace function public.is_group_admin(gid uuid)
returns boolean language sql security definer stable set search_path = ''
as $$
  select exists(
    select 1 from public.group_members
    where group_id = gid and player_id = auth.uid() and role in ('owner','admin')
  )
$$;

create or replace function public.find_group_by_invite_code(code text)
returns table(id uuid, name text) language sql security definer stable set search_path = ''
as $$
  select id, name from public.groups where invite_code = code limit 1
$$;

-- ─────────────────────────────────────────────────────────────
-- BOLÃO FUNCTIONS
-- ─────────────────────────────────────────────────────────────
create or replace function public.place_bet(p_bolao_id uuid, p_pick_side text, p_stake int)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_group_id uuid;
  v_coins    int;
begin
  if p_stake < 1 or p_stake > 5 then
    return json_build_object('error', 'Stake inválido (1-5)');
  end if;
  if p_pick_side not in ('A','B') then
    return json_build_object('error', 'Lado inválido');
  end if;
  if not exists (select 1 from public.bolaos where id = p_bolao_id and status = 'open') then
    return json_build_object('error', 'Bolão não está aberto');
  end if;
  if exists (select 1 from public.bets where bolao_id = p_bolao_id and player_id = auth.uid()) then
    return json_build_object('error', 'Você já apostou neste bolão');
  end if;
  select m.group_id into v_group_id
  from public.bolaos bl
  join public.matches m on m.id = bl.match_id
  where bl.id = p_bolao_id;
  select coins into v_coins
  from public.group_members
  where player_id = auth.uid() and group_id = v_group_id;
  if v_coins < p_stake then
    return json_build_object('error', 'Moedas insuficientes');
  end if;
  update public.group_members
    set coins = coins - p_stake
    where player_id = auth.uid() and group_id = v_group_id;
  insert into public.bets (bolao_id, player_id, pick_side, stake)
    values (p_bolao_id, auth.uid(), p_pick_side, p_stake);
  return json_build_object('ok', true);
end;
$$;

create or replace function public.settle_bolao(p_bolao_id uuid, p_winner_side text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_group_id uuid;
  v_payout   int;
  r          record;
begin
  select m.group_id into v_group_id
  from public.bolaos bl
  join public.matches m on m.id = bl.match_id
  where bl.id = p_bolao_id;

  update public.bets set result = 'lost', payout = 0
  where bolao_id = p_bolao_id and pick_side != p_winner_side;

  for r in
    select id, player_id, stake
    from public.bets
    where bolao_id = p_bolao_id and pick_side = p_winner_side
  loop
    v_payout := r.stake * 2;
    update public.bets set result = 'won', payout = v_payout where id = r.id;
    update public.group_members
      set coins = coins + v_payout
      where player_id = r.player_id and group_id = v_group_id;
  end loop;

  update public.bolaos set status = 'settled' where id = p_bolao_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- POLICIES — profiles
-- ─────────────────────────────────────────────────────────────
create policy "profiles: select own" on public.profiles for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id);
create policy "profiles: group members can select" on public.profiles for select
  using (id in (
    select player_id from public.group_members
    where group_id in (select public.get_my_group_ids())
  ));

-- ─────────────────────────────────────────────────────────────
-- POLICIES — groups
-- ─────────────────────────────────────────────────────────────
create policy "groups: members or owner can select" on public.groups for select
  using (
    owner_id = auth.uid()
    or exists (select 1 from public.group_members where group_id = id and player_id = auth.uid())
  );
create policy "groups: owner can update" on public.groups for update using (owner_id = auth.uid());
create policy "groups: authenticated can insert" on public.groups for insert with check (auth.uid() is not null);

-- ─────────────────────────────────────────────────────────────
-- POLICIES — group_members
-- ─────────────────────────────────────────────────────────────
create policy "group_members: members can select" on public.group_members for select
  using (group_id in (select public.get_my_group_ids()));
create policy "group_members: authenticated can insert" on public.group_members for insert
  with check (auth.uid() is not null);
create policy "group_members: admins can update" on public.group_members for update
  using (public.is_group_admin(group_id));
create policy "group_members: player can update own record" on public.group_members for update
  using (player_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- POLICIES — seasons
-- ─────────────────────────────────────────────────────────────
create policy "seasons: members can select" on public.seasons for select
  using (exists (select 1 from public.group_members where group_id = seasons.group_id and player_id = auth.uid()));
create policy "seasons: admins can insert" on public.seasons for insert
  with check (exists (
    select 1 from public.group_members
    where group_id = seasons.group_id and player_id = auth.uid() and role in ('owner','admin')
  ));

-- ─────────────────────────────────────────────────────────────
-- POLICIES — matches
-- ─────────────────────────────────────────────────────────────
create policy "matches: members can select" on public.matches for select
  using (exists (select 1 from public.group_members where group_id = matches.group_id and player_id = auth.uid()));
create policy "matches: admins can insert" on public.matches for insert
  with check (exists (
    select 1 from public.group_members
    where group_id = matches.group_id and player_id = auth.uid() and role in ('owner','admin')
  ));
create policy "matches: admins can update" on public.matches for update
  using (exists (
    select 1 from public.group_members
    where group_id = matches.group_id and player_id = auth.uid() and role in ('owner','admin')
  ));

-- ─────────────────────────────────────────────────────────────
-- POLICIES — bolaos
-- ─────────────────────────────────────────────────────────────
create policy "bolaos: members can select" on public.bolaos for select
  using (exists (
    select 1 from public.matches m
    join public.group_members gm on gm.group_id = m.group_id
    where m.id = bolaos.match_id and gm.player_id = auth.uid()
  ));
create policy "bolaos: admins can insert" on public.bolaos for insert
  with check (public.is_group_admin(
    (select group_id from public.matches where id = bolaos.match_id)
  ));
create policy "bolaos: admins can update" on public.bolaos for update
  using (public.is_group_admin(
    (select group_id from public.matches where id = bolaos.match_id)
  ));

-- ─────────────────────────────────────────────────────────────
-- POLICIES — bets
-- ─────────────────────────────────────────────────────────────
create policy "bets: members can select" on public.bets for select
  using (exists (
    select 1 from public.bolaos b
    join public.matches m on m.id = b.match_id
    join public.group_members gm on gm.group_id = m.group_id
    where b.id = bets.bolao_id and gm.player_id = auth.uid()
  ));
create policy "bets: members can insert own bet" on public.bets for insert
  with check (player_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- POLICIES — group_invites
-- ─────────────────────────────────────────────────────────────
create policy "invites: members can select" on public.group_invites for select
  using (exists (select 1 from public.group_members where group_id = group_invites.group_id and player_id = auth.uid()));
