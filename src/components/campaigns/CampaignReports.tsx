import { useState } from "react";
import {
  downloadTextFile,
  formatCampaignReportText,
  reportToJson,
} from "../../lib/campaigns";
import type { Campaign, CampaignReport } from "../../types";

interface CampaignReportsProps {
  campaign: Campaign;
  canGenerate: boolean;
  onGenerateReport: () => void;
}

const formatDate = (iso: string) => new Date(iso).toLocaleString();

export function CampaignReports({
  campaign,
  canGenerate,
  onGenerateReport,
}: CampaignReportsProps) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    campaign.reports[0]?.id ?? null,
  );
  const selectedReport =
    campaign.reports.find((report) => report.id === selectedReportId) ??
    campaign.reports[0] ??
    null;

  const copyReport = async (report: CampaignReport) => {
    await navigator.clipboard?.writeText(formatCampaignReportText(report, campaign));
  };

  const exportText = (report: CampaignReport) => {
    downloadTextFile(
      `${campaign.name.replace(/\s+/g, "-").toLowerCase()}-${report.id}.txt`,
      formatCampaignReportText(report, campaign),
      "text/plain",
    );
  };

  const exportJson = (report: CampaignReport) => {
    downloadTextFile(
      `${campaign.name.replace(/\s+/g, "-").toLowerCase()}-${report.id}.json`,
      reportToJson(report),
      "application/json",
    );
  };

  return (
    <section className="rounded border border-command-line bg-black/20 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase text-slate-100">
            Reports
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Saved local campaign summaries and exportable snapshots.
          </p>
        </div>
        <button
          type="button"
          disabled={!canGenerate}
          onClick={onGenerateReport}
          className="rounded border border-command-violet/40 bg-command-violet/10 px-3 py-2 text-sm font-semibold text-command-violet transition duration-200 hover:border-command-violet hover:bg-command-violet/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Generate Report
        </button>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[18rem_1fr]">
        <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 terminal-scroll">
          {campaign.reports.length === 0 ? (
            <div className="rounded border border-command-line bg-black/25 p-3 text-sm text-slate-400">
              No reports generated yet.
            </div>
          ) : (
            campaign.reports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedReportId(report.id)}
                className={`rounded border p-3 text-left transition duration-200 ${
                  selectedReport?.id === report.id
                    ? "border-command-violet bg-command-violet/10"
                    : "border-command-line bg-black/25 hover:border-command-violet/50"
                }`}
              >
                <div className="text-sm font-semibold text-slate-100">
                  {report.title}
                </div>
                <div className="mt-1 font-mono text-xs text-slate-500">
                  {formatDate(report.generatedAt)}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="rounded border border-command-line bg-command-panel/60 p-3">
          {selectedReport ? (
            <>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">
                    {selectedReport.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">
                    {selectedReport.summary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyReport(selectedReport)}
                    className="rounded border border-command-line bg-black/20 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition duration-200 hover:border-command-cyan/50 hover:text-command-cyan"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => exportText(selectedReport)}
                    className="rounded border border-command-line bg-black/20 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition duration-200 hover:border-command-cyan/50 hover:text-command-cyan"
                  >
                    Export TXT
                  </button>
                  <button
                    type="button"
                    onClick={() => exportJson(selectedReport)}
                    className="rounded border border-command-line bg-black/20 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition duration-200 hover:border-command-cyan/50 hover:text-command-cyan"
                  >
                    Export JSON
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 font-mono text-xs text-slate-400 sm:grid-cols-2 xl:grid-cols-4">
                <span>TASKS: {selectedReport.tasksCreated}</span>
                <span>ACCEPTED: {selectedReport.tasksAccepted}</span>
                <span>RETRY: {selectedReport.tasksRetried}</span>
                <span>PENALTY: {selectedReport.penaltiesApplied}</span>
                <span>QUARANTINE: {selectedReport.quarantinesTriggered}</span>
                <span>FAILURES: {selectedReport.failures}</span>
                <span>SCORE: {selectedReport.averageScore.toFixed(2)}</span>
                <span>ACCEPT: {selectedReport.acceptanceRate}%</span>
              </div>

              <pre className="mt-4 max-h-80 overflow-y-auto whitespace-pre-wrap rounded border border-command-line bg-black/40 p-3 font-mono text-xs leading-relaxed text-slate-300 terminal-scroll">
                {formatCampaignReportText(selectedReport, campaign)}
              </pre>
            </>
          ) : (
            <div className="text-sm text-slate-400">
              Generate or select a report to view details.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
