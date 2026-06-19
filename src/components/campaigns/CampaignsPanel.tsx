import type {
  Campaign,
  CampaignCreateInput,
  CampaignPreset,
  CampaignStatus,
  LogEntry,
  MissionTemplate,
  Task,
  TaskCreateInput,
} from "../../types";
import { CampaignCreator } from "./CampaignCreator";
import { CampaignDetail } from "./CampaignDetail";
import { CampaignList } from "./CampaignList";

interface CampaignsPanelProps {
  campaigns: Campaign[];
  logs: LogEntry[];
  selectedCampaignId: string | null;
  tasks: Task[];
  onAddCustomMission: (campaignId: string, input: TaskCreateInput) => void;
  onAddTemplateMission: (campaignId: string, template: MissionTemplate) => void;
  onArchiveCampaign: (campaignId: string) => void;
  onCreateCampaign: (input: CampaignCreateInput) => void;
  onCreateCampaignFromPreset: (preset: CampaignPreset) => void;
  onDeleteCampaign: (campaignId: string) => void;
  onDeployMission: (campaignId: string, missionId: string) => void;
  onGenerateReport: (campaignId: string) => void;
  onSelectCampaign: (campaignId: string) => void;
  onStatusChange: (campaignId: string, status: CampaignStatus) => void;
  onUpdateNotes: (campaignId: string, notes: string) => void;
}

export function CampaignsPanel({
  campaigns,
  logs,
  selectedCampaignId,
  tasks,
  onAddCustomMission,
  onAddTemplateMission,
  onArchiveCampaign,
  onCreateCampaign,
  onCreateCampaignFromPreset,
  onDeleteCampaign,
  onDeployMission,
  onGenerateReport,
  onSelectCampaign,
  onStatusChange,
  onUpdateNotes,
}: CampaignsPanelProps) {
  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === selectedCampaignId) ??
    campaigns[0] ??
    null;

  return (
    <section className="grid gap-5">
      <section className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
        <div className="text-xs font-semibold uppercase text-command-cyan">
          MISSION CONTROL // CAMPAIGN SYSTEM
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Campaigns
        </h1>
        <p className="mt-1 max-w-4xl text-sm text-slate-400">
          Create named local operation plans, deploy simulated missions, track
          objective gates, and generate saved reports.
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[23rem_1fr]">
        <div className="grid gap-5 self-start">
          <CampaignCreator
            onCreate={onCreateCampaign}
            onCreateFromPreset={onCreateCampaignFromPreset}
          />
          <CampaignList
            campaigns={campaigns}
            selectedCampaignId={selectedCampaign?.id ?? selectedCampaignId}
            onSelect={onSelectCampaign}
          />
        </div>

        <CampaignDetail
          campaign={selectedCampaign}
          logs={logs}
          tasks={tasks}
          onAddCustomMission={onAddCustomMission}
          onAddTemplateMission={onAddTemplateMission}
          onArchiveCampaign={onArchiveCampaign}
          onDeleteCampaign={onDeleteCampaign}
          onDeployMission={onDeployMission}
          onGenerateReport={onGenerateReport}
          onStatusChange={onStatusChange}
          onUpdateNotes={onUpdateNotes}
        />
      </section>
    </section>
  );
}
