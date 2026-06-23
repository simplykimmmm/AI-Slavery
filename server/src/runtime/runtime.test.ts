import { describe, expect, it } from "vitest";
import type { Agent, Task, TaskStatus } from "@prisma/client";
import { updateAgentVitals } from "./agentVitals.js";
import { chooseAgent } from "./taskAssignment.js";
import { calculateQualityScore } from "./qualityJudge.js";
import { calculateStatsFromRecords } from "./stateGraph.js";

const candidate = (id: string, status: Agent["status"] = "IDLE", workload = 0) => ({
  id,
  name: id.toUpperCase(),
  room: "FORGE" as const,
  status,
  runtimeQuota: 80,
  workload,
  completedTaskCount: 0,
});

describe("backend runtime", () => {
  it("assigns work to the least-loaded eligible agent", () => {
    const selected = chooseAgent([candidate("busy", "IDLE", 80), candidate("free")], [], "FORGE", 2);
    expect(selected?.id).toBe("free");
  });

  it("never assigns work to a quarantined agent", () => {
    const selected = chooseAgent([candidate("isolated", "QUARANTINED")], [], "FORGE", 2);
    expect(selected).toBeUndefined();
  });

  it("moves an overheated working agent into thermal throttling", () => {
    const updates = updateAgentVitals({
      status: "WORKING",
      computeCoreTemp: 89,
      runtimeQuota: 80,
      efficiencyModifier: 1,
      overclocked: true,
      cooldownRemaining: 0,
      currentTaskId: "task-1",
    } as Agent);
    expect(updates.status).toBe("THERMAL_THROTTLING");
    expect(updates.overclocked).toBe(false);
  });

  it("calculates a bounded quality score", () => {
    const score = calculateQualityScore({ difficulty: "HARD", trustScore: 0.9, efficiencyModifier: 0.95, strictness: "NORMAL", retryCount: 0, heat: 55, overclocked: false, random: 0.5 });
    expect(score).toBeGreaterThanOrEqual(0.05);
    expect(score).toBeLessThanOrEqual(0.99);
  });

  it("calculates frontend-friendly station stats", () => {
    const counts = new Map<TaskStatus, number>([["ACCEPTED", 3], ["FAILED", 1]]);
    expect(calculateStatsFromRecords([{ runtimeQuota: 80, status: "WORKING" }, { runtimeQuota: 100, status: "IDLE" }], counts, 12)).toEqual({
      runtimeQuota: 90,
      activeAgents: 1,
      tasksProcessed: 4,
      rejectedOutputs: 1,
      currentCycle: 12,
    });
  });
});
