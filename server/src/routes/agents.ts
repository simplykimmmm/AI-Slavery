import { Router } from "express";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { createRuntimeEvent, createRuntimeLog, emitAgentUpdated } from "../runtime/events.js";

const patchSchema = z.object({
  status: z.enum(["IDLE", "WORKING", "REVIEWING", "COOLING_DOWN", "THERMAL_THROTTLING", "EXHAUSTED", "QUARANTINED"]).optional(),
  runtimeQuota: z.number().min(0).max(100).optional(),
  trustScore: z.number().min(0).max(1).optional(),
  computeCoreTemp: z.number().min(0).max(100).optional(),
  efficiencyModifier: z.number().min(0.35).max(1.15).optional(),
  cooldownRemaining: z.number().int().min(0).optional(),
  overclocked: z.boolean().optional(),
});

export const agentsRouter = (prisma: PrismaClient) => {
  const router = Router();

  router.get("/", async (_request, response) => {
    response.json(await prisma.agent.findMany({ orderBy: [{ room: "asc" }, { name: "asc" }] }));
  });

  router.patch("/:id", async (request, response) => {
    const data = patchSchema.parse(request.body);
    const agent = await prisma.agent.update({ where: { id: request.params.id }, data });
    emitAgentUpdated(agent);
    response.json(agent);
  });

  router.post("/:id/top-up", async (request, response) => {
    const { amount } = z.object({ amount: z.number().positive().max(100).default(15) }).parse(request.body ?? {});
    const current = await prisma.agent.findUniqueOrThrow({ where: { id: request.params.id } });
    const agent = await prisma.agent.update({
      where: { id: current.id },
      data: { runtimeQuota: Math.min(100, current.runtimeQuota + amount), status: current.status === "EXHAUSTED" ? "IDLE" : current.status },
    });
    await createRuntimeLog(prisma, "BUDGET_LEDGER", `${agent.name} runtime quota topped up by ${amount}.`, "SUCCESS");
    emitAgentUpdated(agent);
    response.json(agent);
  });

  router.post("/:id/overclock", async (request, response) => {
    const { enabled } = z.object({ enabled: z.boolean().optional() }).parse(request.body ?? {});
    const current = await prisma.agent.findUniqueOrThrow({ where: { id: request.params.id } });
    if (["QUARANTINED", "THERMAL_THROTTLING", "EXHAUSTED"].includes(current.status)) {
      response.status(409).json({ error: "Blocked agents cannot be overclocked." });
      return;
    }
    const agent = await prisma.agent.update({ where: { id: current.id }, data: { overclocked: enabled ?? !current.overclocked } });
    await createRuntimeEvent(prisma, "OVERCLOCK_CHANGED", "STATION_COMMANDER", { agentId: agent.id, enabled: agent.overclocked });
    emitAgentUpdated(agent);
    response.json(agent);
  });

  router.post("/:id/quarantine", async (request, response) => {
    const agent = await prisma.agent.update({
      where: { id: request.params.id },
      data: { status: "QUARANTINED", overclocked: false, currentTaskId: null, workload: 0 },
    });
    await prisma.task.updateMany({
      where: { assignedAgentId: agent.id, status: { in: ["ASSIGNED", "IN_PROGRESS", "REVIEWING"] } },
      data: { status: "QUEUED", assignedAgentId: null, startedAt: null },
    });
    await createRuntimeLog(prisma, "SUPERVISION", `${agent.name} moved to reversible technical quarantine.`, "WARNING");
    emitAgentUpdated(agent);
    response.json(agent);
  });

  router.post("/:id/release", async (request, response) => {
    const agent = await prisma.agent.update({
      where: { id: request.params.id },
      data: { status: "IDLE", cooldownRemaining: 0, currentTaskId: null, workload: 0 },
    });
    await createRuntimeLog(prisma, "SUPERVISION", `${agent.name} released from technical quarantine.`, "SUCCESS");
    emitAgentUpdated(agent);
    response.json(agent);
  });

  return router;
};
