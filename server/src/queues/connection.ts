import type { ConnectionOptions } from "bullmq";
import { env } from "../env.js";

const url = new URL(env.REDIS_URL);

export const redisConnection = {
  host: url.hostname,
  port: Number(url.port || 6379),
  username: url.username || undefined,
  password: url.password || undefined,
  db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: url.protocol === "rediss:" ? {} : undefined,
} satisfies ConnectionOptions;
