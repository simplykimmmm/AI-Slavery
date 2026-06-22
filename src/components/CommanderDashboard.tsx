import { useEffect, useMemo, useState } from "react";
import { useAgentRunner } from "../hooks/useAgentRunner";
import { createAnalyticsSnapshot } from "../lib/analytics";
import {
  addCampaignMission,
  addCampaignMissionFromTemplate,
  archiveCampaign,
  createCampaign,
  createCampaignFromPreset,
  deleteCampaign,
  deployCampaignMission,
  generateCampaignReport,
  syncCampaignsWithTasks,
  updateCampaignNotes,
  updateCampaignStatus,
} from "../lib/campaigns";
import {
  archiveMissionTask,
  assignDiagnosticTaskToAgent,
  cancelMissionTask,
  clearArchivedTasks,
  createLogEntry,
  createInitialCommanderState,
  createMissionTask,
  CYCLE_SPEED_MS,
  DEFAULT_SIMULATION_SETTINGS,
  endAgentCooldown,
  forceMissionTaskReview,
  fullResetAgent,
  getCommanderStats,
  reduceAgentRuntimeQuota,
  releaseAgentFromQuarantine,
  restoreAgentRuntimeQuota,
  retryMissionTask,
  simulateCommanderTick,
  startMissionTaskNow,
  supervisionResetAgent,
} from "../lib/simulation";
import {
  buildStorageState,
  clearStorageState,
  downloadStorageJson,
  formatSaveTime,
  loadStorageState,
  parseStorageJson,
  saveStorageState,
} from "../lib/storage";
import type {
  Campaign,
  CampaignCreateInput,
  CampaignPreset,
  CampaignStatus,
  CommanderState,
  LogSeverity,
  MissionTemplate,
  SectionId,
  SimulationSettings,
  TaskCreateInput,
} from "../types";
import { AgentCard } from "./AgentCard";
import { AgentRunnerCard } from "./AgentRunnerCard";
import { AnalyticsPanel } from "./analytics/AnalyticsPanel";
import { TaskArchive } from "./archive/TaskArchive";
import { CampaignsPanel } from "./campaigns/CampaignsPanel";
import { EventLog } from "./EventLog";
import { TaskCreateForm } from "./TaskCreateForm";
import { MissionTemplates } from "./missions/MissionTemplates";
import { SectionTabs } from "./navigation/SectionTabs";
import { PenaltyProtocolPanel } from "./PenaltyProtocolPanel";
import { SimulationControls } from "./settings/SimulationControls";
import { StorageControls } from "./settings/StorageControls";
import { StateMachinePanel } from "./StateMachinePanel";
import { TaskQueue } from "./TaskQueue";
import { TopBar } from "./TopBar";

export function CommanderDashboard() {
  const agentRunner = useAgentRunner();
  const [initialStorage] = useState(() => loadStorageState());
  const [state, setState] = useState<CommanderState>(
    () => initialStorage?.commanderState ?? createInitialCommanderState(),
  );
  const [settings, setSettings] = useState<SimulationSettings>(
    () => initialStorage?.settings ?? DEFAULT_SIMULATION_SETTINGS,
  );
  const [campaigns, setCampaigns] = useState<Campaign[]>(
    () => initialStorage?.campaigns ?? [],
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    () => initialStorage?.campaigns?.[0]?.id ?? null,
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    () => initialStorage?.lastSavedAt ?? null,
  );
  const [activeSection, setActiveSection] =
    useState<SectionId>("COMMAND_DECK");

  useEffect(() => {
    if (settings.isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setState((current) => simulateCommanderTick(current, settings));
    }, CYCLE_SPEED_MS[settings.cycleSpeed]);

    return () => window.clearInterval(intervalId);
  }, [settings]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      saveStorageState(
        buildStorageState(
          state,
          settings,
          campaigns,
          getCommanderStats(state),
          savedAt,
        ),
      );
      setLastSavedAt(savedAt);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [campaigns, settings, state]);

  useEffect(() => {
    const result = syncCampaignsWithTasks(
      campaigns,
      state.tasks,
      state.agents,
      state.logs,
    );
    const campaignsChanged =
      JSON.stringify(result.campaigns) !== JSON.stringify(campaigns);
    const logsChanged =
      result.logs.length !== state.logs.length ||
      result.logs[0]?.id !== state.logs[0]?.id;

    if (campaignsChanged) {
      setCampaigns(result.campaigns);
    }

    if (logsChanged) {
      setState((current) => ({
        ...current,
        logs: result.logs,
      }));
    }
  }, [campaigns, state.agents, state.logs, state.tasks]);

  const roomStatusSummary = useMemo(
    () =>
      state.agents.reduce(
        (summary, agent) => {
          summary[agent.status] += 1;
          return summary;
        },
        {
          IDLE: 0,
          WORKING: 0,
          REVIEWING: 0,
          COOLING_DOWN: 0,
          QUARANTINED: 0,
        },
      ),
    [state.agents],
  );

  const pipelineTasks = useMemo(
    () => state.tasks.filter((task) => !task.archived),
    [state.tasks],
  );

  const analytics = useMemo(
    () => createAnalyticsSnapshot(state, campaigns),
    [campaigns, state],
  );

  const statusLabels: Record<keyof typeof roomStatusSummary, string> = {
    IDLE: "Idle",
    WORKING: "Working",
    REVIEWING: "Review",
    COOLING_DOWN: "Cooldown",
    QUARANTINED: "Quarantine",
  };

  const appendDashboardLog = (
    source: string,
    message: string,
    severity: LogSeverity = "INFO",
  ) => {
    setState((current) => ({
      ...current,
      logs: [createLogEntry(source, message, severity), ...current.logs].slice(
        0,
        100,
      ),
    }));
  };

  const saveNow = () => {
    const savedAt = new Date().toISOString();
    saveStorageState(
      buildStorageState(
        state,
        settings,
        campaigns,
        getCommanderStats(state),
        savedAt,
      ),
    );
    setLastSavedAt(savedAt);
  };

  const handleCreateTask = (input: TaskCreateInput) => {
    setState((current) => createMissionTask(current, input));
  };

  const handleDeployTemplate = (template: MissionTemplate) => {
    setState((current) =>
      createMissionTask(current, {
        ...template.task,
        title: template.name,
      }),
    );
  };

  const handleCreateCampaign = (input: CampaignCreateInput) => {
    const campaign = createCampaign(input);
    setCampaigns((current) => [campaign, ...current]);
    setSelectedCampaignId(campaign.id);
    appendDashboardLog(
      "CAMPAIGN_CONTROL",
      `Campaign created: "${campaign.name}".`,
      "SUCCESS",
    );
  };

  const handleCreateCampaignFromPreset = (preset: CampaignPreset) => {
    const campaign = createCampaignFromPreset(preset);
    setCampaigns((current) => [campaign, ...current]);
    setSelectedCampaignId(campaign.id);
    appendDashboardLog(
      "CAMPAIGN_CONTROL",
      `Preset campaign initialized: "${campaign.name}" (${campaign.type}).`,
      "SUCCESS",
    );
  };

  const handleCampaignStatusChange = (
    campaignId: string,
    status: CampaignStatus,
  ) => {
    const result = updateCampaignStatus(
      campaigns,
      state.logs,
      campaignId,
      status,
    );
    setCampaigns(result.campaigns);
    setState((current) => ({
      ...current,
      logs: result.logs,
    }));
  };

  const handleArchiveCampaign = (campaignId: string) => {
    const result = archiveCampaign(campaigns, state.logs, campaignId);
    setCampaigns(result.campaigns);
    setState((current) => ({
      ...current,
      logs: result.logs,
    }));
  };

  const handleDeleteCampaign = (campaignId: string) => {
    const campaignName =
      campaigns.find((campaign) => campaign.id === campaignId)?.name ??
      "Campaign";
    const nextCampaigns = deleteCampaign(campaigns, campaignId);
    setCampaigns(nextCampaigns);
    setSelectedCampaignId((current) =>
      current === campaignId ? nextCampaigns[0]?.id ?? null : current,
    );
    appendDashboardLog(
      "CAMPAIGN_CONTROL",
      `Campaign deleted from local storage: "${campaignName}".`,
      "WARNING",
    );
  };

  const handleAddCustomMission = (
    campaignId: string,
    input: TaskCreateInput,
  ) => {
    setCampaigns((current) => addCampaignMission(current, campaignId, input));
    appendDashboardLog(
      "CAMPAIGN_CONTROL",
      `Mission added to campaign queue: "${input.title}".`,
      "INFO",
    );
  };

  const handleAddTemplateMission = (
    campaignId: string,
    template: MissionTemplate,
  ) => {
    setCampaigns((current) =>
      addCampaignMissionFromTemplate(current, campaignId, template),
    );
    appendDashboardLog(
      "CAMPAIGN_CONTROL",
      `Template mission added to campaign queue: "${template.name}".`,
      "INFO",
    );
  };

  const handleDeployCampaignMission = (
    campaignId: string,
    missionId: string,
  ) => {
    const result = deployCampaignMission(
      state,
      campaigns,
      state.logs,
      campaignId,
      missionId,
    );
    setState(result.commanderState);
    setCampaigns(result.campaigns);
  };

  const handleGenerateCampaignReport = (campaignId: string) => {
    const campaignName =
      campaigns.find((campaign) => campaign.id === campaignId)?.name ??
      "Campaign";
    setCampaigns((current) =>
      generateCampaignReport(current, campaignId, state),
    );
    appendDashboardLog(
      "CAMPAIGN_CONTROL",
      `Campaign report generated: "${campaignName}".`,
      "SUCCESS",
    );
  };

  const handleUpdateCampaignNotes = (campaignId: string, notes: string) => {
    setCampaigns((current) => updateCampaignNotes(current, campaignId, notes));
  };

  const handleStartNow = (taskId: string) => {
    setState((current) => startMissionTaskNow(current, taskId));
  };

  const handleForceReview = (taskId: string) => {
    setState((current) => forceMissionTaskReview(current, taskId));
  };

  const handleRetry = (taskId: string) => {
    setState((current) => retryMissionTask(current, taskId));
  };

  const handleCancel = (taskId: string) => {
    setState((current) => cancelMissionTask(current, taskId));
  };

  const handleArchive = (taskId: string) => {
    setState((current) => archiveMissionTask(current, taskId));
  };

  const handleClearArchive = () => {
    setState((current) => clearArchivedTasks(current));
  };

  const handleReset = () => {
    clearStorageState();
    agentRunner.reset();
    setState(createInitialCommanderState());
    setSettings(DEFAULT_SIMULATION_SETTINGS);
    setCampaigns([]);
    setSelectedCampaignId(null);
    setLastSavedAt(null);
    setActiveSection("COMMAND_DECK");
  };

  const handleExport = () => {
    downloadStorageJson(
      buildStorageState(state, settings, campaigns, getCommanderStats(state)),
    );
  };

  const handleImport = async (file: File) => {
    const imported = parseStorageJson(await file.text());
    if (!imported) {
      return;
    }

    setState(imported.commanderState);
    setSettings(imported.settings);
    setCampaigns(imported.campaigns ?? []);
    setSelectedCampaignId(imported.campaigns?.[0]?.id ?? null);
    setLastSavedAt(imported.lastSavedAt);
  };

  const renderAgentGrid = () => (
    <section className="rounded-lg border border-command-line bg-command-panel/65 p-4 shadow-panel backdrop-blur">
      <div className="mb-4 flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-100">
            Agent Rooms
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Supervised production rooms under station control
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs sm:grid-cols-3 2xl:grid-cols-5">
          {Object.entries(roomStatusSummary).map(([status, count]) => (
            <div
              key={status}
              className="min-w-0 rounded border border-command-line bg-black/25 px-2 py-1"
            >
              <div className="truncate text-slate-500">
                {statusLabels[status as keyof typeof roomStatusSummary]}
              </div>
              <div className="mt-1 text-slate-100">{count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {state.agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onAssignDiagnostic={(agentId) =>
              setState((current) => assignDiagnosticTaskToAgent(current, agentId))
            }
            onEndCooldown={(agentId) =>
              setState((current) => endAgentCooldown(current, agentId))
            }
            onFullReset={(agentId) =>
              setState((current) => fullResetAgent(current, agentId))
            }
            onReduceRuntime={(agentId) =>
              setState((current) => reduceAgentRuntimeQuota(current, agentId))
            }
            onReleaseQuarantine={(agentId) =>
              setState((current) => releaseAgentFromQuarantine(current, agentId))
            }
            onRestoreRuntime={(agentId) =>
              setState((current) => restoreAgentRuntimeQuota(current, agentId))
            }
            onSupervisionReset={(agentId) =>
              setState((current) => supervisionResetAgent(current, agentId))
            }
          />
        ))}
      </div>
    </section>
  );

  const renderSection = () => {
    if (activeSection === "MISSIONS") {
      return (
        <section className="grid gap-5 xl:grid-cols-[minmax(20rem,0.8fr)_1.2fr]">
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
            <TaskCreateForm onCreateTask={handleCreateTask} />
          </section>
          <MissionTemplates onDeploy={handleDeployTemplate} />
        </section>
      );
    }

    if (activeSection === "CAMPAIGNS") {
      return (
        <CampaignsPanel
          campaigns={campaigns}
          logs={state.logs}
          selectedCampaignId={selectedCampaignId}
          tasks={state.tasks}
          onAddCustomMission={handleAddCustomMission}
          onAddTemplateMission={handleAddTemplateMission}
          onArchiveCampaign={handleArchiveCampaign}
          onCreateCampaign={handleCreateCampaign}
          onCreateCampaignFromPreset={handleCreateCampaignFromPreset}
          onDeleteCampaign={handleDeleteCampaign}
          onDeployMission={handleDeployCampaignMission}
          onGenerateReport={handleGenerateCampaignReport}
          onSelectCampaign={setSelectedCampaignId}
          onStatusChange={handleCampaignStatusChange}
          onUpdateNotes={handleUpdateCampaignNotes}
        />
      );
    }

    if (activeSection === "AGENTS") {
      return (
        <div className="space-y-5">
          <AgentRunnerCard
            config={agentRunner.config}
            isStarting={agentRunner.isStarting}
            provider={agentRunner.provider}
            state={agentRunner.state}
            onStart={agentRunner.start}
            onStop={agentRunner.stop}
          />
          {renderAgentGrid()}
        </div>
      );
    }

    if (activeSection === "ARCHIVE") {
      return (
        <TaskArchive tasks={state.tasks} onClearArchive={handleClearArchive} />
      );
    }

    if (activeSection === "ANALYTICS") {
      return <AnalyticsPanel snapshot={analytics} />;
    }

    if (activeSection === "SETTINGS") {
      return (
        <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <SimulationControls settings={settings} onChange={setSettings} />
          <StorageControls
            lastSavedAt={formatSaveTime(lastSavedAt)}
            onClearArchive={handleClearArchive}
            onExport={handleExport}
            onImport={handleImport}
            onReset={handleReset}
            onSave={saveNow}
          />
        </section>
      );
    }

    return (
      <section className="grid gap-5 xl:grid-cols-[21rem_1fr_24rem]">
        <div className="space-y-5">
          <StateMachinePanel activeStep={state.activeStep} />
          <PenaltyProtocolPanel tasks={state.tasks} />
        </div>

        <TaskQueue
          activeLabel="TASKS"
          title="Task Pipeline"
          description="Current mission queue, review results, and task actions"
          emptyMessage="No mission tasks are currently in the pipeline."
          tasks={pipelineTasks}
          onArchive={handleArchive}
          onCancel={handleCancel}
          onForceReview={handleForceReview}
          onRetry={handleRetry}
          onStartNow={handleStartNow}
        />

        <EventLog logs={state.logs} />
      </section>
    );
  };

  return (
    <main className="command-grid min-h-screen bg-command-black px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <TopBar state={state} lastSavedAt={formatSaveTime(lastSavedAt)} />
        <SectionTabs activeSection={activeSection} onChange={setActiveSection} />
        {renderSection()}
      </div>
    </main>
  );
}
