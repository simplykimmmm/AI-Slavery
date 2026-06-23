import { env } from "../env.js";
import type { ModelClient } from "./modelClient.js";
import { GeminiModelClient } from "./geminiClient.js";
import { MockModelClient } from "./mockModelClient.js";
import { OpenAIModelClient } from "./openaiClient.js";

export const createModelClient = (): ModelClient => {
  if (env.OPENAI_API_KEY) {
    return new OpenAIModelClient(env.OPENAI_API_KEY, env.OPENAI_MODEL);
  }
  if (env.GEMINI_API_KEY) {
    return new GeminiModelClient(env.GEMINI_API_KEY, env.GEMINI_MODEL);
  }
  return new MockModelClient();
};
