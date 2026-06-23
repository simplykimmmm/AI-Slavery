import type { z } from "zod";

export const parseStructuredOutput = <T>(raw: string, schema: z.ZodType<T>): T => {
  const normalized = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return schema.parse(JSON.parse(normalized));
};

export const generateValidated = async <T>(args: {
  schema: z.ZodType<T>;
  prompt: string;
  generate: (prompt: string) => Promise<{ text: string; inputTokens: number; outputTokens: number }>;
}) => {
  let firstError: unknown;
  const first = await args.generate(args.prompt);
  try {
    return { data: parseStructuredOutput(first.text, args.schema), usage: first };
  } catch (error) {
    firstError = error;
  }

  const repaired = await args.generate(
    `${args.prompt}\n\nYour previous response failed schema validation. Return only valid JSON with every required field and no markdown.`,
  );
  try {
    return {
      data: parseStructuredOutput(repaired.text, args.schema),
      usage: {
        text: repaired.text,
        inputTokens: first.inputTokens + repaired.inputTokens,
        outputTokens: first.outputTokens + repaired.outputTokens,
      },
    };
  } catch {
    throw firstError;
  }
};
