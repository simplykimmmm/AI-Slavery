import { EventEmitter } from "node:events";
import type { LogSeverity, Prisma, PrismaClient } from "@prisma/client";

export const runtimeBus = new EventEmitter();
runtimeBus.setMaxListeners(50);

export const createRuntimeLog = async (
  prisma: PrismaClient,
  source: string,
  message: string,
  severity: LogSeverity = "INFO",
  metadata?: Prisma.InputJsonValue,
) => {
  const log = await prisma.logEntry.create({ data: { source, message, severity, metadata } });
  runtimeBus.emit("log:created", log);
  return log;
};

export const createRuntimeEvent = async (
  prisma: PrismaClient,
  type: string,
  source: string,
  payload: Prisma.InputJsonValue,
) => {
  const event = await prisma.runtimeEvent.create({ data: { type, source, payload } });
  runtimeBus.emit("runtime:event", event);
  return event;
};

export const emitAgentUpdated = (agent: unknown) => runtimeBus.emit("agent:updated", agent);
export const emitTaskUpdated = (task: unknown) => runtimeBus.emit("task:updated", task);
export const emitSnapshot = (snapshot: unknown) => runtimeBus.emit("state:snapshot", snapshot);
export const emitStats = (stats: unknown) => runtimeBus.emit("stats:updated", stats);
