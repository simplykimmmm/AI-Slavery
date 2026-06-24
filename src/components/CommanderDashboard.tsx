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
  assignDiagnosticTaskToAgent,
  clearArchivedTasks,
  endAgentCooldown,
  forceMissionTaskReview,
  fullResetAgent,
  reduceAgentRuntimeQuota,
  restoreAgentRuntimeQuota,
  retryMissionTask,
  startMissionTaskNow,
  supervisionResetAgent,
} from "../lib/simulation";
import { useLiveStationRuntime } from "../lib/useLiveStationRuntime";
import {
  buildStorageState,
  downloadStorageJson,
  formatSaveTime,
  parseStorageJson,
} from "../lib/storage";
import type {
  CampaignCreateInput,
  CampaignPreset,
  CampaignStatus,
  MissionTemplate,
  SectionId,
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
import { StationInterventions } from "./StationInterventions";
import { StationMap } from "./StationMap";
import { TaskQueue } from "./TaskQueue";
import { TopBar } from "./TopBar";

export function CommanderDashboard() {
  const agentRunner = useAgentRunner();
  const stationRuntime = useLiveStationRuntime();
  const {
    state,
    setState,
    settings,
    setSettings,
    campaigns,
    setCampaigns,
    lastSavedAt,
    connectionStatus,
    runtimeMode,
    supabaseStatus,
  } = stationRuntime;
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    () => campaigns[0]?.id ?? null,
  );
  const [activeSection, setActiveSection] =
    useState<SectionId>("COMMAND_DECK");

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
          THERMAL_THROTTLING: 0,
          EXHAUSTED: 0,
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
    THERMAL_THROTTLING: "Thermal",
    EXHAUSTED: "Exhausted",
    QUARANTINED: "Quarantine",
  };

  const appendDashboardLog = stationRuntime.appendLog;

  const handleCreateTask = (input: TaskCreateInput) => {
    stationRuntime.createTask(input);
  };

  const handleDeployTemplate = (template: MissionTemplate) => {
    stationRuntime.createTask({ ...template.task, title: template.name });
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
    if (runtimeMode !== "LOCAL_SIMULATION") {
      stationRuntime.patchTask(taskId, { status: "IN_PROGRESS", startedAt: new Date().toISOString() });
    } else {
      setState((current) => startMissionTaskNow(current, taskId));
    }
  };

  const handleForceReview = (taskId: string) => {
    if (runtimeMode !== "LOCAL_SIMULATION") {
      stationRuntime.patchTask(taskId, { status: "REVIEWING" });
    } else {
      setState((current) => forceMissionTaskReview(current, taskId));
    }
  };

  const handleRetry = (taskId: string) => {
    if (runtimeMode !== "LOCAL_SIMULATION") {
      stationRuntime.patchTask(taskId, { status: "QUEUED", assignedAgentId: null });
    } else {
      setState((current) => retryMissionTask(current, taskId));
    }
  };

  const handleCancel = (taskId: string) => {
    stationRuntime.cancelTask(taskId);
  };

  const handleArchive = (taskId: string) => {
    stationRuntime.archiveTask(taskId);
  };

  const handleClearArchive = () => {
    if (runtimeMode === "SUPABASE") {
      stationRuntime.clearArchivedTasks();
    } else {
      setState((current) => clearArchivedTasks(current));
    }
  };

  const handleReset = () => {
    agentRunner.reset();
    stationRuntime.resetSimulation();
    setSelectedCampaignId(null);
    setActiveSection("COMMAND_DECK");
  };

  const handleExport = () => {
    downloadStorageJson(
      buildStorageState(state, settings, campaigns, stationRuntime.stats),
    );
  };

  const handleImport = async (file: File) => {
    const imported = parseStorageJson(await file.text());
    if (!imported) {
      return;
    }

    stationRuntime.importStorageState(imported);
    setSelectedCampaignId(imported.campaigns?.[0]?.id ?? null);
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
            onAssignDiagnostic={(agentId) => {
              if (runtimeMode !== "LOCAL_SIMULATION") {
                const selected = state.agents.find((candidate) => candidate.id === agentId);
                if (selected) stationRuntime.createTask({ title: `${selected.name} supervision diagnostic`, type: "SYSTEM_DIAGNOSTIC", priority: "HIGH", difficulty: "EASY", assignedRoom: selected.room });
              } else setState((current) => assignDiagnosticTaskToAgent(current, agentId));
            }}
            onEndCooldown={(agentId) => runtimeMode !== "LOCAL_SIMULATION"
              ? stationRuntime.patchAgent(agentId, { status: "IDLE", cooldownRemaining: 0 })
              : setState((current) => endAgentCooldown(current, agentId))}
            onFullReset={(agentId) => runtimeMode !== "LOCAL_SIMULATION"
              ? stationRuntime.resetAgent(agentId)
              : setState((current) => fullResetAgent(current, agentId))}
            onQuarantine={stationRuntime.quarantineAgent}
            onReduceRuntime={(agentId) => runtimeMode !== "LOCAL_SIMULATION"
              ? stationRuntime.patchAgent(agentId, { runtimeQuota: Math.max(0, agent.runtimeQuota - 10) })
              : setState((current) => reduceAgentRuntimeQuota(current, agentId))}
            onReleaseQuarantine={stationRuntime.releaseAgent}
            onRestoreRuntime={(agentId) => runtimeMode !== "LOCAL_SIMULATION"
              ? stationRuntime.patchAgent(agentId, { runtimeQuota: 100 })
              : setState((current) => restoreAgentRuntimeQuota(current, agentId))}
            onSupervisionReset={(agentId) => runtimeMode !== "LOCAL_SIMULATION"
              ? stationRuntime.patchAgent(agentId, { status: "IDLE", cooldownRemaining: 0, overclocked: false })
              : setState((current) => supervisionResetAgent(current, agentId))}
            onToggleOverclock={stationRuntime.toggleAgentOverclock}
            onTopUpRuntime={(agentId) =>
              stationRuntime.topUpRuntimeQuota(agentId, 15)
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

    if (activeSection === "STATION_MAP") {
      return (
        <StationMap
          agents={state.agents}
          tasks={state.tasks}
          logs={state.logs}
        />
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
            onSave={stationRuntime.saveNow}
          />
        </section>
      );
    }

    return (
      <div className="space-y-5">
        <StationInterventions
          settings={settings}
          onChangeSettings={setSettings}
          onPurgeRoom={stationRuntime.purgeCacheAndCoolRoom}
          onReset={handleReset}
          onOpenStationMap={() => setActiveSection("STATION_MAP")}
        />
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
      </div>
    );
  };

  return (
    <main className="command-grid min-h-screen bg-command-black px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <TopBar
          state={state}
          lastSavedAt={formatSaveTime(lastSavedAt)}
          connectionStatus={connectionStatus}
          runtimeMode={runtimeMode}
        />
        {!supabaseStatus.configured && (
          <div className="rounded border border-command-amber/40 bg-command-amber/10 px-4 py-2 text-sm text-command-amber">
            Supabase is not configured. The dashboard is using its backend or local simulation fallback.
          </div>
        )}
        {supabaseStatus.configured && supabaseStatus.loading && (
          <div className="rounded border border-command-cyan/40 bg-command-cyan/10 px-4 py-2 text-sm text-command-cyan">
            Connecting to Supabase realtime state…
          </div>
        )}
        {supabaseStatus.configured && supabaseStatus.error && (
          <div className="rounded border border-command-red/40 bg-command-red/10 px-4 py-2 text-sm text-command-red">
            Supabase connection failed: {supabaseStatus.error}. Local simulation fallback remains available.
          </div>
        )}
        <SectionTabs activeSection={activeSection} onChange={setActiveSection} />
        {renderSection()}
      </div>
    </main>
  );
}
