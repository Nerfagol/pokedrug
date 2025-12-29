import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.public.js";

export function makeSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export async function fetchTop(supabase, limit = 10) {
  return await supabase
    .from("leaderboard_entries")
    .select("nickname, score, answered, accuracy, acc_drug, acc_pokemon, max_streak, created_at")
    .order("score", { ascending: false })
    .order("answered", { ascending: false })
    .order("accuracy", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
}

export async function insertEntry(supabase, payload) {
  return await supabase.from("leaderboard_entries").insert(payload);
}
