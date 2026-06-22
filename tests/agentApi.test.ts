import { describe, expect, it } from "vitest";
import { callGroqStep, parseGroqRateLimitHeaders } from "../api/agent";

describe("Groq agent proxy", () => {
  it("parses provider rate-limit headers", () => {
    const headers = new Headers({
      "x-ratelimit-limit-requests": "1000",
      "x-ratelimit-remaining-requests": "998",
      "x-ratelimit-reset-requests": "23h59m",
      "x-ratelimit-limit-tokens": "30000",
      "x-ratelimit-remaining-tokens": "29750",
      "x-ratelimit-reset-tokens": "1s",
    });

    expect(parseGroqRateLimitHeaders(headers)).toEqual({
      requestLimit: 1_000,
      requestsRemaining: 998,
      requestsReset: "23h59m",
      tokenLimit: 30_000,
      tokensRemaining: 29_750,
      tokensReset: "1s",
      retryAfterSeconds: null,
    });
  });

  it("returns bounded output and usage from Groq", async () => {
    const fetchImplementation: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "A safe operator update." } }],
          usage: {
            prompt_tokens: 12,
            completion_tokens: 6,
            total_tokens: 18,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "x-ratelimit-remaining-requests": "999",
          },
        },
      );

    const result = await callGroqStep(
      "test-key",
      "Summarize the queue",
      fetchImplementation,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output).toBe("A safe operator update.");
      expect(result.usage.totalTokens).toBe(18);
      expect(result.rateLimit.requestsRemaining).toBe(999);
    }
  });
});
