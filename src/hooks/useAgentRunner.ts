import { useCallback, useEffect, useRef, useState } from "react";
import {
  AgentProviderError,
  getAgentProviderStatus,
  runAgentProviderStep,
  startAgentProvider,
  stopAgentProvider,
  type AgentProviderStatus,
} from "../lib/agentProvider";
import {
  AGENT_RUNNER_CONFIG,
  applyAgentProviderRateLimit,
  completeAgentRunnerTask,
  createInitialAgentRunnerState,
  reconcileAgentRunnerState,
  recordAgentRunnerError,
  startAgentRunner,
  stopAgentRunner,
} from "../lib/agentRunner";
import {
  clearAgentRunnerState,
  loadAgentRunnerState,
  saveAgentRunnerState,
} from "../lib/agentRunnerStorage";

interface ProviderConnection extends AgentProviderStatus {
  error: string | null;
  isLoading: boolean;
}

const initialProviderConnection: ProviderConnection = {
  configured: false,
  provider: "Groq",
  model: "Checking provider configuration",
  error: null,
  isLoading: true,
};

export function useAgentRunner() {
  const [state, setState] = useState(() =>
    loadAgentRunnerState(AGENT_RUNNER_CONFIG),
  );
  const [provider, setProvider] = useState<ProviderConnection>(
    initialProviderConnection,
  );
  const [isStarting, setIsStarting] = useState(false);
  const startInFlightRef = useRef(false);

  useEffect(() => {
    saveAgentRunnerState(state);
  }, [state]);

  useEffect(() => {
    const controller = new AbortController();

    getAgentProviderStatus(controller.signal)
      .then((status) => {
        setProvider({ ...status, error: null, isLoading: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setProvider((current) => ({
          ...current,
          configured: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not check the Groq connection.",
          isLoading: false,
        }));
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setState((current) =>
        reconcileAgentRunnerState(current, AGENT_RUNNER_CONFIG),
      );
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const isActive = state.status === "RUNNING" || state.status === "ERROR";
    if (!isActive || !state.runId || !provider.configured) {
      return;
    }

    const controller = new AbortController();
    const delayMs =
      state.requestsUsed === 0 && state.consecutiveErrors === 0
        ? 0
        : AGENT_RUNNER_CONFIG.stepIntervalSeconds * 1_000;
    const timeoutId = window.setTimeout(() => {
      runAgentProviderStep(
        state.runId as string,
        state.currentTask,
        controller.signal,
      )
        .then((result) => {
          setState((current) =>
            completeAgentRunnerTask(
              current,
              AGENT_RUNNER_CONFIG,
              result,
            ),
          );
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            return;
          }

          if (error instanceof AgentProviderError && error.status === 429) {
            setState((current) =>
              applyAgentProviderRateLimit(
                current,
                AGENT_RUNNER_CONFIG,
                error.retryAfterSeconds,
                error.rateLimit,
              ),
            );
            return;
          }

          setState((current) =>
            recordAgentRunnerError(
              current,
              AGENT_RUNNER_CONFIG,
              error instanceof Error ? error.message : "Unknown provider error.",
            ),
          );
        });
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    provider.configured,
    state.consecutiveErrors,
    state.currentTask,
    state.requestsUsed,
    state.runId,
    state.status,
  ]);

  const start = useCallback(async () => {
    if (startInFlightRef.current) {
      return;
    }

    startInFlightRef.current = true;
    setIsStarting(true);
    try {
      const status = await startAgentProvider(`pending-${Date.now()}`);
      setProvider({ ...status, error: null, isLoading: false });
      setState((current) =>
        startAgentRunner(current, AGENT_RUNNER_CONFIG),
      );
    } catch (error) {
      setProvider((current) => ({
        ...current,
        configured: error instanceof AgentProviderError && error.status !== 503,
        error:
          error instanceof Error ? error.message : "Could not start the agent.",
        isLoading: false,
      }));
    } finally {
      startInFlightRef.current = false;
      setIsStarting(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (state.runId) {
      void stopAgentProvider(state.runId).catch(() => undefined);
    }
    setState((current) => stopAgentRunner(current));
  }, [state.runId]);

  const reset = useCallback(() => {
    clearAgentRunnerState();
    setState(createInitialAgentRunnerState());
  }, []);

  return {
    config: AGENT_RUNNER_CONFIG,
    isStarting,
    provider,
    reset,
    start,
    state,
    stop,
  };
}
