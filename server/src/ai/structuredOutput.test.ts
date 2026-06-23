import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseStructuredOutput } from "./structuredOutput.js";

describe("structured output validation", () => {
  it("accepts valid JSON and rejects invalid schema data", () => {
    const schema = z.object({ score: z.number().min(0).max(1) });
    expect(parseStructuredOutput('{"score":0.8}', schema)).toEqual({ score: 0.8 });
    expect(() => parseStructuredOutput('{"score":"bad"}', schema)).toThrow();
  });
});
