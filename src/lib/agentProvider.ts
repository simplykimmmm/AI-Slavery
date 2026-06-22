export interface AgentProviderRateLimit {
  requestLimit: number | null;
  requestsRemaining: number | null;
  requestsReset: string | null;
  tokenLimit: number | null;
  tokensRemaining: number | null;
  tokensReset: string | null;
  retryAfterSeconds: number | null;
}

export interface AgentProviderStatus {
  configured: boolean;
  provider: string;
  model: string;
}

export interface AgentProviderUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AgentProviderStepResult {
  ok: true;
  model: string;
  output: string;
  usage: AgentProviderUsage;
  rateLimit: AgentProviderRateLimit;
}

interface AgentProviderErrorPayload {
  error?: string;
  rateLimit?: AgentProviderRateLimit;
  retryAfterSeconds?: number | null;
}

export class AgentProviderError extends Error {
  readonly status: number;
  readonly rateLimit: AgentProviderRateLimit | null;
  readonly retryAfterSeconds: number | null;

  constructor(
    message: string,
    status: number,
    payload: AgentProviderErrorPayload = {},
  ) {
    super(message);
    this.name = "AgentProviderError";
    this.status = status;
    this.rateLimit = payload.rateLimit ?? null;
    this.retryAfterSeconds = payload.retryAfterSeconds ?? null;
  }
}

const requestAgentApi = async <T>(
  init?: RequestInit,
  signal?: AbortSignal,
): Promise<T> => {
  const response = await fetch("/api/agent", {
    ...init,
    signal,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as T & AgentProviderErrorPayload;
  if (!response.ok) {
    throw new AgentProviderError(
      payload.error || `Agent API failed with status ${response.status}.`,
      response.status,
      payload,
    );
  }

  return payload;
};

export const getAgentProviderStatus = (signal?: AbortSignal) =>
  requestAgentApi<AgentProviderStatus>(undefined, signal);

export const startAgentProvider = (runId: string, signal?: AbortSignal) =>
  requestAgentApi<AgentProviderStatus & { ok: true }>(
    {
      method: "POST",
      body: JSON.stringify({ action: "start", runId }),
    },
    signal,
  );

export const runAgentProviderStep = (
  runId: string,
  task: string,
  signal?: AbortSignal,
) =>
  requestAgentApi<AgentProviderStepResult>(
    {
      method: "POST",
      body: JSON.stringify({ action: "step", runId, task }),
    },
    signal,
  );

export const stopAgentProvider = (runId: string, signal?: AbortSignal) =>
  requestAgentApi<{ ok: true }>(
    {
      method: "POST",
      body: JSON.stringify({ action: "stop", runId }),
    },
    signal,
  );
