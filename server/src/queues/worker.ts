import type { Prisma } from "@prisma/client";
import { Worker } from "bullmq";
import { z } from "zod";
import { createModelClient } from "../ai/index.js";
import { schemaByTaskType } from "../ai/schemas.js";
import { marketplaceAdapter, deliveryAdapter } from "../adapters/index.js";
import { db } from "../db.js";
import { recordModelUsage } from "../runtime/budgetLedger.js";
import { createRuntimeEvent, createRuntimeLog, emitAgentUpdated, emitTaskUpdated } from "../runtime/events.js";
import { calculateQualityScore, resolveQualityOutcome, type Difficulty, type Strictness } from "../runtime/qualityJudge.js";
import { logger } from "../utils/logger.js";
import { redisConnection } from "./connection.js";
import { QUEUE_NAMES, qualityReviewQueue } from "./stationQueue.js";

const model = createModelClient();

const executionWorker = new Worker(
  QUEUE_NAMES.taskExecution,
  async (job) => {
    const task = await db.task.findUnique({ where: { id: String(job.data.taskId) }, include: { assignedAgent: true } });
    if (!task?.assignedAgent || !["ASSIGNED", "IN_PROGRESS"].includes(task.status)) return;
      await db.task.update({ where: { id: task.id }, data: { status: "IN_PROGRESS", stageTicks: { increment: task.assignedAgent.overclocked ? 2 : 1 } } });
    const definition = schemaByTaskType[task.type as keyof typeof schemaByTaskType] ?? schemaByTaskType.SYSTEM_DIAGNOSTIC;

    try {
      const generated = await model.generateStructured<unknown>({
        schemaName: definition.name,
        systemPrompt: "You are a supervised production agent. Produce safe structured output for operator review. Never publish or contact external services.",
        userPrompt: `Task: ${task.title}\nType: ${task.type}\nDifficulty: ${task.difficulty}\nPayload: ${JSON.stringify(task.payload)}`,
        zodSchema: definition.schema as z.ZodType<unknown>,
        temperature: 0.2,
        taskId: task.id,
        agentId: task.assignedAgent.id,
      });
      const updated = await db.task.update({
        where: { id: task.id },
        data: { status: "REVIEWING", result: generated.data as Prisma.InputJsonValue, stageTicks: 0 },
      });
      await db.agent.update({ where: { id: task.assignedAgent.id }, data: { status: "REVIEWING" } });
      const usage = task.assignedAgent.overclocked
        ? {
            ...generated.usage,
            inputTokens: generated.usage.inputTokens * 2,
            outputTokens: generated.usage.outputTokens * 2,
            estimatedCost: generated.usage.estimatedCost * 2,
          }
        : generated.usage;
      await recordModelUsage(db, { taskId: task.id, agentId: task.assignedAgent.id, usage });
      await qualityReviewQueue.add("review", { taskId: task.id }, { jobId: `review-${task.id}-${task.retryCount}` });
      await createRuntimeLog(db, task.assignedRoom, `${task.assignedAgent.name} completed structured output for "${task.title}".`, "SUCCESS");
      emitTaskUpdated(updated);
    } catch (error) {
      const retryCount = task.retryCount + 1;
      const status = retryCount <= 3 ? "RETRY_REQUIRED" : "FAILED";
      const updated = await db.task.update({
        where: { id: task.id },
        data: { status, retryCount, assignedAgentId: null, result: undefined },
      });
      await db.agent.update({ where: { id: task.assignedAgent.id }, data: { status: "IDLE", currentTaskId: null, workload: 0 } });
      await createRuntimeLog(db, "MODEL_GATE", `Structured output validation failed for "${task.title}": ${error instanceof Error ? error.message : "unknown error"}`, status === "FAILED" ? "CRITICAL" : "WARNING");
      emitTaskUpdated(updated);
    }
  },
  { connection: redisConnection, concurrency: 5 },
);

const reviewWorker = new Worker(
  QUEUE_NAMES.qualityReview,
  async (job) => {
    const task = await db.task.findUnique({ where: { id: String(job.data.taskId) }, include: { assignedAgent: true } });
    if (!task?.assignedAgent || task.status !== "REVIEWING") return;
    const system = await db.systemState.findUniqueOrThrow({ where: { id: "singleton" } });
    const score = calculateQualityScore({
      difficulty: task.difficulty as Difficulty,
      trustScore: task.assignedAgent.trustScore,
      efficiencyModifier: task.assignedAgent.efficiencyModifier,
      strictness: system.qualityStrictness as Strictness,
      retryCount: task.retryCount,
      heat: task.assignedAgent.computeCoreTemp,
      overclocked: task.assignedAgent.overclocked,
    });
    const outcome = resolveQualityOutcome(score, system.qualityStrictness as Strictness, task.retryCount);
    const retry = outcome === "RETRY_REQUIRED";
    const quarantined = outcome === "QUARANTINED";
    const updatedTask = await db.task.update({
      where: { id: task.id },
      data: {
        status: outcome,
        qualityScore: score,
        retryCount: retry ? { increment: 1 } : undefined,
        assignedAgentId: retry ? null : task.assignedAgent.id,
        completedAt: retry ? null : new Date(),
      },
    });
    const updatedAgent = await db.agent.update({
      where: { id: task.assignedAgent.id },
      data: outcome === "ACCEPTED"
        ? { status: "IDLE", currentTaskId: null, workload: 0, trustScore: { increment: 0.02 }, completedTaskCount: { increment: 1 }, lastOutputScore: score }
        : quarantined
          ? { status: "QUARANTINED", currentTaskId: null, workload: 0, overclocked: false, trustScore: { decrement: 0.08 }, lastOutputScore: score }
          : outcome === "PENALTY_APPLIED"
            ? { status: "COOLING_DOWN", currentTaskId: null, workload: 0, cooldownRemaining: 15, overclocked: false, trustScore: { decrement: 0.04 }, lastOutputScore: score }
            : { status: "IDLE", currentTaskId: null, workload: 0, trustScore: { decrement: 0.01 }, lastOutputScore: score },
    });
    await createRuntimeLog(db, "JUDGE", `Quality score ${score.toFixed(2)}: "${task.title}" marked ${outcome}.`, outcome === "ACCEPTED" ? "SUCCESS" : quarantined ? "CRITICAL" : "WARNING");
    await createRuntimeEvent(db, "QUALITY_REVIEW_COMPLETED", "JUDGE", { taskId: task.id, agentId: task.assignedAgent.id, score, outcome });
    emitTaskUpdated(updatedTask);
    emitAgentUpdated(updatedAgent);
  },
  { connection: redisConnection, concurrency: 3 },
);

const externalActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("marketplace-draft"), input: z.object({ taskId: z.string(), title: z.string(), description: z.string(), tags: z.array(z.string()), price: z.number().optional() }) }),
  z.object({ kind: z.literal("delivery-package"), input: z.object({ taskId: z.string(), title: z.string(), files: z.array(z.string()).optional(), metadata: z.record(z.string(), z.unknown()) }) }),
]);

const externalWorker = new Worker(
  QUEUE_NAMES.externalAction,
  async (job) => {
    const action = externalActionSchema.parse(job.data);
    const result = action.kind === "marketplace-draft"
      ? await marketplaceAdapter.createDraftListing(action.input)
      : await deliveryAdapter.createDeliveryPackage(action.input);
    await createRuntimeEvent(db, "DRY_RUN_EXTERNAL_ACTION", "ADAPTER", { kind: action.kind, result } as unknown as Prisma.InputJsonValue);
    return result;
  },
  { connection: redisConnection, concurrency: 2 },
);

for (const worker of [executionWorker, reviewWorker, externalWorker]) {
  worker.on("failed", (job, error) => logger.error("Queue job failed", { queue: worker.name, jobId: job?.id, error: error.message }));
}

logger.info("BullMQ workers online", { queues: [QUEUE_NAMES.taskExecution, QUEUE_NAMES.qualityReview, QUEUE_NAMES.externalAction] });

const shutdown = async () => {
  await Promise.all([executionWorker.close(), reviewWorker.close(), externalWorker.close()]);
  await db.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
