import type { PrismaClient } from "@prisma/client";
import { updateAgentVitals } from "./agentVitals.js";
import { emitSnapshot, emitStats } from "./events.js";
import { assignAvailableTasks } from "./orchestrator.js";
import { getStateSnapshot } from "./stateGraph.js";
import { logger } from "../utils/logger.js";

const speedMs: Record<string, number> = {
  SLOW: 3_000,
  NORMAL: 1_500,
  FAST: 750,
  OVERDRIVE: 350,
};

export const tickStation = async (prisma: PrismaClient) => {
  const system = await prisma.systemState.findUniqueOrThrow({ where: { id: "singleton" } });
  const agents = await prisma.agent.findMany();
  await Promise.all(agents.map((agent) => prisma.agent.update({
    where: { id: agent.id },
    data: system.isPaused ? { lastHeartbeatAt: new Date() } : updateAgentVitals(agent),
  })));

  if (!system.isPaused) {
    if (system.autoProcessTasks) {
      await assignAvailableTasks(prisma);
    }
    const degradedCount = await prisma.agent.count({
      where: { status: { in: ["THERMAL_THROTTLING", "EXHAUSTED", "QUARANTINED"] } },
    });
    await prisma.systemState.update({
      where: { id: "singleton" },
      data: {
        cycleCount: { increment: 1 },
        systemStatus: degradedCount >= 2 ? "DEGRADED" : "ONLINE",
      },
    });
  }

  const snapshot = await getStateSnapshot(prisma);
  emitSnapshot(snapshot);
  emitStats(snapshot.stats);
  return snapshot;
};

export const startStationLoop = (prisma: PrismaClient) => {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const run = async () => {
    let delay = speedMs.NORMAL;
    try {
      const system = await prisma.systemState.findUnique({ where: { id: "singleton" } });
      delay = speedMs[system?.cycleSpeed ?? "NORMAL"] ?? speedMs.NORMAL;
      await tickStation(prisma);
    } catch (error) {
      logger.error("Station tick failed", { error: error instanceof Error ? error.message : String(error) });
    } finally {
      if (!stopped) {
        timer = setTimeout(run, delay);
        timer.unref();
      }
    }
  };

  void run();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
};
