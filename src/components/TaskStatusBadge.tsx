import type { TaskStatus } from "../types";

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

const statusClasses: Record<TaskStatus, string> = {
  QUEUED: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  ASSIGNED: "border-command-cyan/30 bg-command-cyan/10 text-command-cyan",
  IN_PROGRESS: "border-command-violet/30 bg-command-violet/10 text-command-violet",
  REVIEWING: "border-command-amber/30 bg-command-amber/10 text-command-amber",
  ACCEPTED: "border-command-green/30 bg-command-green/10 text-command-green",
  RETRY_REQUIRED: "border-command-amber/40 bg-command-amber/10 text-command-amber",
  PENALTY_APPLIED: "border-command-red/40 bg-command-red/10 text-command-red",
  QUARANTINED: "border-command-violet/40 bg-command-violet/10 text-command-violet",
  FAILED: "border-command-red/50 bg-command-red/15 text-command-red",
  CANCELLED: "border-slate-500/40 bg-slate-500/10 text-slate-300",
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-1 font-mono text-[0.68rem] font-semibold ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}
