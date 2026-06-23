import type { PrismaClient } from "@prisma/client";
import { taskExecutionQueue } from "../queues/stationQueue.js";
import { createRuntimeEvent, createRuntimeLog, emitAgentUpdated, emitTaskUpdated } from "./events.js";

const activeStatuses = ["ASSIGNED", "IN_PROGRESS", "REVIEWING"] as const;
import { chooseAgent } from "./taskAssignment.js";

export const assignAvailableTasks = async (prisma: PrismaClient) => {
  const [system, queuedTasks, agents, activeTasks] = await Promise.all([
    prisma.systemState.findUniqueOrThrow({ where: { id: "singleton" } }),
    prisma.task.findMany({ where: { status: "QUEUED", archived: false }, orderBy: [{ createdAt: "asc" }] }),
    prisma.agent.findMany(),
    prisma.task.findMany({ where: { status: { in: [...activeStatuses] } } }),
  ]);
  const allTasks = [...activeTasks];

  for (const task of queuedTasks) {
    const agent = chooseAgent(agents, allTasks, task.assignedRoom, system.maxActiveTasksPerAgent);
    if (!agent) continue;

    const [updatedTask, updatedAgent] = await prisma.$transaction([
      prisma.task.update({
        where: { id: task.id },
        data: { status: "ASSIGNED", assignedAgentId: agent.id, startedAt: task.startedAt ?? new Date() },
      }),
      prisma.agent.update({
        where: { id: agent.id },
        data: { status: "WORKING", currentTaskId: task.id, workload: { increment: 35 } },
      }),
    ]);
    allTasks.push(updatedTask);
    Object.assign(agent, updatedAgent);
    await taskExecutionQueue.add("execute", { taskId: task.id }, { jobId: `execute-${task.id}-${task.retryCount}` });
    await createRuntimeLog(prisma, task.assignedRoom, `Task assigned to ${agent.name}: "${task.title}".`, "INFO");
    await createRuntimeEvent(prisma, "TASK_ASSIGNED", "ORCHESTRATOR", { taskId: task.id, agentId: agent.id });
    emitTaskUpdated(updatedTask);
    emitAgentUpdated(updatedAgent);
  }
};
