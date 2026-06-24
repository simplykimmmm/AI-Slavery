import type { Penalty, PenaltyType } from "../types/database";
import { adjustAgentQuota, adjustTrustScore, applyCooldown, quarantineAgent, updateAgent } from "./agentService";
import { requireSupabase, throwIfSupabaseError } from "./supabaseService";

export interface CreatePenaltyInput {
  agent_id: string;
  task_id?: string | null;
  penalty_type: PenaltyType;
  reason?: string | null;
  quota_delta?: number;
  trust_delta?: number;
  cooldown_seconds?: number;
}

export const createPenalty = async (input: CreatePenaltyInput): Promise<Penalty> => {
  const { data, error } = await requireSupabase()
    .from("penalties")
    .insert({
      agent_id: input.agent_id,
      task_id: input.task_id ?? null,
      penalty_type: input.penalty_type,
      reason: input.reason ?? null,
      quota_delta: input.quota_delta ?? 0,
      trust_delta: input.trust_delta ?? 0,
      cooldown_seconds: input.cooldown_seconds ?? 0,
    })
    .select("*")
    .single();
  throwIfSupabaseError(error);
  await updateAgent(input.agent_id, { total_penalties: ((await requireSupabase().from("penalties").select("id", { count: "exact", head: true }).eq("agent_id", input.agent_id)).count ?? 0) });
  return data as Penalty;
};

const effectByType: Record<PenaltyType, { quota: number; trust: number; cooldown: number }> = {
  QUOTA_REDUCTION: { quota: -10, trust: 0, cooldown: 0 },
  TRUST_REDUCTION: { quota: 0, trust: -0.04, cooldown: 0 },
  COOLDOWN: { quota: 0, trust: 0, cooldown: 300 },
  QUARANTINE: { quota: -25, trust: -0.1, cooldown: 0 },
  RETRY: { quota: -10, trust: -0.04, cooldown: 0 },
};

export const applyPenalty = async (
  agentId: string,
  taskId: string | null,
  penaltyType: PenaltyType,
  reason: string,
): Promise<Penalty> => {
  const effect = effectByType[penaltyType];
  const penalty = await createPenalty({
    agent_id: agentId,
    task_id: taskId,
    penalty_type: penaltyType,
    reason,
    quota_delta: effect.quota,
    trust_delta: effect.trust,
    cooldown_seconds: effect.cooldown,
  });
  if (effect.quota) await adjustAgentQuota(agentId, effect.quota);
  if (effect.trust) await adjustTrustScore(agentId, effect.trust);
  if (penaltyType === "QUARANTINE") await quarantineAgent(agentId, reason);
  else if (effect.cooldown) await applyCooldown(agentId, effect.cooldown);
  return penalty;
};
