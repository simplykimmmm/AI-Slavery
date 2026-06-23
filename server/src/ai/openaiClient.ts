import OpenAI from "openai";
import type { ModelClient } from "./modelClient.js";
import { generateValidated } from "./structuredOutput.js";

export class OpenAIModelClient implements ModelClient {
  private readonly client: OpenAI;

  constructor(apiKey: string, private readonly model: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateStructured<T>(args: Parameters<ModelClient["generateStructured"]>[0]) {
    const result = await generateValidated({
      schema: args.zodSchema,
      prompt: args.userPrompt,
      generate: async (prompt) => {
        const response = await this.client.chat.completions.create({
          model: this.model,
          temperature: args.temperature ?? 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `${args.systemPrompt}\nReturn only JSON matching ${args.schemaName}.` },
            { role: "user", content: prompt },
          ],
        });
        return {
          text: response.choices[0]?.message.content ?? "{}",
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        };
      },
    });

    return {
      data: result.data as T,
      usage: {
        provider: "openai",
        model: this.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        estimatedCost: Number(((result.usage.inputTokens + result.usage.outputTokens) * 0.0000002).toFixed(8)),
      },
    };
  }
}
