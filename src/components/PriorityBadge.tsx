import type { TaskPriority } from "../types";

interface PriorityBadgeProps {
  priority: TaskPriority;
}

const priorityClasses: Record<TaskPriority, string> = {
  LOW: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  MEDIUM: "border-command-cyan/30 bg-command-cyan/10 text-command-cyan",
  HIGH: "border-command-amber/40 bg-command-amber/10 text-command-amber",
  CRITICAL: "border-command-red/50 bg-command-red/15 text-command-red",
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-1 font-mono text-[0.68rem] font-semibold ${priorityClasses[priority]}`}
    >
      {priority}
    </span>
  );
}
