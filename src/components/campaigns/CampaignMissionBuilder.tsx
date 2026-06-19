import { useState, type FormEvent } from "react";
import { campaignCustomMissionDefaults } from "../../data/campaignPresets";
import { missionTemplates } from "../../data/missionTemplates";
import {
  ASSIGNED_ROOMS,
  TASK_DIFFICULTIES,
  TASK_PRIORITIES,
  TASK_TYPES,
} from "../../lib/simulation";
import type {
  AssignedRoom,
  CampaignMission,
  CampaignMissionStatus,
  MissionTemplate,
  Task,
  TaskCreateInput,
  TaskDifficulty,
  TaskPriority,
  TaskType,
} from "../../types";
import { PriorityBadge } from "../PriorityBadge";

interface CampaignMissionBuilderProps {
  isReadOnly: boolean;
  missions: CampaignMission[];
  tasks: Task[];
  onAddCustomMission: (input: TaskCreateInput) => void;
  onAddTemplateMission: (template: MissionTemplate) => void;
  onDeployMission: (missionId: string) => void;
}

const inputClassName =
  "w-full rounded border border-command-line bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-600 focus:border-command-cyan focus:shadow-neon-blue";

const labelClassName = "text-xs font-semibold uppercase text-slate-500";

const linkedTaskSummary = (mission: CampaignMission, tasks: Task[]) =>
  tasks.filter((task) => mission.linkedTaskIds.includes(task.id));

type MissionFilter = "ALL" | "PLANNED" | "ACTIVE" | "COMPLETED" | "PROBLEM";

const missionStatusClasses: Record<CampaignMissionStatus, string> = {
  PLANNED: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  DEPLOYED: "border-command-cyan/40 bg-command-cyan/10 text-command-cyan",
  IN_PROGRESS: "border-command-cyan/40 bg-command-cyan/10 text-command-cyan",
  REVIEWING: "border-command-violet/40 bg-command-violet/10 text-command-violet",
  ACCEPTED: "border-command-green/40 bg-command-green/10 text-command-green",
  RETRY_REQUIRED: "border-command-amber/40 bg-command-amber/10 text-command-amber",
  PENALTY_APPLIED: "border-command-red/40 bg-command-red/10 text-command-red",
  QUARANTINED: "border-command-violet/40 bg-command-violet/10 text-command-violet",
  FAILED: "border-command-red/40 bg-command-red/10 text-command-red",
  CANCELLED: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

const filterMissions = (
  missions: CampaignMission[],
  filter: MissionFilter,
) => {
  if (filter === "PLANNED") {
    return missions.filter((mission) => mission.status === "PLANNED");
  }

  if (filter === "ACTIVE") {
    return missions.filter((mission) =>
      ["DEPLOYED", "IN_PROGRESS", "REVIEWING", "RETRY_REQUIRED"].includes(
        mission.status,
      ),
    );
  }

  if (filter === "COMPLETED") {
    return missions.filter((mission) => mission.status === "ACCEPTED");
  }

  if (filter === "PROBLEM") {
    return missions.filter((mission) =>
      ["PENALTY_APPLIED", "QUARANTINED", "FAILED", "CANCELLED"].includes(
        mission.status,
      ),
    );
  }

  return missions;
};

export function CampaignMissionBuilder({
  isReadOnly,
  missions,
  tasks,
  onAddCustomMission,
  onAddTemplateMission,
  onDeployMission,
}: CampaignMissionBuilderProps) {
  const [customMission, setCustomMission] = useState<TaskCreateInput>(
    campaignCustomMissionDefaults,
  );
  const [filter, setFilter] = useState<MissionFilter>("ALL");

  const updateCustomMission = <Key extends keyof TaskCreateInput>(
    key: Key,
    value: TaskCreateInput[Key],
  ) => {
    setCustomMission((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customMission.title.trim() || isReadOnly) {
      return;
    }

    onAddCustomMission({
      ...customMission,
      title: customMission.title.trim(),
    });
    setCustomMission(campaignCustomMissionDefaults);
  };

  return (
    <section className="rounded border border-command-line bg-black/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Mission Builder
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Add local mission packets and deploy them into the task pipeline.
          </p>
        </div>
        <div className="rounded border border-command-line bg-black/25 px-2 py-1 font-mono text-xs text-slate-400">
          {missions.length} MISSIONS
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded border border-command-line bg-command-panel/60 p-3">
          <h4 className="text-xs font-semibold uppercase text-command-violet">
            Template Library
          </h4>
          <div className="mt-3 grid gap-2">
            {missionTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                disabled={isReadOnly}
                onClick={() => onAddTemplateMission(template)}
                className="rounded border border-command-line bg-black/25 p-3 text-left transition duration-200 hover:border-command-cyan/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">
                    {template.name}
                  </span>
                  <span className="rounded border border-command-line bg-black/30 px-2 py-1 font-mono text-[0.65rem] text-slate-400">
                    {template.task.type}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {template.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded border border-command-line bg-command-panel/60 p-3"
        >
          <h4 className="text-xs font-semibold uppercase text-command-cyan">
            Custom Mission
          </h4>
          <div className="mt-3 grid gap-3">
            <div>
              <label className={labelClassName} htmlFor="campaign-mission-title">
                Mission title
              </label>
              <input
                id="campaign-mission-title"
                value={customMission.title}
                disabled={isReadOnly}
                onChange={(event) =>
                  updateCustomMission("title", event.target.value)
                }
                className={`mt-1 ${inputClassName}`}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClassName} htmlFor="campaign-mission-type">
                  Type
                </label>
                <select
                  id="campaign-mission-type"
                  value={customMission.type}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    updateCustomMission("type", event.target.value as TaskType)
                  }
                  className={`mt-1 ${inputClassName}`}
                >
                  {TASK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className={labelClassName}
                  htmlFor="campaign-mission-priority"
                >
                  Priority
                </label>
                <select
                  id="campaign-mission-priority"
                  value={customMission.priority}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    updateCustomMission(
                      "priority",
                      event.target.value as TaskPriority,
                    )
                  }
                  className={`mt-1 ${inputClassName}`}
                >
                  {TASK_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className={labelClassName}
                  htmlFor="campaign-mission-difficulty"
                >
                  Difficulty
                </label>
                <select
                  id="campaign-mission-difficulty"
                  value={customMission.difficulty}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    updateCustomMission(
                      "difficulty",
                      event.target.value as TaskDifficulty,
                    )
                  }
                  className={`mt-1 ${inputClassName}`}
                >
                  {TASK_DIFFICULTIES.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClassName} htmlFor="campaign-mission-room">
                  Assigned room
                </label>
                <select
                  id="campaign-mission-room"
                  value={customMission.assignedRoom}
                  disabled={isReadOnly}
                  onChange={(event) =>
                    updateCustomMission(
                      "assignedRoom",
                      event.target.value as AssignedRoom,
                    )
                  }
                  className={`mt-1 ${inputClassName}`}
                >
                  {ASSIGNED_ROOMS.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isReadOnly || !customMission.title.trim()}
              className="rounded border border-command-cyan/40 bg-command-cyan/10 px-3 py-2 text-sm font-semibold text-command-cyan transition duration-200 hover:border-command-cyan hover:bg-command-cyan/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add Custom Mission
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ["ALL", "All missions"],
          ["PLANNED", "Planned"],
          ["ACTIVE", "Deployed/active"],
          ["COMPLETED", "Completed"],
          ["PROBLEM", "Failed/problem"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value as MissionFilter)}
            className={`rounded border px-2.5 py-1.5 text-xs font-semibold transition duration-200 ${
              filter === value
                ? "border-command-cyan bg-command-cyan/10 text-command-cyan"
                : "border-command-line bg-black/25 text-slate-400 hover:border-command-cyan/40 hover:text-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        {filterMissions(missions, filter).length === 0 ? (
          <div className="rounded border border-command-line bg-black/25 p-3 text-sm text-slate-400">
            No missions match this filter.
          </div>
        ) : (
          filterMissions(missions, filter).map((mission) => {
            const linkedTasks = linkedTaskSummary(mission, tasks);
            const canDeploy = !isReadOnly && mission.linkedTaskIds.length === 0;

            return (
              <article
                key={mission.id}
                className="rounded border border-command-line bg-command-panel/60 p-3"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded border px-2 py-1 font-mono text-[0.68rem] font-semibold ${missionStatusClasses[mission.status]}`}
                      >
                        {mission.status}
                      </span>
                      <PriorityBadge priority={mission.priority} />
                      <span className="rounded border border-command-line bg-black/20 px-2 py-1 font-mono text-[0.68rem] text-slate-400">
                        {mission.difficulty}
                      </span>
                    </div>
                    <h4 className="mt-2 text-sm font-semibold text-slate-100">
                      {mission.title}
                    </h4>
                    <div className="mt-2 grid gap-2 font-mono text-xs text-slate-400 sm:grid-cols-2 xl:grid-cols-4">
                      <span>TYPE: {mission.type}</span>
                      <span>ROOM: {mission.assignedRoom}</span>
                      <span>LINKED: {mission.linkedTaskIds.length}</span>
                      <span>
                        SCORE:{" "}
                        {linkedTasks[0]?.qualityScore?.toFixed(2) ?? "PENDING"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 font-mono text-[0.65rem] text-slate-500">
                      <span>CREATED: {new Date(mission.createdAt).toLocaleTimeString()}</span>
                      <span>DEPLOYED: {mission.deployedAt ? new Date(mission.deployedAt).toLocaleTimeString() : "PENDING"}</span>
                      <span>COMPLETED: {mission.completedAt ? new Date(mission.completedAt).toLocaleTimeString() : "PENDING"}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canDeploy}
                    onClick={() => onDeployMission(mission.id)}
                    className="rounded border border-command-green/40 bg-command-green/10 px-3 py-2 text-sm font-semibold text-command-green transition duration-200 hover:border-command-green hover:bg-command-green/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Deploy Mission
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
