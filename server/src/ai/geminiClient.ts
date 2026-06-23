import { GoogleGenAI } from "@google/genai";
import type { ModelClient } from "./modelClient.js";
import { generateValidated } from "./structuredOutput.js";

export class GeminiModelClient implements ModelClient {
  private readonly client: GoogleGenAI;

  constructor(apiKey: string, private readonly model: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateStructured<T>(args: Parameters<ModelClient["generateStructured"]>[0]) {
    const result = await generateValidated({
      schema: args.zodSchema,
      prompt: args.userPrompt,
      generate: async (prompt) => {
        const response = await this.client.models.generateContent({
          model: this.model,
          contents: prompt,
          config: {
            systemInstruction: `${args.systemPrompt}\nReturn only JSON matching ${args.schemaName}.`,
            responseMimeType: "application/json",
            temperature: args.temperature ?? 0.2,
          },
        });
        return {
          text: response.text ?? "{}",
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        };
      },
    });
    return {
      data: result.data as T,
      usage: {
        provider: "gemini",
        model: this.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        estimatedCost: Number(((result.usage.inputTokens + result.usage.outputTokens) * 0.0000002).toFixed(8)),
      },
    };
  }
}
