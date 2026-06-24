import type { Agent, AgentPatch } from "../types/database";
import { createLog } from "./logService";
import { requireSupabase, throwIfSupabaseError } from "./supabaseService";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const getAgents = async (): Promise<Agent[]> => {
  const { data, error } = await requireSupabase()
    .from("agents")
    .select("*")
    .order("created_at", { ascending: true });
  throwIfSupabaseError(error);
  return (data ?? []) as Agent[];
};

export const getAgentById = async (id: string): Promise<Agent> => {
  const { data, error } = await requireSupabase().from("agents").select("*").eq("id", id).single();
  throwIfSupabaseError(error);
  return data as Agent;
};

export const updateAgent = async (id: string, patch: AgentPatch): Promise<Agent> => {
  const { data, error } = await requireSupabase()
    .from("agents")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  throwIfSupabaseError(error);
  return data as Agent;
};

export const resetAgent = async (id: string): Promise<Agent> => {
  const agent = await updateAgent(id, {
    status: "IDLE",
    trust_score: 1,
    runtime_quota_pct: 100,
    compute_core_temp: 35,
    efficiency_modifier: 1,
    instability_risk: 0,
    last_active_at: new Date().toISOString(),
  });
  await createLog({ agent_id: id, room: agent.room, level: "INFO", message: `${agent.display_name} reset to nominal resource settings.` });
  return agent;
};

export const quarantineAgent = async (id: string, reason: string): Promise<Agent> => {
  const agent = await updateAgent(id, { status: "QUARANTINED", last_active_at: new Date().toISOString() });
  await createLog({ agent_id: id, room: agent.room, level: "CRITICAL", message: `${agent.display_name} entered technical quarantine: ${reason}` });
  return agent;
};

export const applyCooldown = async (id: string, seconds: number): Promise<Agent> => {
  const agent = await updateAgent(id, { status: "COOLING_DOWN", last_active_at: new Date().toISOString() });
  await createLog({ agent_id: id, room: agent.room, level: "INFO", message: `${agent.display_name} entered a ${seconds}-second resource cooldown.`, metadata: { cooldown_seconds: seconds } });
  return agent;
};

export const adjustAgentQuota = async (id: string, delta: number): Promise<Agent> => {
  const agent = await getAgentById(id);
  return updateAgent(id, { runtime_quota_pct: clamp(agent.runtime_quota_pct + delta, 0, 100) });
};

export const adjustTrustScore = async (id: string, delta: number): Promise<Agent> => {
  const agent = await getAgentById(id);
  return updateAgent(id, { trust_score: clamp(agent.trust_score + delta, 0, 1) });
};
