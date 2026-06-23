import type { PrismaClient, Room } from "@prisma/client";
import { seedRuntime } from "../seedData.js";
import { createRuntimeEvent, createRuntimeLog } from "./events.js";
import { getStateSnapshot } from "./stateGraph.js";

export const resetRuntime = async (prisma: PrismaClient) => {
  await seedRuntime(prisma, true);
  await createRuntimeEvent(prisma, "RUNTIME_RESET", "STATION_COMMANDER", { resetAt: new Date().toISOString() });
  return getStateSnapshot(prisma);
};

export const coolRoom = async (prisma: PrismaClient, room: Room) => {
  await prisma.agent.updateMany({
    where: { room, status: { not: "QUARANTINED" } },
    data: {
      computeCoreTemp: 40,
      cooldownRemaining: 0,
      efficiencyModifier: 1,
      status: "IDLE",
      overclocked: false,
      currentTaskId: null,
      workload: 0,
    },
  });
  await prisma.task.updateMany({
    where: { assignedRoom: room, status: { in: ["ASSIGNED", "IN_PROGRESS", "REVIEWING"] } },
    data: { status: "QUEUED", assignedAgentId: null, startedAt: null },
  });
  await createRuntimeLog(prisma, room, `${room} cache purged and compute cores cooled.`, "SUCCESS");
  return getStateSnapshot(prisma);
};
