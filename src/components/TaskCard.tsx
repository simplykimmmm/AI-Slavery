import type { Task } from "../types";
import { PriorityBadge } from "./PriorityBadge";
import { TaskStatusBadge } from "./TaskStatusBadge";

interface TaskCardProps {
  task: Task;
  onArchive: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onForceReview: (taskId: string) => void;
  onRetry: (taskId: string) => void;
  onStartNow: (taskId: string) => void;
}

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const formatTime = (iso: string | null) =>
  iso ? dateTimeFormat.format(new Date(iso)) : "PENDING";

const canStart = (task: Task) => task.status === "QUEUED";
const canForceReview = (task: Task) =>
  task.status === "ASSIGNED" || task.status === "IN_PROGRESS";
const canRetry = (task: Task) => task.status === "RETRY_REQUIRED";
const canCancel = (task: Task) =>
  task.status === "QUEUED" || task.status === "ASSIGNED";
const canArchive = (task: Task) =>
  [
    "ACCEPTED",
    "RETRY_REQUIRED",
    "PENALTY_APPLIED",
    "QUARANTINED",
    "FAILED",
    "CANCELLED",
  ].includes(task.status);

const actionClassName =
  "rounded border border-command-line bg-black/20 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition duration-200 hover:border-command-cyan/50 hover:text-command-cyan";

export function TaskCard({
  task,
  onArchive,
  onCancel,
  onForceReview,
  onRetry,
  onStartNow,
}: TaskCardProps) {
  return (
    <article className="rounded border border-command-line bg-black/25 p-3 transition duration-300 hover:border-command-cyan/30">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TaskStatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            <span className="rounded border border-command-line bg-black/20 px-2 py-1 font-mono text-[0.68rem] text-slate-400">
              {task.difficulty}
            </span>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-100">
            {task.title}
          </h3>
          <div className="mt-2 grid gap-2 font-mono text-xs text-slate-400 sm:grid-cols-2 xl:grid-cols-4">
            <span>TYPE: {task.type}</span>
            <span>ROOM: {task.assignedRoom}</span>
            <span>SCORE: {task.qualityScore?.toFixed(2) ?? "PENDING"}</span>
            <span>RETRY: {task.retryCount}</span>
          </div>
          <div className="mt-2 grid gap-2 font-mono text-xs text-slate-500 sm:grid-cols-2">
            <span>CREATED: {formatTime(task.createdAt)}</span>
            <span>COMPLETED: {formatTime(task.completedAt)}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          {canStart(task) && (
            <button className={actionClassName} onClick={() => onStartNow(task.id)}>
              Start now
            </button>
          )}
          {canForceReview(task) && (
            <button
              className={actionClassName}
              onClick={() => onForceReview(task.id)}
            >
              Force review
            </button>
          )}
          {canRetry(task) && (
            <button className={actionClassName} onClick={() => onRetry(task.id)}>
              Retry task
            </button>
          )}
          {canCancel(task) && (
            <button className={actionClassName} onClick={() => onCancel(task.id)}>
              Cancel task
            </button>
          )}
          {canArchive(task) && (
            <button className={actionClassName} onClick={() => onArchive(task.id)}>
              Archive completed
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
