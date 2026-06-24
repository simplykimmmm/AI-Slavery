import type { AgentLog, Json, LogLevel } from "../types/database";
import { requireSupabase, throwIfSupabaseError } from "./supabaseService";

export interface CreateLogInput {
  agent_id?: string | null;
  task_id?: string | null;
  room?: string | null;
  level?: LogLevel;
  message: string;
  metadata?: Json;
}

export const getRecentLogs = async (limit = 100): Promise<AgentLog[]> => {
  const { data, error } = await requireSupabase()
    .from("agent_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  throwIfSupabaseError(error);
  return (data ?? []) as AgentLog[];
};

export const getLogsByAgent = async (agentId: string, limit = 100): Promise<AgentLog[]> => {
  const { data, error } = await requireSupabase()
    .from("agent_logs")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  throwIfSupabaseError(error);
  return (data ?? []) as AgentLog[];
};

export const createLog = async (input: CreateLogInput): Promise<AgentLog> => {
  const { data, error } = await requireSupabase()
    .from("agent_logs")
    .insert({
      agent_id: input.agent_id ?? null,
      task_id: input.task_id ?? null,
      room: input.room ?? null,
      level: input.level ?? "INFO",
      message: input.message,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  throwIfSupabaseError(error);
  return data as AgentLog;
};
