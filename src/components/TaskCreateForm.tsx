import { type FormEvent, useState } from "react";
import {
  ASSIGNED_ROOMS,
  TASK_DIFFICULTIES,
  TASK_PRIORITIES,
  TASK_TYPES,
} from "../lib/simulation";
import type {
  AssignedRoom,
  TaskCreateInput,
  TaskDifficulty,
  TaskPriority,
  TaskType,
} from "../types";

interface TaskCreateFormProps {
  onCreateTask: (input: TaskCreateInput) => void;
}

const inputClassName =
  "w-full rounded border border-command-line bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-600 focus:border-command-cyan focus:shadow-neon-blue";

const labelClassName = "text-xs font-semibold uppercase text-slate-500";

export function TaskCreateForm({ onCreateTask }: TaskCreateFormProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("TREND_SCAN");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [difficulty, setDifficulty] = useState<TaskDifficulty>("NORMAL");
  const [assignedRoom, setAssignedRoom] =
    useState<AssignedRoom>("AUTO_ASSIGN");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      return;
    }

    onCreateTask({
      title: normalizedTitle,
      type,
      priority,
      difficulty,
      assignedRoom,
    });
    setTitle("");
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div>
        <label className={labelClassName} htmlFor="mission-title">
          Task title
        </label>
        <input
          id="mission-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Generate market signal packet"
          className={`mt-1 ${inputClassName}`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className={labelClassName} htmlFor="mission-type">
            Task type
          </label>
          <select
            id="mission-type"
            value={type}
            onChange={(event) => setType(event.target.value as TaskType)}
            className={`mt-1 ${inputClassName}`}
          >
            {TASK_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClassName} htmlFor="mission-priority">
            Priority
          </label>
          <select
            id="mission-priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            className={`mt-1 ${inputClassName}`}
          >
            {TASK_PRIORITIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClassName} htmlFor="mission-room">
            Assigned room
          </label>
          <select
            id="mission-room"
            value={assignedRoom}
            onChange={(event) => setAssignedRoom(event.target.value as AssignedRoom)}
            className={`mt-1 ${inputClassName}`}
          >
            {ASSIGNED_ROOMS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClassName} htmlFor="mission-difficulty">
            Difficulty
          </label>
          <select
            id="mission-difficulty"
            value={difficulty}
            onChange={(event) =>
              setDifficulty(event.target.value as TaskDifficulty)
            }
            className={`mt-1 ${inputClassName}`}
          >
            {TASK_DIFFICULTIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded border border-command-cyan/40 bg-command-cyan/10 px-4 py-2 text-sm font-semibold text-command-cyan transition duration-200 hover:border-command-cyan hover:bg-command-cyan/20 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!title.trim()}
        >
          Queue Mission Task
        </button>
      </div>
    </form>
  );
}
