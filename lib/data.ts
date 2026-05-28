import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from './supabase/server';
import { createServerClient } from '@supabase/ssr';

export interface CachedMember {
  player_id: string;
  role: string;
  coins: number;
  profiles: { id: string; name: string } | { id: string; name: string }[] | null;
}

export interface CachedMatch {
  id: number;
  format: string;
  team_a: string[];
  team_b: string[];
  winner_side: 'A' | 'B' | null;
  played_at: string;
}

function makeAuthClient(token: string) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      cookies: { getAll: () => [], setAll: () => {} },
    }
  );
}

// Deduplicates auth.getUser() across layout + page within the same request
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

// Reads from cookie only — no network call
export const getAccessToken = cache(async () => {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? '';
});

// Deduplicates membership query across layout + page within the same request
export const getMembership = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('group_members')
    .select('group_id, role, coins')
    .eq('player_id', userId)
    .limit(1)
    .single();
  return data as { group_id: string; role: string; coins: number } | null;
});

// Cross-request cache: group member list changes rarely, tagged for revalidation on mutations
export const getCachedGroupMembers = unstable_cache(
  async (groupId: string, token: string): Promise<CachedMember[]> => {
    const db = makeAuthClient(token);
    const { data } = await db
      .from('group_members')
      .select('player_id, role, coins, profiles(id, name)')
      .eq('group_id', groupId);
    return (data ?? []) as CachedMember[];
  },
  ['grp-members'],
  { tags: ['group-data'], revalidate: 30 }
);

// Cross-request cache: match list tagged for revalidation after registerMatch/registerResult
export const getCachedMatches = unstable_cache(
  async (groupId: string, token: string): Promise<CachedMatch[]> => {
    const db = makeAuthClient(token);
    const { data } = await db
      .from('matches')
      .select('id, format, team_a, team_b, winner_side, played_at')
      .eq('group_id', groupId)
      .order('played_at', { ascending: false })
      .limit(50);
    return (data ?? []) as CachedMatch[];
  },
  ['grp-matches'],
  { tags: ['match-data'], revalidate: 30 }
);
