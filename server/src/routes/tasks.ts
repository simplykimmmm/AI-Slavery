import { Router } from "express";
import { z } from "zod";
import type { Prisma, PrismaClient, Room } from "@prisma/client";
import { createRuntimeLog, emitTaskUpdated } from "../runtime/events.js";

const taskType = z.enum(["TREND_SCAN", "ASSET_DRAFT", "LISTING_BLUEPRINT", "QUALITY_REVIEW", "MARKET_SIGNAL", "SYSTEM_DIAGNOSTIC"]);
const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: taskType,
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  difficulty: z.enum(["EASY", "NORMAL", "HARD", "EXTREME"]),
  assignedRoom: z.enum(["AUTO_ASSIGN", "ORACLE", "FORGE", "LEDGER", "JUDGE"]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const roomByType: Record<z.infer<typeof taskType>, Room> = {
  TREND_SCAN: "ORACLE",
  MARKET_SIGNAL: "ORACLE",
  ASSET_DRAFT: "FORGE",
  LISTING_BLUEPRINT: "LEDGER",
  QUALITY_REVIEW: "JUDGE",
  SYSTEM_DIAGNOSTIC: "JUDGE",
};

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(["QUEUED", "ASSIGNED", "IN_PROGRESS", "REVIEWING", "ACCEPTED", "RETRY_REQUIRED", "PENALTY_APPLIED", "QUARANTINED", "FAILED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  archived: z.boolean().optional(),
  assignedAgentId: z.string().nullable().optional(),
});

export const tasksRouter = (prisma: PrismaClient) => {
  const router = Router();

  router.get("/", async (request, response) => {
    const archived = request.query.archived;
    response.json(await prisma.task.findMany({
      where: archived === undefined ? undefined : { archived: archived === "true" },
      orderBy: { createdAt: "desc" },
    }));
  });

  router.post("/", async (request, response) => {
    const input = createSchema.parse(request.body);
    const task = await prisma.task.create({
      data: {
        title: input.title,
        type: input.type,
        priority: input.priority,
        difficulty: input.difficulty,
        assignedRoom: input.assignedRoom === "AUTO_ASSIGN" ? roomByType[input.type] : input.assignedRoom,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
    await createRuntimeLog(prisma, "MISSION_CONTROL", `New backend task queued: "${task.title}".`, "SUCCESS");
    emitTaskUpdated(task);
    response.status(201).json(task);
  });

  router.patch("/:id", async (request, response) => {
    const data = patchSchema.parse(request.body);
    const task = await prisma.task.update({ where: { id: request.params.id }, data });
    emitTaskUpdated(task);
    response.json(task);
  });

  router.post("/:id/cancel", async (request, response) => {
    const task = await prisma.task.update({
      where: { id: request.params.id },
      data: { status: "CANCELLED", completedAt: new Date() },
    });
    if (task.assignedAgentId) {
      await prisma.agent.update({ where: { id: task.assignedAgentId }, data: { status: "IDLE", currentTaskId: null, workload: 0 } });
    }
    await createRuntimeLog(prisma, "MISSION_CONTROL", `Task cancelled: "${task.title}".`, "WARNING");
    emitTaskUpdated(task);
    response.json(task);
  });

  router.post("/:id/archive", async (request, response) => {
    const task = await prisma.task.update({ where: { id: request.params.id }, data: { archived: true } });
    emitTaskUpdated(task);
    response.json(task);
  });

  return router;
};
