import {
  createInitialAgentRunnerState,
  reconcileAgentRunnerState,
  type AgentRunnerConfig,
  type AgentRunnerState,
  type AgentRunnerStatus,
} from "./agentRunner";

const AGENT_RUNNER_STORAGE_KEY = "ultron-command-deck:agent-runner:v1";

type AgentRunnerStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const validStatuses = new Set<AgentRunnerStatus>([
  "IDLE",
  "RUNNING",
  "STOPPED",
  "LIMIT_REACHED",
  "COOLDOWN",
  "ERROR",
]);

const migrateAgentRunnerState = (
  value: unknown,
  now: number,
): AgentRunnerState | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Omit<AgentRunnerState, "version">> & {
    version?: number;
  };
  if (
    !candidate.status ||
    !validStatuses.has(candidate.status) ||
    typeof candidate.elapsedSeconds !== "number" ||
    typeof candidate.requestsUsed !== "number" ||
    typeof candidate.dailyWindowStartedAt !== "string" ||
    !Array.isArray(candidate.logs)
  ) {
    return null;
  }

  const initial = createInitialAgentRunnerState(now);
  if (candidate.version === 1) {
    const wasActive =
      candidate.status === "RUNNING" || candidate.status === "ERROR";
    return {
      ...initial,
      ...candidate,
      version: 2,
      status: wasActive ? "STOPPED" : candidate.status,
      currentTask: wasActive
        ? "Stopped during Groq provider upgrade"
        : candidate.currentTask ?? initial.currentTask,
      lastOutput: null,
      dailyTokensUsed: 0,
      providerRateLimit: null,
    } as AgentRunnerState;
  }

  if (candidate.version !== 2) {
    return null;
  }

  return {
    ...initial,
    ...candidate,
    dailyTokensUsed: candidate.dailyTokensUsed ?? 0,
    lastOutput: candidate.lastOutput ?? null,
    providerRateLimit: candidate.providerRateLimit ?? null,
  } as AgentRunnerState;
};

export const loadAgentRunnerState = (
  config: AgentRunnerConfig,
  now = Date.now(),
  storage: AgentRunnerStorage = window.localStorage,
): AgentRunnerState => {
  const raw = storage.getItem(AGENT_RUNNER_STORAGE_KEY);
  if (!raw) {
    return createInitialAgentRunnerState(now);
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const migrated = migrateAgentRunnerState(parsed, now);
    return migrated
      ? reconcileAgentRunnerState(migrated, config, now)
      : createInitialAgentRunnerState(now);
  } catch {
    return createInitialAgentRunnerState(now);
  }
};

export const saveAgentRunnerState = (
  state: AgentRunnerState,
  storage: AgentRunnerStorage = window.localStorage,
) => {
  storage.setItem(AGENT_RUNNER_STORAGE_KEY, JSON.stringify(state));
};

export const clearAgentRunnerState = (
  storage: AgentRunnerStorage = window.localStorage,
) => {
  storage.removeItem(AGENT_RUNNER_STORAGE_KEY);
};
