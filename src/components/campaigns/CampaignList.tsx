import {
  campaignProgress,
  getCampaignStatusBadgeStyle,
  getCampaignTypeLabel,
} from "../../lib/campaigns";
import type { Campaign } from "../../types";

interface CampaignListProps {
  campaigns: Campaign[];
  selectedCampaignId: string | null;
  onSelect: (campaignId: string) => void;
}

export function CampaignList({
  campaigns,
  selectedCampaignId,
  onSelect,
}: CampaignListProps) {
  return (
    <section className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase text-slate-100">
            Campaign List
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Local operation plans and campaign state.
          </p>
        </div>
        <div className="rounded border border-command-cyan/30 bg-command-cyan/10 px-2 py-1 font-mono text-xs text-command-cyan">
          {campaigns.length} TOTAL
        </div>
      </div>

      <div className="grid max-h-[480px] gap-3 overflow-y-auto pr-1 terminal-scroll">
        {campaigns.length === 0 ? (
          <div className="rounded border border-command-line bg-black/25 p-4 text-sm text-slate-400">
            No campaigns yet. Create an operation plan to begin.
          </div>
        ) : (
          campaigns.map((campaign) => {
            const progress = campaignProgress(campaign);
            const isSelected = campaign.id === selectedCampaignId;

            return (
              <button
                key={campaign.id}
                type="button"
                onClick={() => onSelect(campaign.id)}
                className={`rounded border p-3 text-left transition duration-200 ${
                  isSelected
                    ? "border-command-cyan bg-command-cyan/10"
                    : "border-command-line bg-black/25 hover:border-command-cyan/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-100">
                      {campaign.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                      {campaign.description || "No description provided."}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded border px-2 py-1 font-mono text-[0.68rem] font-semibold ${getCampaignStatusBadgeStyle(campaign.status)}`}
                  >
                    {campaign.status}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded border border-command-line bg-black/25 px-2 py-1 font-mono text-[0.65rem] text-slate-400">
                    {getCampaignTypeLabel(campaign.type)}
                  </span>
                  <span className="rounded border border-command-line bg-black/25 px-2 py-1 font-mono text-[0.65rem] text-slate-400">
                    {campaign.riskLevel}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Progress</span>
                    <span className="font-mono text-slate-300">{progress}%</span>
                  </div>
                  <div className="h-2 rounded bg-black/50">
                    <div
                      className="h-full rounded bg-command-cyan transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
