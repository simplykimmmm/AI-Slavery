import { useMemo, useState } from "react";
import type { Task, TaskStatus } from "../../types";
import { TaskStatusBadge } from "../TaskStatusBadge";

interface TaskArchiveProps {
  tasks: Task[];
  onClearArchive: () => void;
}

const filters: Array<{ label: string; value: "ALL" | TaskStatus }> = [
  { label: "All", value: "ALL" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Retry required", value: "RETRY_REQUIRED" },
  { label: "Penalty applied", value: "PENALTY_APPLIED" },
  { label: "Quarantined", value: "QUARANTINED" },
  { label: "Failed", value: "FAILED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const formatTime = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date(iso))
    : "PENDING";

export function TaskArchive({ tasks, onClearArchive }: TaskArchiveProps) {
  const [filter, setFilter] = useState<"ALL" | TaskStatus>("ALL");
  const archivedTasks = useMemo(
    () =>
      tasks.filter(
        (task) => task.archived && (filter === "ALL" || task.status === filter),
      ),
    [filter, tasks],
  );

  return (
    <section className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-100">
            Archive // Task History
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Archived completed mission records stored locally.
          </p>
        </div>
        <button
          type="button"
          onClick={onClearArchive}
          className="rounded border border-command-red/40 bg-command-red/10 px-3 py-2 text-sm font-semibold text-command-red transition duration-200 hover:border-command-red hover:bg-command-red/20"
        >
          Clear Archive
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            type="button"
            key={item.value}
            onClick={() => setFilter(item.value)}
            className={`rounded border px-2.5 py-1.5 text-xs font-semibold transition duration-200 ${
              filter === item.value
                ? "border-command-cyan bg-command-cyan/10 text-command-cyan"
                : "border-command-line bg-black/25 text-slate-400 hover:border-command-cyan/40 hover:text-slate-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded border border-command-line">
        <table className="min-w-[960px] w-full border-collapse bg-black/25 text-left text-sm">
          <thead className="bg-command-panel2 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Title</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Room</th>
              <th className="px-3 py-3">Priority</th>
              <th className="px-3 py-3">Difficulty</th>
              <th className="px-3 py-3">Final status</th>
              <th className="px-3 py-3">Score</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Completed</th>
            </tr>
          </thead>
          <tbody>
            {archivedTasks.length === 0 ? (
              <tr>
                <td className="px-3 py-5 text-slate-400" colSpan={9}>
                  No archived task records match this filter.
                </td>
              </tr>
            ) : (
              archivedTasks.map((task) => (
                <tr key={task.id} className="border-t border-command-line">
                  <td className="px-3 py-3 text-slate-100">{task.title}</td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-400">
                    {task.type}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-400">
                    {task.assignedRoom}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-400">
                    {task.priority}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-400">
                    {task.difficulty}
                  </td>
                  <td className="px-3 py-3">
                    <TaskStatusBadge status={task.status} />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-400">
                    {task.qualityScore?.toFixed(2) ?? "N/A"}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-400">
                    {formatTime(task.createdAt)}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-400">
                    {formatTime(task.completedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
