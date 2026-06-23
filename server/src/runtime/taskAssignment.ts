import type { Agent, Room, Task } from "@prisma/client";

const blocked = new Set(["COOLING_DOWN", "THERMAL_THROTTLING", "EXHAUSTED", "QUARANTINED"]);
const activeStatuses = ["ASSIGNED", "IN_PROGRESS", "REVIEWING"] as const;

export const chooseAgent = (
  agents: Array<Pick<Agent, "id" | "name" | "room" | "status" | "runtimeQuota" | "workload" | "completedTaskCount">>,
  tasks: Array<Pick<Task, "assignedAgentId" | "status">>,
  room: Room,
  maxActive: number,
) => agents
  .filter((agent) => {
    const activeCount = tasks.filter(
      (task) => task.assignedAgentId === agent.id && activeStatuses.includes(task.status as typeof activeStatuses[number]),
    ).length;
    return agent.room === room && !blocked.has(agent.status) && agent.runtimeQuota > 1 && activeCount < maxActive;
  })
  .sort((left, right) => left.workload - right.workload || left.completedTaskCount - right.completedTaskCount || left.id.localeCompare(right.id))[0];
