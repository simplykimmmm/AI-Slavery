import { useState, type FormEvent } from "react";
import {
  campaignDoctrines,
  campaignLengths,
  campaignObjectivePresets,
  campaignPresets,
  campaignRiskLevels,
  campaignTypes,
} from "../../data/campaignPresets";
import type {
  CampaignCreateInput,
  CampaignDoctrine,
  CampaignLength,
  CampaignObjectivePreset,
  CampaignPreset,
  CampaignRiskLevel,
  CampaignType,
} from "../../types";

interface CampaignCreatorProps {
  onCreate: (input: CampaignCreateInput) => void;
  onCreateFromPreset: (preset: CampaignPreset) => void;
}

const inputClassName =
  "w-full rounded border border-command-line bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-600 focus:border-command-cyan focus:shadow-neon-blue";

const labelClassName = "text-xs font-semibold uppercase text-slate-500";

const modeButtonClassName =
  "rounded border px-3 py-2 text-sm font-semibold transition duration-200";

const badgeClassName =
  "rounded border border-command-line bg-black/30 px-2 py-1 font-mono text-[0.65rem] text-slate-300";

export function CampaignCreator({
  onCreate,
  onCreateFromPreset,
}: CampaignCreatorProps) {
  const [mode, setMode] = useState<"PRESET" | "CUSTOM">("PRESET");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CampaignType>("CUSTOM");
  const [doctrine, setDoctrine] = useState<CampaignDoctrine>("BALANCED");
  const [riskLevel, setRiskLevel] = useState<CampaignRiskLevel>("STANDARD");
  const [length, setLength] = useState<CampaignLength>("MEDIUM");
  const [objectivePreset, setObjectivePreset] =
    useState<CampaignObjectivePreset>("STABILITY_TEST");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    onCreate({
      name: name.trim(),
      description: description.trim(),
      type,
      doctrine,
      riskLevel,
      difficultyProfile: riskLevel,
      length,
      objectivePreset,
    });
    setName("");
    setDescription("");
    setType("CUSTOM");
    setDoctrine("BALANCED");
    setRiskLevel("STANDARD");
  };

  return (
    <section className="rounded-lg border border-command-line bg-command-panel/80 p-4 shadow-panel backdrop-blur">
      <div className="mb-4">
        <div className="text-xs font-semibold uppercase text-command-violet">
          Campaigns // Operation Plans
        </div>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Create Campaign
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Initialize a typed campaign preset or configure a custom operation plan.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode("PRESET")}
          className={`${modeButtonClassName} ${
            mode === "PRESET"
              ? "border-command-cyan bg-command-cyan/10 text-command-cyan"
              : "border-command-line bg-black/25 text-slate-400 hover:border-command-cyan/40"
          }`}
        >
          Create from preset
        </button>
        <button
          type="button"
          onClick={() => setMode("CUSTOM")}
          className={`${modeButtonClassName} ${
            mode === "CUSTOM"
              ? "border-command-cyan bg-command-cyan/10 text-command-cyan"
              : "border-command-line bg-black/25 text-slate-400 hover:border-command-cyan/40"
          }`}
        >
          Create custom campaign
        </button>
      </div>

      {mode === "PRESET" ? (
        <div className="grid max-h-[720px] gap-3 overflow-y-auto pr-1 terminal-scroll">
          {campaignPresets.map((preset) => (
            <article
              key={preset.id}
              className="rounded border border-command-line bg-black/25 p-3 transition duration-200 hover:border-command-cyan/40"
            >
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={badgeClassName}>{preset.type}</span>
                    <span className={badgeClassName}>{preset.riskLevel}</span>
                    <span className={badgeClassName}>{preset.doctrine}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-100">
                    {preset.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {preset.briefingText}
                  </p>
                </div>

                <div className="grid gap-2 font-mono text-xs text-slate-500 sm:grid-cols-2">
                  <span>{preset.defaultObjectives.length} OBJECTIVES</span>
                  <span>{preset.suggestedMissions.length} PLANNED MISSIONS</span>
                  <span>FOCUS: {preset.recommendedAgentFocus}</span>
                  <span>CYCLES: {preset.estimatedDurationCycles}</span>
                </div>

                <button
                  type="button"
                  onClick={() => onCreateFromPreset(preset)}
                  className="rounded border border-command-cyan/40 bg-command-cyan/10 px-3 py-2 text-sm font-semibold text-command-cyan transition duration-200 hover:border-command-cyan hover:bg-command-cyan/20"
                >
                  Initialize Campaign
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div>
            <label className={labelClassName} htmlFor="campaign-name">
              Campaign name
            </label>
            <input
              id="campaign-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={`mt-1 ${inputClassName}`}
              placeholder="Custom Recovery Trial Alpha"
            />
          </div>

          <div>
            <label className={labelClassName} htmlFor="campaign-description">
              Description
            </label>
            <textarea
              id="campaign-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={`mt-1 min-h-24 resize-y ${inputClassName}`}
              placeholder="Local campaign notes and operational intent"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className={labelClassName} htmlFor="campaign-type">
                Campaign type
              </label>
              <select
                id="campaign-type"
                value={type}
                onChange={(event) => setType(event.target.value as CampaignType)}
                className={`mt-1 ${inputClassName}`}
              >
                {campaignTypes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClassName} htmlFor="campaign-doctrine">
                Doctrine
              </label>
              <select
                id="campaign-doctrine"
                value={doctrine}
                onChange={(event) =>
                  setDoctrine(event.target.value as CampaignDoctrine)
                }
                className={`mt-1 ${inputClassName}`}
              >
                {campaignDoctrines.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClassName} htmlFor="campaign-risk">
                Risk level
              </label>
              <select
                id="campaign-risk"
                value={riskLevel}
                onChange={(event) =>
                  setRiskLevel(event.target.value as CampaignRiskLevel)
                }
                className={`mt-1 ${inputClassName}`}
              >
                {campaignRiskLevels.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelClassName} htmlFor="campaign-length">
                Campaign length
              </label>
              <select
                id="campaign-length"
                value={length}
                onChange={(event) => setLength(event.target.value as CampaignLength)}
                className={`mt-1 ${inputClassName}`}
              >
                {campaignLengths.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClassName} htmlFor="objective-preset">
                Objective preset
              </label>
              <select
                id="objective-preset"
                value={objectivePreset}
                onChange={(event) =>
                  setObjectivePreset(event.target.value as CampaignObjectivePreset)
                }
                className={`mt-1 ${inputClassName}`}
              >
                {campaignObjectivePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded border border-command-line bg-black/25 p-3 text-sm text-slate-400">
            {
              campaignObjectivePresets.find(
                (preset) => preset.id === objectivePreset,
              )?.description
            }
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!name.trim()}
              className="rounded border border-command-cyan/40 bg-command-cyan/10 px-4 py-2 text-sm font-semibold text-command-cyan transition duration-200 hover:border-command-cyan hover:bg-command-cyan/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create Custom Campaign
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
