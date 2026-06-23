interface AgentApiRequest {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string | undefined };
}

interface AgentApiResponse {
  status: (statusCode: number) => AgentApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

interface AgentRequestBody {
  action?: "start" | "step" | "stop";
  runId?: string;
  task?: string;
}

interface GroqCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
}

interface AgentRuntimeEnvironment {
  AGENT_STEP_INTERVAL_SECONDS?: string;
  GROQ_API_KEY?: string;
  GROQ_MAX_OUTPUT_TOKENS?: string;
  GROQ_MODEL?: string;
}

export interface GroqRateLimitMetadata {
  requestLimit: number | null;
  requestsRemaining: number | null;
  requestsReset: string | null;
  tokenLimit: number | null;
  tokensRemaining: number | null;
  tokensReset: string | null;
  retryAfterSeconds: number | null;
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const DEFAULT_MAX_OUTPUT_TOKENS = 256;
const recentRequests = new Map<string, number>();

const getRuntimeEnvironment = (): AgentRuntimeEnvironment =>
  (
    globalThis as typeof globalThis & {
      process?: { env?: AgentRuntimeEnvironment };
    }
  ).process?.env ?? {};

const readPositiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const readHeader = (
  headers: AgentApiRequest["headers"],
  name: string,
): string | undefined => {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

const parseIntegerHeader = (value: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseGroqRateLimitHeaders = (
  headers: Headers,
): GroqRateLimitMetadata => ({
  requestLimit: parseIntegerHeader(headers.get("x-ratelimit-limit-requests")),
  requestsRemaining: parseIntegerHeader(
    headers.get("x-ratelimit-remaining-requests"),
  ),
  requestsReset: headers.get("x-ratelimit-reset-requests"),
  tokenLimit: parseIntegerHeader(headers.get("x-ratelimit-limit-tokens")),
  tokensRemaining: parseIntegerHeader(
    headers.get("x-ratelimit-remaining-tokens"),
  ),
  tokensReset: headers.get("x-ratelimit-reset-tokens"),
  retryAfterSeconds: parseIntegerHeader(headers.get("retry-after")),
});

const parseBody = (body: unknown): AgentRequestBody | null => {
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as AgentRequestBody;
    } catch {
      return null;
    }
  }

  return body && typeof body === "object" ? (body as AgentRequestBody) : null;
};

const isSameOriginRequest = (request: AgentApiRequest) => {
  const origin = readHeader(request.headers, "origin");
  const host = readHeader(request.headers, "host");
  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};

const getClientId = (request: AgentApiRequest) => {
  const forwardedFor = readHeader(request.headers, "x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || request.socket?.remoteAddress || "unknown";
};

const setResponseHeaders = (response: AgentApiResponse) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
};

export const callGroqStep = async (
  apiKey: string,
  task: string,
  fetchImplementation: typeof fetch = fetch,
) => {
  const environment = getRuntimeEnvironment();
  const model = environment.GROQ_MODEL?.trim() || DEFAULT_MODEL;
  const maxTokens = readPositiveInteger(
    environment.GROQ_MAX_OUTPUT_TOKENS,
    DEFAULT_MAX_OUTPUT_TOKENS,
  );
  const groqResponse = await fetchImplementation(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: [
        {
          role: "system",
          content:
            "You are a controlled automation assistant. Complete only the requested analysis task. Do not send messages, purchase anything, delete data, change permissions, or claim to have performed external actions. Return a concise plain-text operator update.",
        },
        {
          role: "user",
          content: `Current bounded workflow task: ${task}`,
        },
      ],
    }),
  });
  const rateLimit = parseGroqRateLimitHeaders(groqResponse.headers);
  const payload = (await groqResponse.json()) as GroqCompletionResponse;

  if (!groqResponse.ok) {
    return {
      ok: false as const,
      status: groqResponse.status,
      error: payload.error?.message || "Groq rejected the request.",
      rateLimit,
    };
  }

  const output = payload.choices?.[0]?.message?.content?.trim();
  if (!output) {
    return {
      ok: false as const,
      status: 502,
      error: "Groq returned an empty response.",
      rateLimit,
    };
  }

  return {
    ok: true as const,
    model,
    output: output.slice(0, 2_000),
    usage: {
      promptTokens: payload.usage?.prompt_tokens ?? 0,
      completionTokens: payload.usage?.completion_tokens ?? 0,
      totalTokens: payload.usage?.total_tokens ?? 0,
    },
    rateLimit,
  };
};

export default async function handler(
  request: AgentApiRequest,
  response: AgentApiResponse,
) {
  setResponseHeaders(response);

  if (!isSameOriginRequest(request)) {
    response.status(403).json({ error: "Cross-origin requests are not allowed." });
    return;
  }

  const environment = getRuntimeEnvironment();
  const apiKey = environment.GROQ_API_KEY?.trim();
  const model = environment.GROQ_MODEL?.trim() || DEFAULT_MODEL;

  if (request.method === "GET") {
    response.status(200).json({
      configured: Boolean(apiKey),
      provider: "Groq",
      model,
    });
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  if (!apiKey) {
    response.status(503).json({
      error: "GROQ_API_KEY is not configured on the server.",
    });
    return;
  }

  const body = parseBody(request.body);
  if (!body?.action) {
    response.status(400).json({ error: "A valid action is required." });
    return;
  }

  if (body.action === "start" || body.action === "stop") {
    response.status(200).json({
      ok: true,
      action: body.action,
      configured: true,
      provider: "Groq",
      model,
    });
    return;
  }

  const task = body.task?.trim();
  if (!body.runId || !task || task.length > 240) {
    response.status(400).json({
      error: "A run ID and task of 240 characters or fewer are required.",
    });
    return;
  }

  const clientId = getClientId(request);
  const now = Date.now();
  const minimumIntervalMs = readPositiveInteger(
    environment.AGENT_STEP_INTERVAL_SECONDS,
    5,
  ) * 900;
  const previousRequestAt = recentRequests.get(clientId) ?? 0;
  if (now - previousRequestAt < minimumIntervalMs) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((minimumIntervalMs - (now - previousRequestAt)) / 1_000),
    );
    response.setHeader("Retry-After", String(retryAfterSeconds));
    response.status(429).json({
      error: "Agent steps are arriving too quickly.",
      retryAfterSeconds,
    });
    return;
  }
  if (recentRequests.size > 5_000) {
    recentRequests.clear();
  }
  recentRequests.set(clientId, now);

  try {
    const result = await callGroqStep(apiKey, task);
    if (!result.ok) {
      response.status(result.status).json({
        error: result.error,
        rateLimit: result.rateLimit,
        retryAfterSeconds: result.rateLimit.retryAfterSeconds,
      });
      return;
    }

    response.status(200).json(result);
  } catch {
    response.status(502).json({
      error: "The Groq service could not be reached.",
    });
  }
}
