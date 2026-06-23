import type { AnalyticsSnapshot } from "../../types";
import { StatCard } from "../StatCard";

interface AnalyticsPanelProps {
  snapshot: AnalyticsSnapshot;
}

const toneClassName: Record<string, string> = {
  green: "bg-command-green",
  amber: "bg-command-amber",
  red: "bg-command-red",
  violet: "bg-command-violet",
  cyan: "bg-command-cyan",
  slate: "bg-slate-500",
};

function MetricBar({
  label,
  value,
  tone = "cyan",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-slate-200">{value}%</span>
      </div>
      <div className="h-2 rounded bg-black/50">
        <div
          className={`h-full rounded transition-all duration-700 ${toneClassName[tone] ?? toneClassName.cyan}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function AnalyticsPanel({ snapshot }: AnalyticsPanelProps) {
  const distributionTotal =
    snapshot.acceptedCount +
    snapshot.retryCount +
    snapshot.penaltyCount +
    snapshot.quarantineCount +
    snapshot.failedCount +
    snapshot.cancelledCount;

  return (
    <section className="grid gap-5">
      <section className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase text-slate-100">
            Analytics
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Local operational telemetry from the simulated command deck.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total tasks" value={snapshot.totalTasksCreated} />
          <StatCard label="Accepted" value={snapshot.acceptedCount} tone="green" />
          <StatCard label="Retry" value={snapshot.retryCount} tone="amber" />
          <StatCard label="Penalty" value={snapshot.penaltyCount} tone="red" />
          <StatCard label="Quarantine" value={snapshot.quarantineCount} tone="violet" />
          <StatCard label="Failed" value={snapshot.failedCount} tone="red" />
          <StatCard label="Cancelled" value={snapshot.cancelledCount} tone="amber" />
          <StatCard label="Acceptance rate" value={`${snapshot.acceptanceRate}%`} tone="green" />
          <StatCard label="Avg score" value={snapshot.averageOutputScore.toFixed(2)} tone="cyan" />
          <StatCard label="Reliable agent" value={snapshot.mostReliableAgent} tone="violet" />
          <StatCard label="Campaigns" value={snapshot.totalCampaigns} tone="cyan" />
          <StatCard label="Active campaigns" value={snapshot.activeCampaigns} tone="violet" />
          <StatCard label="Completed campaigns" value={snapshot.completedCampaigns} tone="green" />
          <StatCard label="Failed campaigns" value={snapshot.failedCampaigns} tone="red" />
          <StatCard label="Campaign avg accept" value={`${snapshot.averageCampaignAcceptanceRate}%`} tone="amber" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Task Result Distribution
          </h3>
          <div className="mt-4 grid gap-3">
            {snapshot.resultDistribution.map((item) => (
              <MetricBar
                key={item.label}
                label={`${item.label} (${item.value})`}
                value={
                  distributionTotal === 0
                    ? 0
                    : Math.round((item.value / distributionTotal) * 100)
                }
                tone={item.tone}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Agent Trust Scores
          </h3>
          <div className="mt-4 grid gap-3">
            {snapshot.agentTrustScores.map((item) => (
              <MetricBar
                key={item.agentName}
                label={item.agentName}
                value={item.value}
                tone="violet"
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Runtime Quota Per Agent
          </h3>
          <div className="mt-4 grid gap-3">
            {snapshot.agentRuntimeQuotas.map((item) => (
              <MetricBar
                key={item.agentName}
                label={item.agentName}
                value={item.value}
                tone="cyan"
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Workload Per Agent
          </h3>
          <div className="mt-4 grid gap-3">
            {snapshot.agentWorkloads.map((item) => (
              <MetricBar
                key={item.agentName}
                label={item.agentName}
                value={item.value}
                tone="amber"
              />
            ))}
          </div>
          <div className="mt-4 rounded border border-command-line bg-black/25 p-3 text-sm text-slate-400">
            Most overloaded agent:{" "}
            <span className="font-semibold text-slate-100">
              {snapshot.mostOverloadedAgent}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Compute Heat Distribution
          </h3>
          <div className="mt-4 grid gap-3">
            {snapshot.agentHeatLevels.map((item) => (
              <MetricBar
                key={item.agentName}
                label={`${item.agentName} (${item.value}°C)`}
                value={item.value}
                tone={
                  item.value >= 90
                    ? "red"
                    : item.value >= 75
                      ? "amber"
                      : "cyan"
                }
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Efficiency Distribution
          </h3>
          <div className="mt-4 grid gap-3">
            {snapshot.agentEfficiencyLevels.map((item) => (
              <MetricBar
                key={item.agentName}
                label={item.agentName}
                value={item.value}
                tone={
                  item.value >= 90
                    ? "green"
                    : item.value >= 65
                      ? "amber"
                      : "red"
                }
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur xl:col-span-2">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Campaign Status Distribution
          </h3>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {snapshot.campaignStatusDistribution.map((item) => (
              <MetricBar
                key={item.label}
                label={`${item.label} (${item.value})`}
                value={
                  snapshot.totalCampaigns === 0
                    ? 0
                    : Math.round((item.value / snapshot.totalCampaigns) * 100)
                }
                tone={item.tone}
              />
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded border border-command-line bg-black/25 p-3 text-sm text-slate-400">
              Best campaign by acceptance rate:{" "}
              <span className="font-semibold text-slate-100">
                {snapshot.bestCampaignByAcceptanceRate}
              </span>
            </div>
            <div className="rounded border border-command-line bg-black/25 p-3 text-sm text-slate-400">
              Most penalty protocol events:{" "}
              <span className="font-semibold text-slate-100">
                {snapshot.campaignWithMostPenalties}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Campaigns By Type
          </h3>
          <div className="mt-4 grid gap-3">
            {snapshot.campaignsByType.map((item) => (
              <MetricBar
                key={item.label}
                label={`${item.label} (${item.value})`}
                value={
                  snapshot.totalCampaigns === 0
                    ? 0
                    : Math.round((item.value / snapshot.totalCampaigns) * 100)
                }
                tone={item.tone}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Campaigns By Risk Level
          </h3>
          <div className="mt-4 grid gap-3">
            {snapshot.campaignsByRiskLevel.map((item) => (
              <MetricBar
                key={item.label}
                label={`${item.label} (${item.value})`}
                value={
                  snapshot.totalCampaigns === 0
                    ? 0
                    : Math.round((item.value / snapshot.totalCampaigns) * 100)
                }
                tone={item.tone}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Campaigns By Doctrine
          </h3>
          <div className="mt-4 grid gap-3">
            {snapshot.campaignsByDoctrine.map((item) => (
              <MetricBar
                key={item.label}
                label={`${item.label} (${item.value})`}
                value={
                  snapshot.totalCampaigns === 0
                    ? 0
                    : Math.round((item.value / snapshot.totalCampaigns) * 100)
                }
                tone={item.tone}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Completion Rate By Type
          </h3>
          <div className="mt-4 grid gap-3">
            {snapshot.completionRateByCampaignType.map((item) => (
              <MetricBar
                key={item.label}
                label={item.label}
                value={item.value}
                tone={item.tone}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Average Score By Type
          </h3>
          <div className="mt-4 grid gap-3">
            {snapshot.averageScoreByCampaignType.map((item) => (
              <MetricBar
                key={item.label}
                label={item.label}
                value={item.value}
                tone={item.tone}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Active Campaigns By Type
          </h3>
          <div className="mt-4 grid gap-3">
            {snapshot.activeCampaignsByType.map((item) => (
              <MetricBar
                key={item.label}
                label={`${item.label} (${item.value})`}
                value={
                  snapshot.activeCampaigns === 0
                    ? 0
                    : Math.round((item.value / snapshot.activeCampaigns) * 100)
                }
                tone={item.tone}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Failed Campaigns By Type
          </h3>
          <div className="mt-4 grid gap-3">
            {snapshot.failedCampaignsByType.map((item) => (
              <MetricBar
                key={item.label}
                label={`${item.label} (${item.value})`}
                value={
                  snapshot.failedCampaigns === 0
                    ? 0
                    : Math.round((item.value / snapshot.failedCampaigns) * 100)
                }
                tone={item.tone}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Campaign Preset Signals
          </h3>
          <div className="mt-4 grid gap-3">
            <div className="rounded border border-command-line bg-black/25 p-3 text-sm text-slate-400">
              Best performing preset:{" "}
              <span className="font-semibold text-slate-100">
                {snapshot.bestPerformingCampaignPreset}
              </span>
            </div>
            <div className="rounded border border-command-line bg-black/25 p-3 text-sm text-slate-400">
              Riskiest preset by penalty/quarantine load:{" "}
              <span className="font-semibold text-slate-100">
                {snapshot.riskiestCampaignPreset}
              </span>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
