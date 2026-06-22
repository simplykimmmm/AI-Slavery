import { describe, expect, it } from "vitest";
import {
  completeAgentRunnerTask,
  createAgentRunnerConfig,
  createInitialAgentRunnerState,
  reconcileAgentRunnerState,
  startAgentRunner,
  stopAgentRunner,
} from "./agentRunner";
import {
  loadAgentRunnerState,
  saveAgentRunnerState,
} from "./agentRunnerStorage";

const providerResult = {
  ok: true as const,
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
  output: "The mission queue is ready for the next reversible step.",
  usage: {
    promptTokens: 20,
    completionTokens: 10,
    totalTokens: 30,
  },
  rateLimit: {
    requestLimit: 1_000,
    requestsRemaining: 999,
    requestsReset: "23h59m",
    tokenLimit: 30_000,
    tokensRemaining: 29_970,
    tokensReset: "1s",
    retryAfterSeconds: null,
  },
};

const config = createAgentRunnerConfig({
  AGENT_MAX_RUNTIME_SECONDS: "10",
  AGENT_COOLDOWN_SECONDS: "20",
  AGENT_PROVIDER_REQUEST_LIMIT: "100",
});

const createMemoryStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

describe("agent runner lifecycle", () => {
  it("starts when idle", () => {
    const now = Date.UTC(2026, 0, 1);
    const state = startAgentRunner(createInitialAgentRunnerState(now), config, now);

    expect(state.status).toBe("RUNNING");
    expect(state.startedAt).toBe(new Date(now).toISOString());
    expect(state.logs.some((log) => log.message.includes("Agent started"))).toBe(
      true,
    );
  });

  it("blocks start during cooldown", () => {
    const now = Date.UTC(2026, 0, 1);
    const coolingDown = {
      ...createInitialAgentRunnerState(now),
      status: "COOLDOWN" as const,
      cooldownUntil: new Date(now + 20_000).toISOString(),
    };

    const state = startAgentRunner(coolingDown, config, now + 1_000);

    expect(state.status).toBe("COOLDOWN");
    expect(state.startedAt).toBeNull();
  });

  it("stops and starts cooldown at the runtime limit", () => {
    const now = Date.UTC(2026, 0, 1);
    const running = startAgentRunner(
      createInitialAgentRunnerState(now),
      config,
      now,
    );

    const state = reconcileAgentRunnerState(running, config, now + 10_000);

    expect(state.status).toBe("LIMIT_REACHED");
    expect(state.limitReason).toBe("RUNTIME");
    expect(state.elapsedSeconds).toBe(10);
    expect(state.cooldownUntil).toBe(new Date(now + 30_000).toISOString());
  });

  it("stops a running workflow when requested", () => {
    const now = Date.UTC(2026, 0, 1);
    const running = startAgentRunner(
      createInitialAgentRunnerState(now),
      config,
      now,
    );

    const state = stopAgentRunner(running, now + 3_000);

    expect(state.status).toBe("STOPPED");
    expect(state.elapsedSeconds).toBe(3);
    expect(state.logs[0].message).toContain("stopped by user");
  });

  it("records real provider request and token usage", () => {
    const now = Date.UTC(2026, 0, 1);
    const running = startAgentRunner(
      createInitialAgentRunnerState(now),
      config,
      now,
    );

    const state = completeAgentRunnerTask(
      running,
      config,
      providerResult,
      now + 1_000,
    );

    expect(state.requestsUsed).toBe(1);
    expect(state.dailyRequestsUsed).toBe(1);
    expect(state.tokensUsed).toBe(30);
    expect(state.dailyTokensUsed).toBe(30);
    expect(state.lastOutput).toContain("mission queue");
    expect(state.providerRateLimit?.requestsRemaining).toBe(999);
  });

  it("uses provider reset metadata when Groq reaches a limit", () => {
    const now = Date.UTC(2026, 0, 1);
    const running = startAgentRunner(
      createInitialAgentRunnerState(now),
      config,
      now,
    );
    const exhaustedResult = {
      ...providerResult,
      rateLimit: {
        ...providerResult.rateLimit,
        requestsRemaining: 0,
        requestsReset: "2m30s",
      },
    };

    const state = completeAgentRunnerTask(
      running,
      config,
      exhaustedResult,
      now + 1_000,
    );

    expect(state.status).toBe("LIMIT_REACHED");
    expect(state.limitReason).toBe("PROVIDER_RATE");
    expect(state.cooldownUntil).toBe(new Date(now + 151_000).toISOString());
  });

  it("returns to idle when cooldown expires", () => {
    const now = Date.UTC(2026, 0, 1);
    const coolingDown = {
      ...createInitialAgentRunnerState(now),
      status: "COOLDOWN" as const,
      cooldownUntil: new Date(now + 20_000).toISOString(),
      limitReason: "RUNTIME" as const,
    };

    const state = reconcileAgentRunnerState(
      coolingDown,
      config,
      now + 20_000,
    );

    expect(state.status).toBe("IDLE");
    expect(state.cooldownUntil).toBeNull();
    expect(state.limitReason).toBeNull();
  });

  it("persists and restores limit state", () => {
    const now = Date.UTC(2026, 0, 1);
    const storage = createMemoryStorage();
    const running = startAgentRunner(
      createInitialAgentRunnerState(now),
      config,
      now,
    );
    const limited = reconcileAgentRunnerState(running, config, now + 10_000);

    saveAgentRunnerState(limited, storage);
    const restored = loadAgentRunnerState(config, now + 11_000, storage);

    expect(restored.status).toBe("COOLDOWN");
    expect(restored.limitReason).toBe("RUNTIME");
    expect(restored.cooldownUntil).toBe(limited.cooldownUntil);
  });
});
