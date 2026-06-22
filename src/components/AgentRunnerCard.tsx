import type { AgentProviderStatus } from "../lib/agentProvider";
import type {
  AgentRunnerConfig,
  AgentRunnerLog,
  AgentRunnerState,
  AgentRunnerStatus,
} from "../lib/agentRunner";

interface AgentRunnerCardProps {
  config: AgentRunnerConfig;
  isStarting: boolean;
  provider: AgentProviderStatus & {
    error: string | null;
    isLoading: boolean;
  };
  state: AgentRunnerState;
  onStart: () => void;
  onStop: () => void;
}

const statusLabel: Record<AgentRunnerStatus, string> = {
  IDLE: "Idle",
  RUNNING: "Running",
  STOPPED: "Stopped",
  LIMIT_REACHED: "Limit reached",
  COOLDOWN: "Cooldown",
  ERROR: "Error",
};

const statusClassName: Record<AgentRunnerStatus, string> = {
  IDLE: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  RUNNING: "border-command-green/40 bg-command-green/10 text-command-green",
  STOPPED: "border-command-amber/40 bg-command-amber/10 text-command-amber",
  LIMIT_REACHED: "border-command-red/40 bg-command-red/10 text-command-red",
  COOLDOWN: "border-command-violet/40 bg-command-violet/10 text-command-violet",
  ERROR: "border-command-red/40 bg-command-red/10 text-command-red",
};

const logClassName: Record<AgentRunnerLog["level"], string> = {
  INFO: "text-command-cyan",
  SUCCESS: "text-command-green",
  WARNING: "text-command-amber",
  ERROR: "text-command-red",
};

const formatDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
};

const formatTimestamp = (iso: string | null) => {
  if (!iso) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(iso));
};

const formatNumber = (value: number | null) =>
  value === null ? "Unknown" : new Intl.NumberFormat().format(value);

const limitReasonLabel: Record<
  NonNullable<AgentRunnerState["limitReason"]>,
  string
> = {
  RUNTIME: "Runtime limit",
  REQUESTS: "Request limit",
  TOKENS: "Token limit",
  DAILY_REQUESTS: "Daily request limit",
  PROVIDER_RATE: "Provider rate limit",
  ERRORS: "Consecutive error limit",
};

export function AgentRunnerCard({
  config,
  isStarting,
  provider,
  state,
  onStart,
  onStop,
}: AgentRunnerCardProps) {
  const isActive = state.status === "RUNNING" || state.status === "ERROR";
  const isCoolingDown =
    (state.status === "COOLDOWN" || state.status === "LIMIT_REACHED") &&
    state.cooldownUntil !== null;
  const remainingRuntime = Math.max(
    0,
    config.maxRuntimeSeconds - state.elapsedSeconds,
  );
  const cooldownRemaining = state.cooldownUntil
    ? Math.max(
        0,
        Math.ceil((Date.parse(state.cooldownUntil) - Date.now()) / 1_000),
      )
    : 0;
  const orderedLogs = [...state.logs].reverse();
  const canStart =
    provider.configured &&
    !provider.isLoading &&
    !isStarting &&
    !isActive &&
    !isCoolingDown;

  return (
    <section className="rounded-lg border border-command-cyan/25 bg-command-panel/80 p-4 shadow-panel backdrop-blur">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="text-xs font-semibold uppercase text-command-cyan">
            Controlled automation // Groq server runner
          </div>
          <h2 className="mt-2 text-xl font-semibold text-white">
            AI Agent Runner
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Calls Groq through a server-side Vercel Function with bounded output,
            persisted limits, and no autonomous external or irreversible actions.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 font-mono text-xs">
            <span
              className={`rounded border px-2 py-1 ${
                provider.configured
                  ? "border-command-green/30 bg-command-green/10 text-command-green"
                  : "border-command-red/30 bg-command-red/10 text-command-red"
              }`}
            >
              {provider.isLoading
                ? "CHECKING GROQ"
                : provider.configured
                  ? "GROQ CONNECTED"
                  : "GROQ UNAVAILABLE"}
            </span>
            <span className="rounded border border-command-line bg-black/25 px-2 py-1 text-slate-400">
              {provider.model}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            aria-live="polite"
            className={`rounded border px-3 py-2 text-xs font-semibold uppercase ${statusClassName[state.status]}`}
          >
            {statusLabel[state.status]}
          </div>
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            className="rounded border border-command-cyan/50 bg-command-cyan/10 px-4 py-2 text-sm font-semibold text-command-cyan transition duration-200 hover:bg-command-cyan/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/40 disabled:text-slate-600"
          >
            {isStarting ? "Connecting..." : "Start Agent"}
          </button>
          <button
            type="button"
            onClick={onStop}
            disabled={!isActive}
            className="rounded border border-command-red/50 bg-command-red/10 px-4 py-2 text-sm font-semibold text-command-red transition duration-200 hover:bg-command-red/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/40 disabled:text-slate-600"
          >
            Stop Agent
          </button>
        </div>
      </div>

      {provider.error ? (
        <div
          role="alert"
          className="mt-4 rounded border border-command-red/35 bg-command-red/10 px-3 py-3 text-sm text-command-red"
        >
          Groq connection: {provider.error}
        </div>
      ) : null}

      {isCoolingDown && state.cooldownUntil ? (
        <div
          role="status"
          className="mt-4 rounded border border-command-amber/35 bg-command-amber/10 px-3 py-3 text-sm text-command-amber"
        >
          {state.limitReason === "RUNTIME"
            ? "Runtime limit reached."
            : `${state.limitReason ? limitReasonLabel[state.limitReason] : "Configured limit"} reached.`}{" "}
          Agent is cooling down until {formatTimestamp(state.cooldownUntil)}. ({formatDuration(cooldownRemaining)} remaining)
        </div>
      ) : null}

      {state.status === "ERROR" && state.lastError ? (
        <div
          role="alert"
          className="mt-4 rounded border border-command-red/35 bg-command-red/10 px-3 py-3 text-sm text-command-red"
        >
          {state.lastError} Retrying within the configured step interval ({state.consecutiveErrors}/{config.maxConsecutiveErrors}).
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-command-line bg-black/25 p-3">
          <div className="text-xs font-semibold uppercase text-slate-500">
            Elapsed runtime
          </div>
          <div className="mt-2 font-mono text-lg text-slate-100">
            {formatDuration(state.elapsedSeconds)}
          </div>
        </div>
        <div className="rounded border border-command-line bg-black/25 p-3">
          <div className="text-xs font-semibold uppercase text-slate-500">
            Runtime remaining
          </div>
          <div className="mt-2 font-mono text-lg text-command-cyan">
            {formatDuration(remainingRuntime)}
          </div>
        </div>
        <div className="rounded border border-command-line bg-black/25 p-3">
          <div className="text-xs font-semibold uppercase text-slate-500">
            Requests this run
          </div>
          <div className="mt-2 font-mono text-lg text-slate-100">
            {state.requestsUsed} / {config.maxRequestsPerRun}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Daily: {state.dailyRequestsUsed}
            {config.providerDailyLimit === null
              ? ""
              : ` / ${config.providerDailyLimit}`}
          </div>
        </div>
        <div className="rounded border border-command-line bg-black/25 p-3">
          <div className="text-xs font-semibold uppercase text-slate-500">
            Tokens this run
          </div>
          <div className="mt-2 font-mono text-lg text-slate-100">
            {formatNumber(state.tokensUsed)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Daily: {formatNumber(state.dailyTokensUsed)}
            {config.providerTokenLimit === null
              ? ""
              : ` / ${formatNumber(config.providerTokenLimit)}`}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.25fr_1fr_1fr]">
        <div className="rounded border border-command-line bg-black/25 p-3">
          <div className="text-xs font-semibold uppercase text-slate-500">
            Current task
          </div>
          <div className="mt-2 text-sm text-slate-100">{state.currentTask}</div>
        </div>
        <div className="rounded border border-command-line bg-black/25 p-3">
          <div className="text-xs font-semibold uppercase text-slate-500">
            Last run started
          </div>
          <div className="mt-2 text-sm text-slate-100">
            {formatTimestamp(state.lastRunAt)}
          </div>
        </div>
        <div className="rounded border border-command-line bg-black/25 p-3">
          <div className="text-xs font-semibold uppercase text-slate-500">
            Next available run
          </div>
          <div className="mt-2 text-sm text-slate-100">
            {isCoolingDown
              ? formatTimestamp(state.cooldownUntil)
              : isActive
                ? "After current run"
                : "Available now"}
          </div>
        </div>
      </div>

      {state.lastOutput ? (
        <section className="mt-3 rounded border border-command-green/25 bg-command-green/5 p-3">
          <h3 className="text-xs font-semibold uppercase text-command-green">
            Latest Groq output
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
            {state.lastOutput}
          </p>
        </section>
      ) : null}

      {state.providerRateLimit ? (
        <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
          <div className="rounded border border-command-line bg-black/25 p-3 text-slate-400">
            Groq requests remaining: {formatNumber(state.providerRateLimit.requestsRemaining)}
            {state.providerRateLimit.requestsReset
              ? ` · resets in ${state.providerRateLimit.requestsReset}`
              : ""}
          </div>
          <div className="rounded border border-command-line bg-black/25 p-3 text-slate-400">
            Groq minute tokens remaining: {formatNumber(state.providerRateLimit.tokensRemaining)}
            {state.providerRateLimit.tokensReset
              ? ` · resets in ${state.providerRateLimit.tokensReset}`
              : ""}
          </div>
        </div>
      ) : null}

      <details className="mt-4 rounded border border-command-line bg-black/35">
        <summary className="cursor-pointer px-3 py-3 text-xs font-semibold uppercase text-slate-300">
          Runner logs ({state.logs.length})
        </summary>
        <div className="terminal-scroll max-h-64 overflow-y-auto border-t border-command-line p-3 font-mono text-xs leading-6">
          {orderedLogs.length === 0 ? (
            <div className="text-slate-500">No runner activity recorded.</div>
          ) : (
            orderedLogs.map((log) => (
              <div
                key={log.id}
                className="grid gap-x-2 sm:grid-cols-[7rem_5rem_1fr]"
              >
                <span className="text-slate-500">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={logClassName[log.level]}>{log.level}</span>
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </details>

      <div className="mt-3 text-xs text-slate-500">
        Limits: {formatDuration(config.maxRuntimeSeconds)} runtime · {formatDuration(config.cooldownSeconds)} fallback cooldown · {config.stepIntervalSeconds}s step interval · {config.maxRequestsPerRun} requests/run · {config.maxConsecutiveErrors} consecutive errors
      </div>
    </section>
  );
}
