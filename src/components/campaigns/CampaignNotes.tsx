import type { Campaign } from "../../types";

interface CampaignNotesProps {
  campaign: Campaign;
  isReadOnly: boolean;
  onChange: (notes: string) => void;
}

export function CampaignNotes({
  campaign,
  isReadOnly,
  onChange,
}: CampaignNotesProps) {
  return (
    <section className="rounded border border-command-line bg-black/20 p-3">
      <h3 className="text-sm font-semibold uppercase text-slate-100">Notes</h3>
      <textarea
        value={campaign.notes}
        disabled={isReadOnly}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 min-h-36 w-full resize-y rounded border border-command-line bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-600 focus:border-command-cyan focus:shadow-neon-blue disabled:opacity-60"
        placeholder="Local campaign planning notes"
      />
    </section>
  );
}
