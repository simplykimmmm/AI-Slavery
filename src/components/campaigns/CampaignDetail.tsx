import {
  campaignProgress,
  getCampaignRiskLabel,
  getCampaignStatusBadgeStyle,
  getCampaignTypeLabel,
} from "../../lib/campaigns";
import type {
  Campaign,
  CampaignStatus,
  LogEntry,
  MissionTemplate,
  Task,
  TaskCreateInput,
} from "../../types";
import { TaskStatusBadge } from "../TaskStatusBadge";
import { CampaignMissionBuilder } from "./CampaignMissionBuilder";
import { CampaignNotes } from "./CampaignNotes";
import { CampaignObjectives } from "./CampaignObjectives";
import { CampaignReports } from "./CampaignReports";

interface CampaignDetailProps {
  campaign: Campaign | null;
  logs: LogEntry[];
  tasks: Task[];
  onAddCustomMission: (campaignId: string, input: TaskCreateInput) => void;
  onAddTemplateMission: (campaignId: string, template: MissionTemplate) => void;
  onArchiveCampaign: (campaignId: string) => void;
  onDeleteCampaign: (campaignId: string) => void;
  onDeployMission: (campaignId: string, missionId: string) => void;
  onGenerateReport: (campaignId: string) => void;
  onStatusChange: (campaignId: string, status: CampaignStatus) => void;
  onUpdateNotes: (campaignId: string, notes: string) => void;
}

const actionClassName =
  "rounded border border-command-line bg-black/20 px-3 py-2 text-sm font-semibold text-slate-300 transition duration-200 hover:border-command-cyan/50 hover:text-command-cyan disabled:cursor-not-allowed disabled:opacity-40";

const dangerActionClassName =
  "rounded border border-command-red/40 bg-command-red/10 px-3 py-2 text-sm font-semibold text-command-red transition duration-200 hover:border-command-red hover:bg-command-red/20";

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString() : "PENDING";

const campaignLinkedTasks = (campaign: Campaign, tasks: Task[]) =>
  tasks.filter((task) => campaign.linkedTaskIds.includes(task.id));

export function CampaignDetail({
  campaign,
  logs,
  tasks,
  onAddCustomMission,
  onAddTemplateMission,
  onArchiveCampaign,
  onDeleteCampaign,
  onDeployMission,
  onGenerateReport,
  onStatusChange,
  onUpdateNotes,
}: CampaignDetailProps) {
  if (!campaign) {
    return (
      <section className="rounded-lg border border-command-line bg-command-panel/80 p-6 shadow-panel backdrop-blur">
        <h2 className="text-sm font-semibold uppercase text-slate-100">
          Campaign Detail
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Select or create a campaign to open its operation plan.
        </p>
      </section>
    );
  }

  const progress = campaignProgress(campaign);
  const isReadOnly = campaign.status === "ARCHIVED";
  const linkedTasks = campaignLinkedTasks(campaign, tasks);
  const plannedMissionCount = campaign.missions.filter(
    (mission) => mission.status === "PLANNED",
  ).length;
  const deployedMissionCount = campaign.missions.filter(
    (mission) => mission.linkedTaskIds.length > 0,
  ).length;
  const eventHighlights = logs
    .filter(
      (log) =>
        log.message.includes(campaign.name) ||
        campaign.missions.some((mission) => log.message.includes(mission.title)),
    )
    .slice(0, 6);
  const canGenerateReport =
    campaign.status === "COMPLETED" || campaign.status === "FAILED";

  return (
    <section className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded border px-2 py-1 font-mono text-[0.68rem] font-semibold ${getCampaignStatusBadgeStyle(campaign.status)}`}
            >
              {campaign.status}
            </span>
            <span className="rounded border border-command-cyan/30 bg-command-cyan/10 px-2 py-1 font-mono text-[0.68rem] text-command-cyan">
              {getCampaignTypeLabel(campaign.type)}
            </span>
            <span className="rounded border border-command-violet/30 bg-command-violet/10 px-2 py-1 font-mono text-[0.68rem] text-command-violet">
              {campaign.doctrine}
            </span>
            <span className="rounded border border-command-amber/30 bg-command-amber/10 px-2 py-1 font-mono text-[0.68rem] text-command-amber">
              {getCampaignRiskLabel(campaign.riskLevel)}
            </span>
            <span className="rounded border border-command-line bg-black/25 px-2 py-1 font-mono text-[0.68rem] text-slate-400">
              {progress}% COMPLETE
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-white">
            {campaign.name}
          </h2>
          <p className="mt-2 max-w-4xl text-sm text-slate-400">
            {campaign.description || "No campaign description provided."}
          </p>
          <p className="mt-2 max-w-4xl text-sm text-slate-300">
            {campaign.briefingText}
          </p>
          <div className="mt-3 grid gap-2 font-mono text-xs text-slate-500 sm:grid-cols-3 xl:grid-cols-5">
            <span>CREATED: {formatDate(campaign.createdAt)}</span>
            <span>STARTED: {formatDate(campaign.startedAt)}</span>
            <span>COMPLETED: {formatDate(campaign.completedAt)}</span>
            <span>FOCUS: {campaign.recommendedAgentFocus}</span>
            <span>CYCLES: {campaign.estimatedDurationCycles}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          {campaign.status === "DRAFT" && (
            <button
              type="button"
              onClick={() => onStatusChange(campaign.id, "ACTIVE")}
              className={actionClassName}
            >
              Start Campaign
            </button>
          )}
          {campaign.status === "ACTIVE" && (
            <>
              <button
                type="button"
                onClick={() => onStatusChange(campaign.id, "PAUSED")}
                className={actionClassName}
              >
                Pause Campaign
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(campaign.id, "COMPLETED")}
                className={actionClassName}
              >
                Complete Manually
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(campaign.id, "FAILED")}
                className={actionClassName}
              >
                Fail Manually
              </button>
              <button
                type="button"
                onClick={() => onArchiveCampaign(campaign.id)}
                className={actionClassName}
              >
                Archive Campaign
              </button>
            </>
          )}
          {campaign.status === "PAUSED" && (
            <button
              type="button"
              onClick={() => onStatusChange(campaign.id, "ACTIVE")}
              className={actionClassName}
            >
              Resume Campaign
            </button>
          )}
          {(campaign.status === "COMPLETED" ||
            campaign.status === "FAILED") && (
            <>
              <button
                type="button"
                onClick={() => onGenerateReport(campaign.id)}
                className={actionClassName}
              >
                Generate Report
              </button>
              <button
                type="button"
                onClick={() => onArchiveCampaign(campaign.id)}
                className={actionClassName}
              >
                Archive Campaign
              </button>
            </>
          )}
          {campaign.status === "ARCHIVED" && (
            <button
              type="button"
              onClick={() => onDeleteCampaign(campaign.id)}
              className={dangerActionClassName}
            >
              Delete Campaign
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 h-2 rounded bg-black/50">
        <div
          className="h-full rounded bg-command-cyan transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5 grid gap-4">
        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded border border-command-line bg-black/20 p-3">
            <div className="text-xs uppercase text-slate-500">
              Planned missions
            </div>
            <div className="mt-1 font-mono text-2xl text-command-cyan">
              {plannedMissionCount}
            </div>
          </div>
          <div className="rounded border border-command-line bg-black/20 p-3">
            <div className="text-xs uppercase text-slate-500">
              Deployed missions
            </div>
            <div className="mt-1 font-mono text-2xl text-command-green">
              {deployedMissionCount}
            </div>
          </div>
          <div className="rounded border border-command-line bg-black/20 p-3">
            <div className="text-xs uppercase text-slate-500">
              Linked tasks
            </div>
            <div className="mt-1 font-mono text-2xl text-command-violet">
              {linkedTasks.length}
            </div>
          </div>
        </section>

        {(campaign.status === "COMPLETED" || campaign.status === "FAILED") && (
          <section
            className={`rounded border p-3 text-sm ${
              campaign.status === "COMPLETED"
                ? "border-command-green/30 bg-command-green/10 text-command-green"
                : "border-command-red/30 bg-command-red/10 text-command-red"
            }`}
          >
            {campaign.status === "COMPLETED"
              ? campaign.successSummary
              : campaign.failureSummary}
          </section>
        )}

        <CampaignObjectives objectives={campaign.objectives} />

        <section className="rounded border border-command-line bg-black/20 p-3">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Linked Tasks
          </h3>
          <div className="mt-3 grid gap-2">
            {linkedTasks.length === 0 ? (
              <div className="rounded border border-command-line bg-black/25 p-3 text-sm text-slate-400">
                Deploy a campaign mission to create linked task records.
              </div>
            ) : (
              linkedTasks.map((task) => (
                <div
                  key={task.id}
                  className="grid gap-2 rounded border border-command-line bg-command-panel/60 p-3 text-sm md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-100">
                      {task.title}
                    </div>
                    <div className="mt-1 font-mono text-xs text-slate-500">
                      {task.type} // {task.assignedRoom} // SCORE{" "}
                      {task.qualityScore?.toFixed(2) ?? "PENDING"}
                    </div>
                  </div>
                  <TaskStatusBadge status={task.status} />
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded border border-command-line bg-black/20 p-3">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Event Highlights
          </h3>
          <div className="mt-3 grid gap-2">
            {eventHighlights.length === 0 ? (
              <div className="rounded border border-command-line bg-black/25 p-3 text-sm text-slate-400">
                No campaign-specific events captured yet.
              </div>
            ) : (
              eventHighlights.map((log) => (
                <div
                  key={log.id}
                  className="rounded border border-command-line bg-black/30 p-3 font-mono text-xs text-slate-300"
                >
                  <span className="text-command-cyan">[{log.timestamp}]</span>{" "}
                  <span className="text-slate-100">{log.source}:</span>{" "}
                  {log.message}
                </div>
              ))
            )}
          </div>
        </section>

        <CampaignMissionBuilder
          isReadOnly={isReadOnly}
          missions={campaign.missions}
          tasks={tasks}
          onAddCustomMission={(input) => onAddCustomMission(campaign.id, input)}
          onAddTemplateMission={(template) =>
            onAddTemplateMission(campaign.id, template)
          }
          onDeployMission={(missionId) => onDeployMission(campaign.id, missionId)}
        />

        <CampaignReports
          campaign={campaign}
          canGenerate={canGenerateReport}
          onGenerateReport={() => onGenerateReport(campaign.id)}
        />

        <CampaignNotes
          campaign={campaign}
          isReadOnly={isReadOnly}
          onChange={(notes) => onUpdateNotes(campaign.id, notes)}
        />
      </div>
    </section>
  );
}
