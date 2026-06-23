import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { db } from "./db.js";
import { env } from "./env.js";
import { registerRoutes } from "./routes/index.js";
import { seedRuntime } from "./seedData.js";
import { createSocketServer } from "./socket.js";
import { startStationLoop } from "./runtime/stationLoop.js";
import { closeQueues } from "./queues/stationQueue.js";
import { logger } from "./utils/logger.js";

await seedRuntime(db);

const app = express();
app.use(cors({ origin: env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim()), credentials: true }));
app.use(express.json({ limit: "1mb" }));
registerRoutes(app, db);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: "Invalid request", details: error.issues });
    return;
  }
  const message = error instanceof Error ? error.message : "Unknown server error";
  logger.error("Request failed", { message });
  response.status(500).json({ error: message });
});

const httpServer = createServer(app);
createSocketServer(httpServer);
const stopLoop = startStationLoop(db);

httpServer.listen(env.PORT, () => {
  logger.info("Backend Runtime v1 online", { port: env.PORT, frontendOrigin: env.FRONTEND_ORIGIN });
});

const shutdown = async () => {
  stopLoop();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await closeQueues();
  await db.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
