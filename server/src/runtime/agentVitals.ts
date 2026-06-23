import type { Agent, AgentStatus } from "@prisma/client";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const workingStatuses: AgentStatus[] = ["WORKING", "REVIEWING"];

export const updateAgentVitals = (agent: Agent) => {
  const isWorking = workingStatuses.includes(agent.status);
  const factor = agent.overclocked ? 2 : 1;
  let computeCoreTemp = clamp(agent.computeCoreTemp + (isWorking ? 3.5 * factor : -2.5), 28, 100);
  let runtimeQuota = clamp(agent.runtimeQuota - (isWorking ? 0.65 * factor : -0.12), 0, 100);
  let efficiencyModifier = clamp(agent.efficiencyModifier + (isWorking ? -0.01 * factor : 0.012), 0.35, 1.15);
  let cooldownRemaining = agent.cooldownRemaining;
  let status = agent.status;
  let currentTaskId = agent.currentTaskId;
  let overclocked = agent.overclocked;

  if (agent.status === "QUARANTINED") {
    return { lastHeartbeatAt: new Date() };
  }

  if (computeCoreTemp >= 90) {
    status = "THERMAL_THROTTLING";
    cooldownRemaining = Math.max(cooldownRemaining, 20);
    overclocked = false;
  } else if (status === "THERMAL_THROTTLING" || status === "COOLING_DOWN") {
    computeCoreTemp = clamp(computeCoreTemp - 3, 28, 100);
    cooldownRemaining = Math.max(0, cooldownRemaining - 1);
    if (computeCoreTemp <= 72 && cooldownRemaining === 0) {
      status = "IDLE";
      currentTaskId = null;
    }
  }

  if (runtimeQuota <= 1 || efficiencyModifier <= 0.45) {
    status = "EXHAUSTED";
    overclocked = false;
  } else if (status === "EXHAUSTED" && runtimeQuota >= 10 && efficiencyModifier >= 0.65) {
    status = "IDLE";
  }

  return {
    computeCoreTemp,
    runtimeQuota,
    efficiencyModifier,
    cooldownRemaining,
    status,
    currentTaskId,
    overclocked,
    lastHeartbeatAt: new Date(),
  };
};
