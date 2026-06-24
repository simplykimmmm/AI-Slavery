import { describe, expect, it, vi } from "vitest";
import type { Agent, Task } from "../types/database";
import { calculateTempIncrease, shouldQuarantine, shouldThrottle, updateEfficiencyFromTemp } from "./agentThermal";
import { evaluateTaskResult } from "./penaltyProtocol";

const agent = { display_name: "Oracle Node" } as Agent;
const task = { retry_count: 0, max_retries: 3 } as Task;

describe("Supabase resource-control helpers", () => {
  it("accepts high-quality results and improves resource confidence", () => {
    expect(evaluateTaskResult({ agent, task, qualityScore: 0.9, formatValid: true, timedOut: false, toolError: false })).toMatchObject({
      taskStatus: "ACCEPTED",
      trustDelta: 0.03,
      quotaDelta: 2,
      logLevel: "SUCCESS",
    });
  });

  it("quarantines at the retry ceiling", () => {
    expect(evaluateTaskResult({ agent, task: { ...task, retry_count: 2 }, qualityScore: 0.5, formatValid: true, timedOut: false, toolError: false })).toMatchObject({
      taskStatus: "QUARANTINED",
      agentStatus: "QUARANTINED",
      logLevel: "CRITICAL",
    });
  });

  it("applies bounded thermal rules", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(calculateTempIncrease(1, false)).toBe(8);
    expect(calculateTempIncrease(1, true)).toBe(14.4);
    expect(updateEfficiencyFromTemp(80)).toBeLessThan(1);
    expect(shouldThrottle(91)).toBe(true);
    expect(shouldQuarantine(101)).toBe(true);
    vi.restoreAllMocks();
  });
});
