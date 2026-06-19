import type { Task } from "../types";
import { TaskCard } from "./TaskCard";

interface TaskQueueProps {
  activeLabel?: string;
  description?: string;
  emptyMessage?: string;
  tasks: Task[];
  title?: string;
  onArchive: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onForceReview: (taskId: string) => void;
  onRetry: (taskId: string) => void;
  onStartNow: (taskId: string) => void;
}

export function TaskQueue({
  activeLabel = "ACTIVE",
  description = "Simulated task pipeline under supervision",
  emptyMessage = "Mission queue is idle. Create a simulated task to begin pipeline routing.",
  tasks,
  title = "Mission Queue",
  onArchive,
  onCancel,
  onForceReview,
  onRetry,
  onStartNow,
}: TaskQueueProps) {
  const visibleTasks = tasks.filter((task) => !task.archived);

  return (
    <section className="rounded-lg border border-command-line bg-command-panel/70 p-4 shadow-panel backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-100">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        <div className="rounded border border-command-cyan/30 bg-command-cyan/10 px-2 py-1 font-mono text-xs text-command-cyan">
          {visibleTasks.length} {activeLabel}
        </div>
      </div>

      <div className="grid max-h-[520px] gap-3 overflow-y-auto pr-1 terminal-scroll">
        {visibleTasks.length === 0 ? (
          <div className="rounded border border-command-line bg-black/25 p-5 text-sm text-slate-400">
            {emptyMessage}
          </div>
        ) : (
          visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onArchive={onArchive}
              onCancel={onCancel}
              onForceReview={onForceReview}
              onRetry={onRetry}
              onStartNow={onStartNow}
            />
          ))
        )}
      </div>
    </section>
  );
}
