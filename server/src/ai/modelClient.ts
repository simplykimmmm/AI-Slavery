import type { z } from "zod";

export interface ModelUsage {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export interface ModelClient {
  generateStructured<T>(args: {
    schemaName: string;
    systemPrompt: string;
    userPrompt: string;
    zodSchema: z.ZodType<T>;
    temperature?: number;
    taskId?: string;
    agentId?: string;
  }): Promise<{ data: T; usage: ModelUsage }>;
}

export type StructuredGenerationArgs<T> = Parameters<ModelClient["generateStructured"]>[0] & {
  zodSchema: z.ZodType<T>;
};
