import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { agentsRouter } from "./agents.js";
import { campaignsRouter } from "./campaigns.js";
import { logsRouter } from "./logs.js";
import { runtimeRouter } from "./runtime.js";
import { statsRouter } from "./stats.js";
import { tasksRouter } from "./tasks.js";
import { getStateSnapshot } from "../runtime/stateGraph.js";

export const registerRoutes = (app: Express, prisma: PrismaClient) => {
  app.get("/api/health", async (_request, response) => {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ status: "ok", runtime: "backend-v1", dryRunExternalActions: true, timestamp: new Date().toISOString() });
  });
  app.get("/api/state", async (_request, response) => response.json(await getStateSnapshot(prisma)));
  app.use("/api/agents", agentsRouter(prisma));
  app.use("/api/tasks", tasksRouter(prisma));
  app.use("/api/logs", logsRouter(prisma));
  app.use("/api/stats", statsRouter(prisma));
  app.use("/api/runtime", runtimeRouter(prisma));
  app.use("/api/campaigns", campaignsRouter(prisma));
};
