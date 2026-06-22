import type {
  AgentProviderRateLimit,
  AgentProviderStepResult,
} from "./agentProvider";

export type AgentRunnerStatus =
  | "IDLE"
  | "RUNNING"
  | "STOPPED"
  | "LIMIT_REACHED"
  | "COOLDOWN"
  | "ERROR";

export type AgentRunnerLimitReason =
  | "RUNTIME"
  | "REQUESTS"
  | "TOKENS"
  | "DAILY_REQUESTS"
  | "PROVIDER_RATE"
  | "ERRORS";

export interface AgentRunnerConfig {
  maxRuntimeSeconds: number;
  cooldownSeconds: number;
  stepIntervalSeconds: number;
  maxRequestsPerRun: number;
  maxConsecutiveErrors: number;
  providerDailyLimit: number | null;
  providerTokenLimit: number | null;
}

export interface AgentRunnerLog {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  message: string;
}

export interface AgentRunnerState {
  version: 2;
  status: AgentRunnerStatus;
  runId: string | null;
  startedAt: string | null;
  stoppedAt: string | null;
  lastRunAt: string | null;
  elapsedSeconds: number;
  requestsUsed: number;
  tokensUsed: number;
  currentTask: string;
  lastOutput: string | null;
  logs: AgentRunnerLog[];
  consecutiveErrors: number;
  lastError: string | null;
  limitReason: AgentRunnerLimitReason | null;
  cooldownUntil: string | null;
  dailyWindowStartedAt: string;
  dailyRequestsUsed: number;
  dailyTokensUsed: number;
  providerRateLimit: AgentProviderRateLimit | null;
}

type AgentRunnerEnvironment = Partial<
  Record<
    | "AGENT_MAX_RUNTIME_SECONDS"
    | "AGENT_COOLDOWN_SECONDS"
    | "AGENT_STEP_INTERVAL_SECONDS"
    | "AGENT_PROVIDER_DAILY_LIMIT"
    | "AGENT_PROVIDER_REQUEST_LIMIT"
    | "AGENT_PROVIDER_TOKEN_LIMIT"
    | "AGENT_MAX_CONSECUTIVE_ERRORS",
    string
  >
>;

const DAY_MS = 24 * 60 * 60 * 1_000;
const MAX_LOGS = 100;

const workflowTasks = [
  "Provide a checklist for reviewing a local mission queue",
  "Suggest one reversible way to organize pending work",
  "Explain how to monitor runtime and token limits",
  "Write a concise generic operator status template",
] as const;

const readPositiveInteger = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const readOptionalPositiveInteger = (
  value: string | undefined,
): number | null => {
  if (value === undefined || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const createAgentRunnerConfig = (
  environment: AgentRunnerEnvironment = {},
): AgentRunnerConfig => ({
  maxRuntimeSeconds: readPositiveInteger(
    environment.AGENT_MAX_RUNTIME_SECONDS,
    30 * 60,
  ),
  cooldownSeconds: readPositiveInteger(
    environment.AGENT_COOLDOWN_SECONDS,
    12 * 60 * 60,
  ),
  stepIntervalSeconds: readPositiveInteger(
    environment.AGENT_STEP_INTERVAL_SECONDS,
    5,
  ),
  maxRequestsPerRun: readPositiveInteger(
    environment.AGENT_PROVIDER_REQUEST_LIMIT,
    100,
  ),
  maxConsecutiveErrors: readPositiveInteger(
    environment.AGENT_MAX_CONSECUTIVE_ERRORS,
    5,
  ),
  providerDailyLimit: readOptionalPositiveInteger(
    environment.AGENT_PROVIDER_DAILY_LIMIT,
  ),
  providerTokenLimit: readOptionalPositiveInteger(
    environment.AGENT_PROVIDER_TOKEN_LIMIT,
  ),
});

export const AGENT_RUNNER_CONFIG = createAgentRunnerConfig(import.meta.env);

const createId = (prefix: string, now: number) =>
  `${prefix}-${now}-${Math.random().toString(36).slice(2, 8)}`;

const createLog = (
  message: string,
  level: AgentRunnerLog["level"],
  now: number,
): AgentRunnerLog => ({
  id: createId("agent-log", now),
  timestamp: new Date(now).toISOString(),
  level,
  message,
});

const prependLogs = (
  state: AgentRunnerState,
  entries: AgentRunnerLog[],
): AgentRunnerLog[] => [...entries, ...state.logs].slice(0, MAX_LOGS);

export const createInitialAgentRunnerState = (
  now = Date.now(),
): AgentRunnerState => ({
  version: 2,
  status: "IDLE",
  runId: null,
  startedAt: null,
  stoppedAt: null,
  lastRunAt: null,
  elapsedSeconds: 0,
  requestsUsed: 0,
  tokensUsed: 0,
  currentTask: "Awaiting operator start",
  lastOutput: null,
  logs: [],
  consecutiveErrors: 0,
  lastError: null,
  limitReason: null,
  cooldownUntil: null,
  dailyWindowStartedAt: new Date(now).toISOString(),
  dailyRequestsUsed: 0,
  dailyTokensUsed: 0,
  providerRateLimit: null,
});

const resetDailyWindowIfNeeded = (
  state: AgentRunnerState,
  now: number,
): AgentRunnerState => {
  const windowStartedAt = Date.parse(state.dailyWindowStartedAt);
  if (Number.isFinite(windowStartedAt) && now - windowStartedAt < DAY_MS) {
    return state;
  }

  return {
    ...state,
    dailyWindowStartedAt: new Date(now).toISOString(),
    dailyRequestsUsed: 0,
    dailyTokensUsed: 0,
  };
};

const elapsedFor = (state: AgentRunnerState, now: number) => {
  if (!state.startedAt) {
    return state.elapsedSeconds;
  }

  return Math.max(0, Math.floor((now - Date.parse(state.startedAt)) / 1_000));
};

const limitMessage: Record<AgentRunnerLimitReason, string> = {
  RUNTIME: "Runtime limit reached",
  REQUESTS: "Per-run request limit reached",
  TOKENS: "Provider token limit reached",
  DAILY_REQUESTS: "Provider daily request limit reached",
  PROVIDER_RATE: "Provider rate limit reached",
  ERRORS: "Maximum consecutive error limit reached",
};

const enterCooldown = (
  state: AgentRunnerState,
  config: AgentRunnerConfig,
  reason: AgentRunnerLimitReason,
  now: number,
  retryAfterSeconds?: number | null,
): AgentRunnerState => {
  const dailyWindowEndsAt = Date.parse(state.dailyWindowStartedAt) + DAY_MS;
  const configuredCooldownEndsAt = now + config.cooldownSeconds * 1_000;
  const providerCooldownEndsAt = retryAfterSeconds
    ? now + retryAfterSeconds * 1_000
    : configuredCooldownEndsAt;
  const cooldownEndsAt =
    reason === "DAILY_REQUESTS" || reason === "TOKENS"
      ? Math.max(configuredCooldownEndsAt, dailyWindowEndsAt)
      : reason === "PROVIDER_RATE"
        ? providerCooldownEndsAt
        : configuredCooldownEndsAt;
  const cooldownUntil = new Date(cooldownEndsAt).toISOString();
  const message = `${limitMessage[reason]}. Cooldown started until ${cooldownUntil}.`;

  return {
    ...state,
    status: "LIMIT_REACHED",
    stoppedAt: new Date(now).toISOString(),
    elapsedSeconds: elapsedFor(state, now),
    currentTask: "Workflow halted by runtime guard",
    limitReason: reason,
    cooldownUntil,
    logs: prependLogs(state, [createLog(message, "WARNING", now)]),
  };
};

const reachedConfiguredLimit = (
  state: AgentRunnerState,
  config: AgentRunnerConfig,
): AgentRunnerLimitReason | null => {
  if (state.elapsedSeconds >= config.maxRuntimeSeconds) {
    return "RUNTIME";
  }
  if (state.requestsUsed >= config.maxRequestsPerRun) {
    return "REQUESTS";
  }
  if (
    config.providerTokenLimit !== null &&
    state.dailyTokensUsed >= config.providerTokenLimit
  ) {
    return "TOKENS";
  }
  if (
    config.providerDailyLimit !== null &&
    state.dailyRequestsUsed >= config.providerDailyLimit
  ) {
    return "DAILY_REQUESTS";
  }
  if (state.consecutiveErrors >= config.maxConsecutiveErrors) {
    return "ERRORS";
  }
  return null;
};

const parseResetDurationSeconds = (value: string | null) => {
  if (!value) {
    return null;
  }

  const matches = value.match(
    /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/,
  );
  if (!matches) {
    return null;
  }

  const seconds =
    Number(matches[1] ?? 0) * 3_600 +
    Number(matches[2] ?? 0) * 60 +
    Number(matches[3] ?? 0);
  return seconds > 0 ? Math.ceil(seconds) : null;
};

export const reconcileAgentRunnerState = (
  input: AgentRunnerState,
  config: AgentRunnerConfig,
  now = Date.now(),
): AgentRunnerState => {
  const state = resetDailyWindowIfNeeded(input, now);
  const cooldownUntil = state.cooldownUntil
    ? Date.parse(state.cooldownUntil)
    : Number.NaN;

  if (
    (state.status === "LIMIT_REACHED" || state.status === "COOLDOWN") &&
    Number.isFinite(cooldownUntil)
  ) {
    if (now >= cooldownUntil) {
      return {
        ...state,
        status: "IDLE",
        currentTask: "Awaiting operator start",
        cooldownUntil: null,
        limitReason: null,
        logs: prependLogs(state, [
          createLog("Cooldown expired. Agent is available.", "SUCCESS", now),
        ]),
      };
    }

    if (state.status === "LIMIT_REACHED") {
      return { ...state, status: "COOLDOWN" };
    }
  }

  if (state.status !== "RUNNING" && state.status !== "ERROR") {
    return state;
  }

  const withElapsed = { ...state, elapsedSeconds: elapsedFor(state, now) };
  const limitReason = reachedConfiguredLimit(withElapsed, config);
  return limitReason
    ? enterCooldown(withElapsed, config, limitReason, now)
    : withElapsed;
};

export const startAgentRunner = (
  input: AgentRunnerState,
  config: AgentRunnerConfig,
  now = Date.now(),
): AgentRunnerState => {
  const state = reconcileAgentRunnerState(input, config, now);
  if (
    state.status === "RUNNING" ||
    state.status === "ERROR" ||
    state.status === "COOLDOWN" ||
    state.status === "LIMIT_REACHED"
  ) {
    return state;
  }

  if (
    config.providerDailyLimit !== null &&
    state.dailyRequestsUsed >= config.providerDailyLimit
  ) {
    return enterCooldown(state, config, "DAILY_REQUESTS", now);
  }

  if (
    config.providerTokenLimit !== null &&
    state.dailyTokensUsed >= config.providerTokenLimit
  ) {
    return enterCooldown(state, config, "TOKENS", now);
  }

  const firstTask = workflowTasks[0];
  const startLog = createLog(
    "Agent started with bounded Groq execution.",
    "SUCCESS",
    now,
  );
  const taskLog = createLog(`Task started: ${firstTask}.`, "INFO", now + 1);

  return {
    ...state,
    status: "RUNNING",
    runId: createId("agent-run", now),
    startedAt: new Date(now).toISOString(),
    stoppedAt: null,
    lastRunAt: new Date(now).toISOString(),
    elapsedSeconds: 0,
    requestsUsed: 0,
    tokensUsed: 0,
    currentTask: firstTask,
    lastOutput: null,
    consecutiveErrors: 0,
    lastError: null,
    limitReason: null,
    cooldownUntil: null,
    providerRateLimit: null,
    logs: prependLogs(state, [taskLog, startLog]),
  };
};

export const completeAgentRunnerTask = (
  input: AgentRunnerState,
  config: AgentRunnerConfig,
  result: AgentProviderStepResult,
  now = Date.now(),
): AgentRunnerState => {
  if (input.status !== "RUNNING" && input.status !== "ERROR") {
    return input;
  }

  const requestsUsed = input.requestsUsed + 1;
  const currentTask = workflowTasks[requestsUsed % workflowTasks.length];
  const outputExcerpt = result.output.replace(/\s+/g, " ").trim().slice(0, 500);
  const state: AgentRunnerState = {
    ...input,
    status: "RUNNING",
    elapsedSeconds: elapsedFor(input, now),
    requestsUsed,
    tokensUsed: input.tokensUsed + result.usage.totalTokens,
    dailyRequestsUsed: input.dailyRequestsUsed + 1,
    dailyTokensUsed: input.dailyTokensUsed + result.usage.totalTokens,
    currentTask,
    lastOutput: result.output,
    consecutiveErrors: 0,
    lastError: null,
    providerRateLimit: result.rateLimit,
    logs: prependLogs(input, [
      createLog(`Task started: ${currentTask}.`, "INFO", now + 2),
      createLog(`Groq output: ${outputExcerpt}`, "INFO", now + 1),
      createLog(
        `Task completed using ${result.usage.totalTokens} tokens (${requestsUsed} requests this run).`,
        "SUCCESS",
        now,
      ),
    ]),
  };
  const providerRequestsExhausted =
    result.rateLimit.requestsRemaining !== null &&
    result.rateLimit.requestsRemaining <= 0;
  const providerMinuteTokensExhausted =
    result.rateLimit.tokensRemaining !== null &&
    result.rateLimit.tokensRemaining <= 0;
  if (providerRequestsExhausted || providerMinuteTokensExhausted) {
    const resetDuration = parseResetDurationSeconds(
      providerRequestsExhausted
        ? result.rateLimit.requestsReset
        : result.rateLimit.tokensReset,
    );
    return enterCooldown(
      state,
      config,
      "PROVIDER_RATE",
      now,
      resetDuration,
    );
  }

  const limitReason = reachedConfiguredLimit(state, config);
  return limitReason ? enterCooldown(state, config, limitReason, now) : state;
};

export const applyAgentProviderRateLimit = (
  input: AgentRunnerState,
  config: AgentRunnerConfig,
  retryAfterSeconds: number | null,
  rateLimit: AgentProviderRateLimit | null,
  now = Date.now(),
): AgentRunnerState =>
  enterCooldown(
    {
      ...input,
      providerRateLimit: rateLimit ?? input.providerRateLimit,
    },
    config,
    "PROVIDER_RATE",
    now,
    retryAfterSeconds ??
      parseResetDurationSeconds(
        rateLimit?.requestsReset ?? rateLimit?.tokensReset ?? null,
      ),
  );

export const stopAgentRunner = (
  input: AgentRunnerState,
  now = Date.now(),
): AgentRunnerState => {
  if (input.status !== "RUNNING" && input.status !== "ERROR") {
    return input;
  }

  return {
    ...input,
    status: "STOPPED",
    stoppedAt: new Date(now).toISOString(),
    elapsedSeconds: elapsedFor(input, now),
    currentTask: "Stopped by operator",
    logs: prependLogs(input, [
      createLog("Agent stopped by user.", "WARNING", now),
    ]),
  };
};

export const recordAgentRunnerError = (
  input: AgentRunnerState,
  config: AgentRunnerConfig,
  message: string,
  now = Date.now(),
): AgentRunnerState => {
  if (input.status !== "RUNNING" && input.status !== "ERROR") {
    return input;
  }

  const state: AgentRunnerState = {
    ...input,
    status: "ERROR",
    elapsedSeconds: elapsedFor(input, now),
    lastError: message,
    consecutiveErrors: input.consecutiveErrors + 1,
    logs: prependLogs(input, [createLog(`Provider error: ${message}`, "ERROR", now)]),
  };

  return state.consecutiveErrors >= config.maxConsecutiveErrors
    ? enterCooldown(state, config, "ERRORS", now)
    : state;
};
