import type { LedgerEntry } from "../types/database";
import { requireSupabase, throwIfSupabaseError } from "./supabaseService";

export type CreateLedgerEntryInput = Omit<LedgerEntry, "id" | "created_at">;

export const createLedgerEntry = async (input: CreateLedgerEntryInput): Promise<LedgerEntry> => {
  const { data, error } = await requireSupabase().from("ledger_entries").insert(input).select("*").single();
  throwIfSupabaseError(error);
  return data as LedgerEntry;
};

export const getLedgerByAgent = async (agentId: string): Promise<LedgerEntry[]> => {
  const { data, error } = await requireSupabase().from("ledger_entries").select("*").eq("agent_id", agentId).order("created_at", { ascending: false });
  throwIfSupabaseError(error);
  return (data ?? []) as LedgerEntry[];
};

export const getTotalCost = async (): Promise<number> => {
  const { data, error } = await requireSupabase().from("ledger_entries").select("estimated_cost");
  throwIfSupabaseError(error);
  return (data ?? []).reduce((total, row) => total + Number(row.estimated_cost ?? 0), 0);
};
