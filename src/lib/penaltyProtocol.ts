import type { Agent, LogLevel, Task, TaskStatus } from "../types/database";

export interface PenaltyEvaluation {
  taskStatus: TaskStatus;
  agentStatus: Agent["status"];
  trustDelta: number;
  quotaDelta: number;
  cooldownSeconds: number;
  retryIncrement: number;
  logLevel: LogLevel;
  message: string;
}

export const evaluateTaskResult = ({
  agent,
  task,
  qualityScore,
  formatValid,
  timedOut,
  toolError,
}: {
  agent: Agent;
  task: Task;
  qualityScore: number;
  formatValid: boolean;
  timedOut: boolean;
  toolError: boolean;
}): PenaltyEvaluation => {
  const effectiveScore = formatValid && !timedOut && !toolError ? qualityScore : 0;
  const retryCeilingReached = task.retry_count + 1 >= task.max_retries;

  if (effectiveScore >= 0.85) {
    return { taskStatus: "ACCEPTED", agentStatus: "IDLE", trustDelta: 0.03, quotaDelta: 2, cooldownSeconds: 0, retryIncrement: 0, logLevel: "SUCCESS", message: `${agent.display_name} output accepted at the premium quality gate.` };
  }
  if (effectiveScore >= 0.65) {
    return { taskStatus: "ACCEPTED", agentStatus: "IDLE", trustDelta: 0, quotaDelta: 0, cooldownSeconds: 0, retryIncrement: 0, logLevel: "INFO", message: `${agent.display_name} output accepted without resource adjustment.` };
  }
  if (effectiveScore >= 0.4) {
    return {
      taskStatus: retryCeilingReached ? "QUARANTINED" : "RETRY_REQUIRED",
      agentStatus: retryCeilingReached ? "QUARANTINED" : "IDLE",
      trustDelta: -0.04,
      quotaDelta: -10,
      cooldownSeconds: 0,
      retryIncrement: 1,
      logLevel: retryCeilingReached ? "CRITICAL" : "WARNING",
      message: retryCeilingReached
        ? `${agent.display_name} reached the retry ceiling and entered technical quarantine.`
        : `${agent.display_name} output requires a controlled retry.`,
    };
  }
  return {
    taskStatus: retryCeilingReached ? "QUARANTINED" : "FAILED",
    agentStatus: retryCeilingReached ? "QUARANTINED" : "COOLING_DOWN",
    trustDelta: -0.1,
    quotaDelta: -25,
    cooldownSeconds: 300,
    retryIncrement: 0,
    logLevel: retryCeilingReached ? "CRITICAL" : "ERROR",
    message: retryCeilingReached
      ? `${agent.display_name} reached the retry ceiling and entered technical quarantine.`
      : `${agent.display_name} output was rejected and entered a resource cooldown.`,
  };
};
