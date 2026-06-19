import type { Task, TaskCreateInput } from "../types";
import { TaskCreateForm } from "./TaskCreateForm";
import { TaskQueue } from "./TaskQueue";

interface MissionControlPanelProps {
  tasks: Task[];
  onArchive: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onCreateTask: (input: TaskCreateInput) => void;
  onForceReview: (taskId: string) => void;
  onRetry: (taskId: string) => void;
  onStartNow: (taskId: string) => void;
}

export function MissionControlPanel({
  tasks,
  onArchive,
  onCancel,
  onCreateTask,
  onForceReview,
  onRetry,
  onStartNow,
}: MissionControlPanelProps) {
  return (
    <section className="grid gap-5 2xl:grid-cols-[minmax(22rem,0.75fr)_1.25fr]">
      <section className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
        <div className="mb-4">
          <div className="text-xs font-semibold uppercase text-command-violet">
            MISSION CONTROL // TASK PIPELINE
          </div>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Task Creation
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Queue simulated mission work for supervised production rooms.
          </p>
        </div>
        <TaskCreateForm onCreateTask={onCreateTask} />
      </section>

      <TaskQueue
        tasks={tasks}
        onArchive={onArchive}
        onCancel={onCancel}
        onForceReview={onForceReview}
        onRetry={onRetry}
        onStartNow={onStartNow}
      />
    </section>
  );
}
