import { Router } from "express";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { coolRoom, resetRuntime } from "../runtime/runtimeService.js";
import { createRuntimeLog } from "../runtime/events.js";
import { getStateSnapshot } from "../runtime/stateGraph.js";

export const runtimeRouter = (prisma: PrismaClient) => {
  const router = Router();

  router.post("/pause", async (_request, response) => {
    await prisma.systemState.update({ where: { id: "singleton" }, data: { isPaused: true } });
    await createRuntimeLog(prisma, "STATION_COMMANDER", "Persistent station runtime paused by operator.", "WARNING");
    response.json(await getStateSnapshot(prisma));
  });

  router.post("/resume", async (_request, response) => {
    await prisma.systemState.update({ where: { id: "singleton" }, data: { isPaused: false } });
    await createRuntimeLog(prisma, "STATION_COMMANDER", "Persistent station runtime resumed by operator.", "SUCCESS");
    response.json(await getStateSnapshot(prisma));
  });

  router.post("/speed", async (request, response) => {
    const { cycleSpeed } = z.object({ cycleSpeed: z.enum(["SLOW", "NORMAL", "FAST", "OVERDRIVE"]) }).parse(request.body);
    await prisma.systemState.update({ where: { id: "singleton" }, data: { cycleSpeed } });
    await createRuntimeLog(prisma, "STATION_COMMANDER", `Cycle speed changed to ${cycleSpeed}.`, "INFO");
    response.json(await getStateSnapshot(prisma));
  });

  router.post("/settings", async (request, response) => {
    const data = z.object({
      autoProcessTasks: z.boolean().optional(),
      autoGenerateTasks: z.boolean().optional(),
      qualityStrictness: z.enum(["LENIENT", "NORMAL", "HARSH"]).optional(),
      maxActiveTasksPerAgent: z.number().int().min(1).max(8).optional(),
    }).parse(request.body);
    await prisma.systemState.update({ where: { id: "singleton" }, data });
    response.json(await getStateSnapshot(prisma));
  });

  router.post("/reset", async (_request, response) => response.json(await resetRuntime(prisma)));

  router.post("/cool-room", async (request, response) => {
    const { room } = z.object({ room: z.enum(["ORACLE", "FORGE", "LEDGER", "JUDGE"]) }).parse(request.body);
    response.json(await coolRoom(prisma, room));
  });

  return router;
};
