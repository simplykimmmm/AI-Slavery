import "dotenv/config";
import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const booleanString = (defaultValue = false) => z
  .enum(["true", "false"])
  .default(defaultValue ? "true" : "false")
  .transform((value) => value === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  DRY_RUN_EXTERNAL_ACTIONS: booleanString(true),
  ENABLE_WATCHERS: booleanString(),
  ENABLE_PLAYWRIGHT: booleanString(),
});

export const env = schema.parse(process.env);
