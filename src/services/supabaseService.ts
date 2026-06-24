import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export const requireSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
};

export const throwIfSupabaseError = (error: PostgrestError | null) => {
  if (error) {
    throw new Error(error.message);
  }
};
